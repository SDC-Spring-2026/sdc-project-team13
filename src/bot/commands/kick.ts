import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags
} from "discord.js";
import { isGuildAdmin } from "./isGuildAdmin";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { TeamPermissionLevel } from "../../database/defs/team_assoc";
import { createNewLogger } from "../../tools/log";
import { requireRegistered } from "./requireRegistered";
import { removeRepoCollaborator } from "../../integrations/githubApp";

const logger = createNewLogger("cmd:kick");

/**
 * /kick — removes a member from a team in the database and removes their Discord role (leader only).
 */
export const kickCommand = {
  name: "kick",
  description: "Removes a member from your team",
  options: [
    {
      type: 3,
      name: "group",
      description: "Name of group",
      required: true
    },
    {
      type: 3,
      name: "person",
      description:
        "Member to remove (mention, @name, username, or display name)",
      required: true
    }
  ]
};

function parseDiscordUserId(raw: string): string | null {
  const t = raw.trim();
  const mention = t.match(/^<@!?(\d+)>$/);
  if (mention) return mention[1];
  if (/^\d{17,20}$/.test(t)) return t;
  return null;
}

async function findTargetMember(
  guild: NonNullable<ChatInputCommandInteraction["guild"]>,
  person: string
): Promise<GuildMember | null> {
  const id = parseDiscordUserId(person);
  if (id) {
    try {
      return await guild.members.fetch(id);
    } catch {
      return null;
    }
  }

  const q = person.toLowerCase().trim();
  if (!q) return null;

  const members = await guild.members.fetch();
  const list = [...members.values()];

  const exact = list.find(
    (m) =>
      m.user.username.toLowerCase() === q ||
      m.displayName.toLowerCase() === q ||
      m.user.tag.toLowerCase() === q
  );
  if (exact) return exact;

  return (
    list.find(
      (m) =>
        m.user.username.toLowerCase().includes(q) ||
        m.displayName.toLowerCase().includes(q)
    ) ?? null
  );
}

/** Handles /kick interactions. */
export async function handleKick(interaction: ChatInputCommandInteraction) {
  const group = interaction.options.getString("group", true);
  const person = interaction.options.getString("person", true);
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

  const callerPerm = await db.getMemberTeamPermission(
    teamSlug,
    interaction.user.id
  );
  if (!isGuildAdmin(interaction) && callerPerm !== TeamPermissionLevel.LEADER) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Only the team leader can kick members."
    });
    return;
  }

  const target = await findTargetMember(guild, person);
  if (!target) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `Could not find a member matching **${person}**. Try a @mention or their Discord username.`
    });
    return;
  }

  if (target.id === interaction.user.id) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "You cannot kick yourself with this command."
    });
    return;
  }

  const targetPerm = await db.getMemberTeamPermission(teamSlug, target.id);
  if (targetPerm === null) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `**${target.displayName}** is not on team **${group}** in the database.`
    });
    return;
  }

  if (!isGuildAdmin(interaction) && targetPerm === TeamPermissionLevel.LEADER) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content:
        "You cannot remove another **leader** from the team. Demote them first or use server admin tools."
    });
    return;
  }

  await interaction.deferReply();

  try {
    await db.removeMemberFromTeam(teamSlug, target.id);

    const role = guild.roles.cache.find((r) => r.name === teamSlug);
    if (role && target.roles.cache.has(role.id)) {
      await target.roles.remove(
        role,
        `Kicked from team ${group} by ${interaction.user.tag}`
      );
    }

    // Revoke GitHub repo access — best-effort
    const [kickedMember, team] = await Promise.all([
      db.getMember(target.id),
      db.getTeam(teamSlug)
    ]);
    if (kickedMember?.github && team?.github_repo) {
      await removeRepoCollaborator(team.github_repo, kickedMember.github).catch(
        (e) =>
          logger.error(
            `Failed to remove GitHub collaborator for ${target.user.tag}: ${e instanceof Error ? e.message : String(e)}`
          )
      );
    }

    logger.info(
      `${target.user.tag} kicked from "${group}" (team: ${teamSlug}) by ${interaction.user.tag}`
    );
    await interaction.editReply(
      `✅ **${target.displayName}** has been removed from **${group}**.`
    );
  } catch (err) {
    logger.error(
      `Failed to kick ${target.user.tag} from "${group}": ${err instanceof Error ? err.message : String(err)}`
    );
    await interaction.editReply(
      `Failed to remove **${target.displayName}** from **${group}**.`
    );
  }
}
