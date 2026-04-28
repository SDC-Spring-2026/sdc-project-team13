import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { isGuildAdmin } from "./isGuildAdmin";
import { setTeamRepoArchived } from "../../integrations/githubApp";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:disable");

export const disableCommand = {
    name: "disable",
    description: "Hide a team channel and archive its GitHub repo (admin only)",
    options: [
        {
            type: 3,
            name: "group",
            description: "Name of the group to disable",
            required: true
        }
    ]
};

export async function handleDisable(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getString("group", true);
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "This command can only be used in a server!" });
        return;
    }

    if (!isGuildAdmin(interaction)) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Only server administrators can disable teams." });
        return;
    }

    const teamSlug = await resolveTeamSlug(guild, group.toLowerCase().replace(/\s+/g, "-"));
    if (!teamSlug) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `No group called **${group}** found.` });
        return;
    }

    const team = await db.getTeam(teamSlug);
    if (!team) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Could not find team record for **${group}**.` });
        return;
    }

    if (!team.is_active) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `**${group}** is already disabled.` });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Hide the channel from everyone except server admins (who bypass overwrites)
    const channel = await guild.channels.fetch(team.channel_id).catch(() => null);
    if (channel && channel.isTextBased() && "permissionOverwrites" in channel) {
        await channel.permissionOverwrites.set([
            {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            ...(team.role_id ? [{
                id: team.role_id,
                deny: [PermissionFlagsBits.ViewChannel]
            }] : [])
        ]);
    }

    // Mark inactive in DB
    await db.updateTeamActive(teamSlug, false);

    // Archive GitHub repo — best-effort
    let githubNote = "";
    if (team.github_repo) {
        await setTeamRepoArchived(team.github_repo, true).catch((e) => {
            logger.error(`Failed to archive repo for "${teamSlug}": ${e instanceof Error ? e.message : String(e)}`);
            githubNote = "\n⚠️ GitHub repo archival failed — check bot permissions.";
        });
    }

    logger.info(`Team "${teamSlug}" disabled by ${interaction.user.tag}`);
    await interaction.editReply(`✅ **${group}** has been disabled. The channel is now hidden and the repo archived.${githubNote}`);
}
