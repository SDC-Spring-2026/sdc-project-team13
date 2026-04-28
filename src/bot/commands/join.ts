import { ChatInputCommandInteraction,
             ActionRowBuilder,
             ButtonBuilder,
             ButtonStyle,
             ComponentType,
             Message,
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

    const leaderIds = await db.getTeamLeaders(teamSlug);
    if (leaderIds.length === 0) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Could not find any leaders for **${name}**!` });
        return;
    }

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

    // DM each leader — only they can see and act on the request
    const sentDMs: { message: Message }[] = [];

    for (const leaderId of leaderIds) {
        try {
            const leaderMember = await guild.members.fetch(leaderId);
            const dm = await leaderMember.send({
                content: `📬 **${interaction.user}** wants to join **${name}**!`,
                components: [row]
            });
            sentDMs.push({ message: dm });
        } catch (e) {
            logger.warn(`Failed to DM leader ${leaderId} for join request to "${name}": ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    if (sentDMs.length === 0) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Could not reach any leaders for **${name}**. Try contacting them directly.` });
        return;
    }

    logger.info(`${interaction.user.tag} (${interaction.user.id}) sent join request to "${name}" (team: ${teamSlug}), DMed ${sentDMs.length} leader(s)`);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `✅ Join request sent to **${name}**!` });

    let handled = false;

    const updateAllDMs = async (content: string, exclude?: string) => {
        await Promise.all(
            sentDMs
                .filter(({ message }) => message.id !== exclude)
                .map(({ message }) => message.edit({ content, components: [] }).catch(() => {}))
        );
    };

    for (const { message } of sentDMs) {
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 259200000
        });

        collector.on('collect', async (buttonInteraction) => {
            if (handled) {
                await buttonInteraction.reply({ flags: MessageFlags.Ephemeral, content: "This request has already been handled." });
                return;
            }
            handled = true;

            if (buttonInteraction.customId === 'join_accept') {
                try {
                    await db.addMemberToTeam(teamSlug, interaction.user.id, TeamPermissionLevel.MEMBER);

                    const role = guild.roles.cache.find(r => r.name === teamSlug);
                    if (role) {
                        const member = await guild.members.fetch(interaction.user.id);
                        await member.roles.add(role);
                    }

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
                    const resultContent = `✅ **${interaction.user.username}** has been accepted into **${name}**!`;
                    await buttonInteraction.update({ content: resultContent, components: [] });
                    await updateAllDMs(resultContent, buttonInteraction.message.id);
                } catch (err) {
                    logger.error(`Failed to add ${interaction.user.tag} to "${name}": ${err instanceof Error ? err.message : String(err)}`);
                    await buttonInteraction.update({
                        content: `❌ Failed to add **${interaction.user.username}** to **${name}**.`,
                        components: []
                    });
                }
            } else {
                logger.info(`${interaction.user.tag}'s request to join "${name}" declined by ${buttonInteraction.user.tag}`);
                const resultContent = `❌ **${interaction.user.username}**'s request to join **${name}** was declined.`;
                await buttonInteraction.update({ content: resultContent, components: [] });
                await updateAllDMs(resultContent, buttonInteraction.message.id);
            }
        });

        collector.on('end', async (collected) => {
            if (!handled && collected.size === 0) {
                logger.warn(`Join request from ${interaction.user.tag} to "${name}" expired with no response`);
                await message.edit({
                    content: `⏰ Join request from **${interaction.user.username}** expired.`,
                    components: []
                }).catch(() => {});
            }
        });
    }
}
