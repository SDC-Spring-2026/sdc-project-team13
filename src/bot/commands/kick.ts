import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { createNewLogger } from "../../tools/log";
import { requireRegistered } from "./requireRegistered";

const logger = createNewLogger("cmd:kick");

/**
 * /kick — removes a member from a group, only if the caller is the leader.
 */
export const kickCommand = {
  name: "kick",
  description: "Removes a member from your team",
  options: [
    {
      type: 3, // STRING
      name: "group",
      description: "Name of group",
      required: true
    },
    {
      type: 6, // USER
      name: "person",
      description: "Member to remove",
      required: true
    }
  ]
};

/** Handles /kick interactions. */
export async function handleKick(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getString("group", true);
    const target = interaction.options.getUser("person", true);
    const formattedGroup = group.toLowerCase().replace(/\s+/g, '-');
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "This command can only be used in a server!" });
        return;
    }

    if (!await requireRegistered(interaction)) return;

    const teamSlug = await resolveTeamSlug(guild, formattedGroup);
    if (!teamSlug) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `No group called **${group}** found!` });
        return;
    }

    if (!await db.isTeamLeader(teamSlug, interaction.user.id)) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Only the team leader can kick members." });
        return;
    }

    if (target.id === interaction.user.id) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "You can't kick yourself." });
        return;
    }

    await interaction.deferReply();

    try {
        await db.removeMemberFromTeam(teamSlug, target.id);

        const role = guild.roles.cache.find(r => r.name === formattedGroup);
        if (role) {
            const member = await guild.members.fetch(target.id);
            await member.roles.remove(role);
        }

        logger.info(`${target.tag} kicked from "${group}" (team: ${teamSlug}) by ${interaction.user.tag}`);
        await interaction.editReply(`✅ **${target.username}** has been removed from **${group}**.`);
    } catch (err) {
        logger.error(`Failed to kick ${target.tag} from "${group}": ${err instanceof Error ? err.message : String(err)}`);
        await interaction.editReply(`Failed to remove **${target.username}** from **${group}**.`);
    }
}
