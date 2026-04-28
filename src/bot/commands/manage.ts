import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { isGuildAdmin } from "./isGuildAdmin";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { TeamPermissionLevel } from "../../database/defs/team_assoc";
import { createNewLogger } from "../../tools/log";
import { requireRegistered } from "./requireRegistered";

const logger = createNewLogger("cmd:manage");

export const manageCommand = {
  name: "manage",
  description: "Manage your team",
  options: [
    {
      type: 1, // Subcommand
      name: "description",
      description: "Change the description of your project",
      options: [
        {
          type: 3,
          name: "project",
          description: "Name of project",
          required: true
        },
        {
          type: 3,
          name: "description",
          description: "New description",
          required: true
        }
      ]
    },
    {
      type: 1, // Subcommand
      name: "rename",
      description: "Rename your project's display name",
      options: [
        {
          type: 3,
          name: "group",
          description: "Name of the group",
          required: true
        },
        {
          type: 3,
          name: "name",
          description: "New project display name",
          required: true
        }
      ]
    },
    {
      type: 1, // Subcommand
      name: "transfer",
      description: "Transfer team leadership to another member",
      options: [
        {
          type: 3,
          name: "group",
          description: "Name of the group",
          required: true
        },
        {
          type: 6, // User
          name: "person",
          description: "Member to transfer leadership to",
          required: true
        }
      ]
    }
  ]
};

export async function handleManage(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "description") {
    await handleDescription(interaction);
  } else if (sub === "rename") {
    await handleRename(interaction);
  } else if (sub === "transfer") {
    await handleTransfer(interaction);
  }
}

async function handleDescription(interaction: ChatInputCommandInteraction) {
  const project = interaction.options.getString("project", true);
  const description = interaction.options.getString("description", true);
  const formattedProject = project.toLowerCase().replace(/\s+/g, "-");
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "This command can only be used in a server!"
    });
    return;
  }

  if (!(await requireRegistered(interaction))) return;

  const teamSlug = await resolveTeamSlug(guild, formattedProject);
  if (!teamSlug) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `No group found named **${project}**.`
    });
    return;
  }

  if (
    !isGuildAdmin(interaction) &&
    !(await db.isTeamLeader(teamSlug, interaction.user.id))
  ) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Only the team leader can modify this project."
    });
    return;
  }

  await interaction.deferReply();

  try {
    const existing =
      (await db.getProjectByName(project.trim())) ??
      (await db.getProjectByName(formattedProject)) ??
      (await db.getPrimaryActiveProjectForTeam(teamSlug));

    if (!existing) {
      await interaction.editReply(
        `No project row found for team **${teamSlug}**. Create one with /create first.`
      );
      return;
    }

    await db.changeProjectDisplayName(existing.slug, description);

    const targetCompact = formattedProject.replace(/\s+/g, "").toLowerCase();
    const channel = guild.channels.cache.find(
      (c) =>
        c.isTextBased() &&
        c.name.replace(/\s+/g, "").toLowerCase() === targetCompact
    );
    if (channel && channel.isTextBased() && "setTopic" in channel) {
      await channel.setTopic(description);
    }

    logger.info(
      `Project "${project}" description updated by ${interaction.user.tag}`
    );
    await interaction.editReply(`✅ **${project}** updated!`);
  } catch (err) {
    logger.error(
      `Failed to update project "${project}" for ${interaction.user.tag}: ${err instanceof Error ? err.message : String(err)}`
    );
    await interaction.editReply("Failed to update project.");
  }
}

async function handleRename(interaction: ChatInputCommandInteraction) {
  const group = interaction.options.getString("group", true);
  const name = interaction.options.getString("name", true);
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "This command can only be used in a server!"
    });
    return;
  }

  if (!(await requireRegistered(interaction))) return;

  const formattedGroup = group.toLowerCase().replace(/\s+/g, "-");
  const teamSlug = await resolveTeamSlug(guild, formattedGroup);
  if (!teamSlug) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `No group called **${group}** found.`
    });
    return;
  }

  if (
    !isGuildAdmin(interaction) &&
    !(await db.isTeamLeader(teamSlug, interaction.user.id))
  ) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Only the team leader can rename the project."
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const project = await db.getPrimaryActiveProjectForTeam(teamSlug);
    if (!project) {
      await interaction.editReply("No active project found for your team.");
      return;
    }

    const oldName = project.name;
    await db.changeProjectDisplayName(project.slug, name);

    logger.info(
      `Project "${oldName}" (team: ${teamSlug}) renamed to "${name}" by ${interaction.user.tag}`
    );
    await interaction.editReply(
      `✅ Project renamed from **${oldName}** to **${name}**.`
    );
  } catch (err) {
    logger.error(
      `Failed to rename project for ${interaction.user.tag}: ${err instanceof Error ? err.message : String(err)}`
    );
    await interaction.editReply("Failed to rename project.");
  }
}

async function handleTransfer(interaction: ChatInputCommandInteraction) {
  const group = interaction.options.getString("group", true);
  const target = interaction.options.getUser("person", true);
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "This command can only be used in a server!"
    });
    return;
  }

  if (!(await requireRegistered(interaction))) return;

  if (target.id === interaction.user.id) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "You are already the leader."
    });
    return;
  }

  const formattedGroup = group.toLowerCase().replace(/\s+/g, "-");

  const teamSlug = await resolveTeamSlug(guild, formattedGroup);
  if (!teamSlug) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `No group called **${group}** found.`
    });
    return;
  }

  if (
    !isGuildAdmin(interaction) &&
    !(await db.isTeamLeader(teamSlug, interaction.user.id))
  ) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Only the team leader can transfer leadership."
    });
    return;
  }

  const targetPerm = await db.getMemberTeamPermission(teamSlug, target.id);
  if (targetPerm === null) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `**${target.username}** is not a member of **${group}**.`
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await db.updateTeamMember(teamSlug, target.id, TeamPermissionLevel.LEADER);
    // Only step down if the caller was actually the leader
    const callerPerm = await db.getMemberTeamPermission(
      teamSlug,
      interaction.user.id
    );
    if (callerPerm === TeamPermissionLevel.LEADER) {
      await db.updateTeamMember(
        teamSlug,
        interaction.user.id,
        TeamPermissionLevel.MEMBER
      );
    }

    logger.info(
      `Leadership of "${group}" (team: ${teamSlug}) transferred from ${interaction.user.tag} to ${target.tag}`
    );
    await interaction.editReply(
      `✅ Leadership of **${group}** transferred to **${target.username}**.`
    );
  } catch (err) {
    logger.error(
      `Failed to transfer leadership of "${group}" from ${interaction.user.tag} to ${target.tag}: ${err instanceof Error ? err.message : String(err)}`
    );
    await interaction.editReply(
      "Failed to transfer leadership. Please try again or contact a server admin."
    );
  }
}
