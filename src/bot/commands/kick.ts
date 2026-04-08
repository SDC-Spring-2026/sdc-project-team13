import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { db } from "../../database";
import { driver } from "../../database/driver";
import { TeamPermissionLevel } from "../../database/defs/team_assoc";
import { resolveTeamSlug } from "./resolveTeam";

/**
 * /kick — kicks a specified member a group, if permissions group leader.
 */
export const kickCommand = {
  name: "kick",
  description: "Kicks a specified member",
  options: [
    {
      type: 3, // STRING TYPE
      name: "group",
      description: "Name of group",
      required: true
    },
    {
      type: 3, // STRING TYPE
      name: "person",
      description: "Name of person",
      required: true
    }
  ]
};

/** Handles /kick interactions. */
export async function handleKick(interaction: ChatInputCommandInteraction) {
  const group = interaction.options.getString("group", true);
  const personUser = interaction.options.getUser("person", true);
  const personId = personUser.id;

  const formattedGroup = group.toLowerCase().replace(/\s+/g, "-");
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "This command can only be used in a server!"
    });
    return;
  }

  await interaction.deferReply();

  try {
    const teamSlug = await resolveTeamSlug(guild, formattedGroup);
    if (!teamSlug) {
      await interaction.editReply(`No group found named **${group}**.`);
      return;
    }

    const callerRows = await driver().query<{ perm_level: number }>(
      "SELECT perm_level FROM TeamAssociations WHERE team_slug = ? AND user_id = ?",
      [teamSlug, interaction.user.id]
    );
    const callerAssoc = callerRows[0];

    if (!callerAssoc) {
      await interaction.editReply("You are not a member of this group!");
      return;
    }

    if (callerAssoc.perm_level !== TeamPermissionLevel.LEADER) {
      await interaction.editReply("Only group leaders can kick members!");
      return;
    }

    const targetRows = await driver().query<{ perm_level: number }>(
      "SELECT perm_level FROM TeamAssociations WHERE team_slug = ? AND user_id = ?",
      [teamSlug, personId]
    );
    const targetAssoc = targetRows[0];

    if (!targetAssoc) {
      await interaction.editReply("That person is not in this group!");
      return;
    }

    await db.removeMemberFromTeam(teamSlug, personId);

    const role = guild.roles.cache.find((r) => r.name === formattedGroup);
    if (role) {
      try {
        const member = await guild.members.fetch(personId);
        await member.roles.remove(role);
      } catch (err) {
        console.warn("Could not remove role from user:", err);
      }
    }

    await interaction.editReply(
      `✅ Successfully kicked <@${personId}> from **${group}**.`
    );
  } catch (err) {
    console.error(err);
    await interaction.editReply("Failed to kick member.");
  }
}
