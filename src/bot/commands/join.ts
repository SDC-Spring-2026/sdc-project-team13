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
          },
          {
              type: 3, // STRING TYPE
              name: "github",
              description: "your GitHub username (only needed the first time)",
              required: false
          }
      ]
};

/** Handles /join interactions. */
export async function handleJoin(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("name", true);
    const github = interaction.options.getString("github") ?? undefined;
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "This command can only be used in a server!" });
        return;
    }

    const formattedName = name.toLowerCase().replace(/\s+/g, '-');

    // Resolve the team slug from the channel name
    const teamSlug = await resolveTeamSlug(guild, formattedName);
    if (!teamSlug) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `No group called **${name}** found!` });
        return;
    }

    const channel = guild.channels.cache.find(c => c.name === formattedName);
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
        if (buttonInteraction.customId === 'join_accept') {
            try {
                // Add to database
                await db.addMemberToTeam(teamSlug, interaction.user.id, TeamPermissionLevel.MEMBER);

                const existingMember = await db.getMember(interaction.user.id);
                if (!existingMember) {
                    await db.registerMember(interaction.user.id, github);
                    logger.info(`Registered new member ${interaction.user.tag} (github: ${github ?? "none"})`);
                }

                // Assign Discord role
                const role = guild.roles.cache.find(r => r.name === formattedName);
                if (role) {
                    const member = await guild.members.fetch(interaction.user.id);
                    await member.roles.add(role);
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
