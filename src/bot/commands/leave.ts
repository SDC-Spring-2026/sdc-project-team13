import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { TeamPermissionLevel } from "../../database/defs/team_assoc";
import { createNewLogger } from "../../tools/log";
import { requireRegistered } from "./requireRegistered";
import { removeRepoCollaborator } from "../../integrations/githubApp";

const logger = createNewLogger("cmd:leave");

/**
 * /leave — leave a project group
 */
export const leaveCommand = {
  name: "leave",
  description: "Leave a group you are currently a member of",
  options: [
    {
      type: 3,
      name: "group",
      description: "Name of the group to leave",
      required: true
    }
  ]
};

/**
 * handler function to leave a group
 */
export async function handleLeave(interaction: ChatInputCommandInteraction) {
  const group = interaction.options.getString("group", true);
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

  const teamSlug = await resolveTeamSlug(guild, formattedGroup); // create slug
  if (!teamSlug) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `No group called **${group}** found.`
    });
    return;
  }

  const callerPerm = await db.getMemberTeamPermission(teamSlug, interaction.user.id); // check permissions
  if (callerPerm === null) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `You are not a member of **${group}**.`
    });
    return;
  }

  if (callerPerm === TeamPermissionLevel.LEADER) { // check if leader
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "You are the leader of this team and cannot leave directly. Transfer leadership first using `/manage transfer`."
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try { // remove person from group in database
    await db.removeMemberFromTeam(teamSlug, interaction.user.id);

    const role = guild.roles.cache.find((r) => r.name === teamSlug);
    if (role) {
      const member = await guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role, `Left team ${group}`);
      }
    }

    // Revoke GitHub repo access — best-effort
    const [leavingMember, team] = await Promise.all([
      db.getMember(interaction.user.id),
      db.getTeam(teamSlug)
    ]);
    if (leavingMember?.github && team?.github_repo) {
      await removeRepoCollaborator(team.github_repo, leavingMember.github).catch((e) =>
        logger.error(
          `Failed to remove GitHub collaborator for ${interaction.user.tag}: ${e instanceof Error ? e.message : String(e)}`
        )
      );
    }

    logger.info(`${interaction.user.tag} (${interaction.user.id}) left "${group}" (team: ${teamSlug})`);
    await interaction.editReply(`You have left **${group}**.`);
  } catch (err) {
    logger.error(
      `Failed to remove ${interaction.user.tag} from "${group}": ${err instanceof Error ? err.message : String(err)}`
    );
    await interaction.editReply(`Failed to leave **${group}**. Please try again or contact an admin.`);
  }
}
