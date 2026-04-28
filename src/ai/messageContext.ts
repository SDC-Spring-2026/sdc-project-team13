import type { Guild } from "discord.js";
import { Message } from "discord.js";
import { db } from "../database";
import { TeamPermissionLevel } from "../database/defs/team_assoc";
import { resolveTeamForMessage } from "../bot/teamFromMessage";

const RECENT_MESSAGE_HISTORY = 40;
const SNIPPET_MAX = 220;

function formatDbTeamRole(p: TeamPermissionLevel | null): string {
  if (p === null) return "not on this team's DB roster";
  return p === TeamPermissionLevel.LEADER ? "leader" : "member";
}

function snippet(text: string): string {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length <= SNIPPET_MAX ? one : `${one.slice(0, SNIPPET_MAX)}…`;
}

/** Resolve Discord user ids to display names for this guild (roster + history). */
async function guildMemberLabels(
  guild: Guild,
  userIds: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(userIds)].filter(Boolean).slice(0, 45);

  await Promise.all(
    unique.map(async (id) => {
      const cached = guild.members.cache.get(id);
      if (cached) {
        out.set(
          id,
          `${cached.displayName} (@${cached.user.username}) [id:${id}]`
        );
        return;
      }
      try {
        const gm = await guild.members.fetch(id);
        out.set(id, `${gm.displayName} (@${gm.user.username}) [id:${id}]`);
      } catch {
        out.set(
          id,
          `Not in this server or not loadable [id:${id}] — still a roster member in the database`
        );
      }
    })
  );

  return out;
}

/**
 * Builds a compact factual block for the model: guild, channel, Discord roles,
 * team/project linkage, archived MessageHistory for the team, and member hints.
 */
export async function buildAiSessionContext(message: Message): Promise<string> {
  try {
    return await buildAiSessionContextInner(message);
  } catch {
    return "Session context could not be loaded from the database. Answer using only the user's message and general knowledge.";
  }
}

