import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    MessageFlags,
} from "discord.js";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { isGuildAdmin } from "./isGuildAdmin";
import { deleteTeamRepo } from "../../integrations/githubApp";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:purge");

export const purgeCommand = {
    name: "purge",
    description: "Permanently delete a team: channel, role, and GitHub repo (admin only)",
    options: [
        {
            type: 3,
            name: "group",
            description: "Name of the group to purge",
            required: true
        }
    ]
};

export async function handlePurge(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getString("group", true);
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "This command can only be used in a server!" });
        return;
    }

    if (!isGuildAdmin(interaction)) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Only server administrators can purge teams." });
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

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("purge_confirm")
            .setLabel("Yes, delete everything")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("purge_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `⚠️ **Are you sure?**\nThis will permanently delete the channel, role, and GitHub repo for **${group}** (\`${teamSlug}\`). This cannot be undone.`,
        components: [confirmRow],
    });

    let confirmed: boolean;
    try {
        const button = await interaction.fetchReply().then((msg) =>
            msg.awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: (i) => i.user.id === interaction.user.id,
                time: 30_000,
            })
        );
        confirmed = button.customId === "purge_confirm";
        await button.deferUpdate();
    } catch {
        // Timed out — no button pressed
        await interaction.editReply({ content: "Purge cancelled (timed out).", components: [] });
        return;
    }

    if (!confirmed) {
        await interaction.editReply({ content: "Purge cancelled.", components: [] });
        return;
    }

    await interaction.editReply({ content: `Purging **${group}**...`, components: [] });

    const notes: string[] = [];

    // Delete the Discord channel
    const channel = await guild.channels.fetch(team.channel_id).catch(() => null);
    if (channel) {
        await channel.delete(`Purged by ${interaction.user.tag}`).catch((e) => {
            logger.error(`Failed to delete channel for "${teamSlug}": ${e instanceof Error ? e.message : String(e)}`);
            notes.push("⚠️ Channel deletion failed — check bot permissions.");
        });
    }

    // Delete the Discord role
    if (team.role_id) {
        const role = await guild.roles.fetch(team.role_id).catch(() => null);
        if (role) {
            await role.delete(`Purged by ${interaction.user.tag}`).catch((e) => {
                logger.error(`Failed to delete role for "${teamSlug}": ${e instanceof Error ? e.message : String(e)}`);
                notes.push("⚠️ Role deletion failed — check bot permissions.");
            });
        }
    }

    // Delete GitHub repo — best-effort
    if (team.github_repo) {
        await deleteTeamRepo(team.github_repo).catch((e) => {
            logger.error(`Failed to delete repo for "${teamSlug}": ${e instanceof Error ? e.message : String(e)}`);
            notes.push("⚠️ GitHub repo deletion failed — check bot permissions.");
        });
    }

    // Remove from database
    await db.deleteTeam(teamSlug).catch((e) => {
        logger.error(`Failed to delete team record for "${teamSlug}": ${e instanceof Error ? e.message : String(e)}`);
        notes.push("⚠️ Database record deletion failed.");
    });

    logger.info(`Team "${teamSlug}" purged by ${interaction.user.tag}`);
    const suffix = notes.length ? `\n${notes.join("\n")}` : "";
    await interaction.editReply({ content: `✅ **${group}** (${teamSlug}) has been permanently deleted.${suffix}` });
}
