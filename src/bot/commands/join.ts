import { ChatInputCommandInteraction,
             ActionRowBuilder,
             ButtonBuilder,
             ButtonStyle,
             ComponentType,
             MessageFlags } from "discord.js";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { TeamPermissionLevel } from "../../database/defs/team_assoc";
import { createNewLogger } from "../../tools/log";
import { requireRegistered } from "./requireRegistered";
import { addRepoCollaborator } from "../../integrations/githubApp";

const logger = createNewLogger("cmd:join");

/**
 * /join — joins a specified group.
 */
export const joinCommand = {
  name: "join",
  description: "Joins a specified group",
  options: [
          {
              type: 3, // STRING TYPE
              name: "name",
              description: "Name of group",
              required: true
          }
      ]
};

/** Handles /join interactions. */
export async function handleJoin(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("name", true);
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "This command can only be used in a server!" });
        return;
    }

    if (!await requireRegistered(interaction)) return;

    const formattedName = name.toLowerCase().replace(/\s+/g, '-');

    // Resolve the team slug from the channel name
    const teamSlug = await resolveTeamSlug(guild, formattedName);
    if (!teamSlug) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `No group called **${name}** found!` });
        return;
    }

    const existingPerm = await db.getMemberTeamPermission(teamSlug, interaction.user.id);
    if (existingPerm !== null) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `You are already a member of **${name}**!` });
        return;
    }

    const teamRecord = await db.getTeam(teamSlug);
    const channel = teamRecord ? guild.channels.cache.get(teamRecord.channel_id) : undefined;
    if (!channel || !channel.isTextBased()) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `No group called **${name}** found!` });
        return;
    }

    // Build accept/decline buttons
    const accept = new ButtonBuilder()
        .setCustomId('join_accept')
        .setLabel('✅ Accept')
        .setStyle(ButtonStyle.Success);

    const decline = new ButtonBuilder()
        .setCustomId('join_decline')
        .setLabel('❌ Decline')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(accept, decline);

    // Send the join request to the group channel
    const requestMsg = await channel.send({
        content: `📬 **${interaction.user}** wants to join **${name}**!`,
        components: [row]
    });

    logger.info(`${interaction.user.tag} (${interaction.user.id}) sent join request to "${name}" (team: ${teamSlug})`);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `✅ Join request sent to **${name}**!` });

    // Wait for a button click — 3 day window
    const collector = requestMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 259200000
    });

    collector.on('collect', async (buttonInteraction) => {
        const isLeader = await db.isTeamLeader(teamSlug, buttonInteraction.user.id);
        if (!isLeader) {
            await buttonInteraction.reply({
                flags: MessageFlags.Ephemeral,
                content: "Only the team leader can accept or decline join requests."
            });
            return;
        }

        if (buttonInteraction.customId === 'join_accept') {
            try {
                await db.addMemberToTeam(teamSlug, interaction.user.id, TeamPermissionLevel.MEMBER);

                // Channel and role are named after the team slug
                const role = guild.roles.cache.find(r => r.name === teamSlug);
                if (role) {
                    const member = await guild.members.fetch(interaction.user.id);
                    await member.roles.add(role);
                }

                // Grant GitHub repo access — best-effort
                const [joiningMember, team] = await Promise.all([
                    db.getMember(interaction.user.id),
                    db.getTeam(teamSlug)
                ]);
                if (joiningMember?.github && team?.github_repo) {
                    await addRepoCollaborator(team.github_repo, joiningMember.github).catch((e) =>
                        logger.error(`Failed to add GitHub collaborator for ${interaction.user.tag}: ${e instanceof Error ? e.message : String(e)}`)
                    );
                }

                logger.info(`${interaction.user.tag} accepted into "${name}" (team: ${teamSlug}) by ${buttonInteraction.user.tag}`);
                await buttonInteraction.update({
                    content: `✅ **${interaction.user.username}** has been accepted into **${name}**!`,
                    components: []
                });
            } catch (err) {
                logger.error(`Failed to add ${interaction.user.tag} to "${name}": ${err instanceof Error ? err.message : String(err)}`);
                await buttonInteraction.update({
                    content: `❌ Failed to add **${interaction.user.username}** to **${name}**.`,
                    components: []
                });
            }
        } else {
            logger.info(`${interaction.user.tag}'s request to join "${name}" declined by ${buttonInteraction.user.tag}`);
            await buttonInteraction.update({
                content: `❌ **${interaction.user.username}**'s request to join **${name}** was declined.`,
                components: []
            });
        }
    });

    // Remove buttons after 3 days if no response
    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            logger.warn(`Join request from ${interaction.user.tag} to "${name}" expired with no response`);
            await requestMsg.edit({
                content: `⏰ Join request from **${interaction.user.username}** expired.`,
                components: []
            });
        }
    });
}