async function buildAiSessionContextInner(message: Message): Promise<string> {
  const lines: string[] = [];
  const author = message.author;

  if (!message.guild) {
    lines.push("Location: direct message (no guild or team channel).");
    lines.push(`User: ${author.tag} (${author.id})`);
    const teams = await db.getMemberTeams(author.id, false);
    if (teams.length > 0) {
      lines.push(
        `User's active DB team slugs: ${teams.map((t) => t.slug).join(", ")}`
      );
    }
    const userMsgs = await db.getAllUserMessages(author.id);
    if (userMsgs.length > 0) {
      lines.push(
        `User has ${userMsgs.length} archived message row(s) across teams in MessageHistory (no channel context in DMs).`
      );
    }
    const gh = await db.getMemberGithub(author.id);
    if (gh) lines.push(`User's linked GitHub in Members table: ${gh}`);
    return lines.join("\n");
  }

  const guild = message.guild;
  const member =
    message.member ?? (await guild.members.fetch(author.id).catch(() => null));

  lines.push(`Guild: ${guild.name} (${guild.id})`);

  const ch = message.channel;
  const chName = ch.isDMBased()
    ? "dm"
    : "name" in ch
      ? (ch.name ?? "unknown")
      : "unknown";
  lines.push(
    `Channel: #${chName} (${message.channelId})${ch.isThread() ? " (thread)" : ""}`
  );

  if (member) {
    const roles = member.roles.cache
      .filter((r) => r.name !== "@everyone")
      .map((r) => r.name)
      .sort();
    const max = 35;
    const head = roles.slice(0, max);
    lines.push(
      `User: ${author.tag} (${author.id}), display name: ${member.displayName}`
    );
    lines.push(
      `Discord roles (${roles.length}): ${head.join(", ")}${roles.length > head.length ? ", …" : ""}`
    );
  } else {
    lines.push(`User: ${author.tag} (${author.id})`);
  }

  const resolution = await resolveTeamForMessage(message);
  const team = resolution.team;

  if (team) {
    if (resolution.match === "project_name") {
      lines.push(
        "This channel's Discord name matched a project display name in the DB; team data below is for that project's team (the official team channel_id in the DB may differ)."
      );
      lines.push(`Team slug "${team.slug}" (is_active=${team.is_active}).`);
    } else if (resolution.match === "project_compact") {
      lines.push(
        'Team matched by normalizing this channel name and an active project title in the DB (handles titles like "Final Test" in channel #finaltest, or stale channel_id rows).'
      );
      lines.push(`Team slug "${team.slug}" (is_active=${team.is_active}).`);
    } else if (resolution.match === "channel_name") {
      lines.push(
        `Team resolved from this channel's name (and fuzzy matching) in the guild: slug "${team.slug}" (is_active=${team.is_active}).`
      );
    } else {
      lines.push(
        `This channel matches team slug "${team.slug}" in the database (is_active=${team.is_active}).`
      );
    }

    const perm = await db.getMemberTeamPermission(team.slug, author.id);
    lines.push(
      `User's role on this team in the DB: ${formatDbTeamRole(perm)}.`
    );

    const projects = await db.getTeamProjects(team.slug);
    const activeNames = projects.filter((p) => p.is_active).map((p) => p.name);
    if (activeNames.length > 0) {
      lines.push(
        `Active project names on this team: ${activeNames.slice(0, 20).join("; ")}`
      );
    } else {
      lines.push("No active projects linked to this team in the database.");
    }

    const roster = await db.getTeamMembers(team.slug);
    const rosterIds = roster.map((m) => m.discord);
    const labels = await guildMemberLabels(guild, rosterIds);

    lines.push(
      `Team roster (${roster.length} people): membership is stored by Discord user id (Club directory / Members table is separate and only for optional GitHub links—it may be empty).`
    );
    lines.push(
      "Roster with names from this Discord server (use these names when the user asks who is on the team):"
    );
    for (const m of roster.slice(0, 50)) {
      const p = await db.getMemberTeamPermission(team.slug, m.discord);
      const roleLabel = p === TeamPermissionLevel.LEADER ? "leader" : "member";
      const label = labels.get(m.discord) ?? `Discord id ${m.discord}`;
      lines.push(`- ${label} — ${roleLabel}`);
    }

    const recent = await db.getRecentTeamMessages(
      team.slug,
      RECENT_MESSAGE_HISTORY
    );
    const historyIds = recent
      .filter((r) => r.scope !== "ai-assistant")
      .map((r) => r.user_id);
    const historyLabels = await guildMemberLabels(guild, historyIds);

    if (recent.length > 0) {
      lines.push(
        `Recent saved chat for this team (oldest → newest of the last ${recent.length} lines; “discord” = someone wrote in channel, “ai-assistant” = a previous Cache reply):`
      );
      for (const row of recent.slice().reverse()) {
        const who =
          row.scope === "ai-assistant"
            ? "Cache (bot)"
            : (historyLabels.get(row.user_id) ?? `user ${row.user_id}`);
        lines.push(
          `- [${row.scope}] ${who} @ ${row.timestamp}: ${snippet(row.content)}`
        );
      }
    } else {
      lines.push(
        "No MessageHistory rows for this team yet. Normal Discord messages in this mapped channel are archived automatically when the bot is online."
      );
    }
  } else {
    lines.push(
      "This channel is not linked to a team channel_id and no project display name matched this channel name. Use /create for bot-managed teams, or register a project whose name matches the channel name."
    );
  }

  const userTeams = await db.getMemberTeams(author.id, false);
  if (userTeams.length > 0) {
    lines.push(
      `User's active DB team slugs: ${userTeams.map((t) => t.slug).join(", ")}`
    );
  }

  const gh = await db.getMemberGithub(author.id);
  if (gh) lines.push(`User's linked GitHub in Members table: ${gh}`);

  return lines.join("\n");
}
