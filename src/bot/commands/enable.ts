import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits
} from "discord.js";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { isGuildAdmin } from "./isGuildAdmin";
import { setTeamRepoArchived } from "../../integrations/githubApp";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:enable");

export const enableCommand = {
  name: "enable",
  description:
    "Restore a disabled team channel and unarchive its GitHub repo (admin only)",
  options: [
    {
      type: 3,
      name: "group",
      description: "Name of the group to enable",
      required: true
    }
  ]
};

export async function handleEnable(interaction: ChatInputCommandInteraction) {
  const group = interaction.options.getString("group", true);
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "This command can only be used in a server!"
    });
    return;
  }

  if (!isGuildAdmin(interaction)) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Only server administrators can enable teams."
    });
    return;
  }

  const teamSlug = await resolveTeamSlug(
    guild,
    group.toLowerCase().replace(/\s+/g, "-")
  );
  if (!teamSlug) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `No group called **${group}** found.`
    });
    return;
  }

  const team = await db.getTeam(teamSlug);
  if (!team) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `Could not find team record for **${group}**.`
    });
    return;
  }

  if (!team.is_disabled) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `**${group}** is already enabled.`
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Restore standard team channel permissions
  const channel = await guild.channels.fetch(team.channel_id).catch(() => null);
  if (channel && channel.isTextBased() && "permissionOverwrites" in channel) {
    await channel.permissionOverwrites.set([
      {
        id: guild.roles.everyone,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads
        ]
      },
      ...(team.role_id
        ? [
            {
              id: team.role_id,
              allow: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.SendMessagesInThreads,
                PermissionFlagsBits.CreatePublicThreads,
                PermissionFlagsBits.CreatePrivateThreads
              ]
            }
          ]
        : [])
    ]);
  }

  await db.setTeamDisabled(teamSlug, false);

  // Unarchive GitHub repo — best-effort
  let githubNote = "";
  if (team.github_repo) {
    await setTeamRepoArchived(team.github_repo, false).catch((e) => {
      logger.error(
        `Failed to unarchive repo for "${teamSlug}": ${e instanceof Error ? e.message : String(e)}`
      );
      githubNote =
        "\n⚠️ GitHub repo unarchival failed — check bot permissions.";
    });
  }

  logger.info(`Team "${teamSlug}" enabled by ${interaction.user.tag}`);
  await interaction.editReply(
    `✅ **${group}** has been re-enabled. The channel is visible and the repo unarchived.${githubNote}`
  );
}
