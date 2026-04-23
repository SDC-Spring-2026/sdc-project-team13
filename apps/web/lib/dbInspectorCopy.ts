/**
 * Human-friendly labels for the DB inspector (raw Postgres/SQLite names stay in the API).
 */

export function sortInspectorTabKeys(keys: string[]): string[] {
  const rank = (k: string) => {
    const l = k.toLowerCase();
    if (l.includes("teams") && !l.includes("teamassociation")) return 0;
    if (l.includes("projects")) return 1;
    if (l.includes("teamassociation")) return 2;
    if (l.includes("members")) return 3;
    if (l.includes("messagehistory")) return 4;
    return 10;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function tabTitle(rawKey: string): string {
  const l = rawKey.toLowerCase();
  if (l.includes("teams") && !l.includes("teamassociation")) return "Teams";
  if (l.includes("projects")) return "Projects";
  if (l.includes("teamassociation")) return "Team roster";
  if (l.includes("members")) return "Club directory (GitHub)";
  if (l.includes("messagehistory")) return "Saved chat";
  return rawKey;
}

export function tabIntro(rawKey: string): string | null {
  const l = rawKey.toLowerCase();
  if (l.includes("teams") && !l.includes("teamassociation")) {
    return "Each row is one team: internal id, Discord text channel, team role, and whether the group is active.";
  }
  if (l.includes("projects")) {
    return "Project display names tied to a team. The bot uses this together with channel names for context.";
  }
  if (l.includes("teamassociation")) {
    return "This is who is on which team: Discord user id + team id + leader (1) or member (0). This is the source of truth for “who’s on my team”—not the Club directory tab.";
  }
  if (l.includes("members")) {
    return "Optional SDC directory: links a Discord account to a GitHub username. It can be empty even when teams are full—roster lives under Team roster.";
  }
  if (l.includes("messagehistory")) {
    return "Recent messages the bot saved for this team (normal chat + AI replies) to power “what’s going on here” questions.";
  }
  return null;
}

export function columnHeading(tableRawKey: string, column: string): string {
  const t = tableRawKey.toLowerCase();
  const c = column.toLowerCase();

  const common: Record<string, string> = {
    id: "Row #",
    slug: "Internal id",
    name: "Name",
    discord: "Discord user id",
    github: "GitHub username",
    team_slug: "Team",
    user_id: "Discord user",
    perm_level: "Team role (1 = leader, 0 = member)",
    role_id: "Discord role id",
    channel_id: "Discord text channel id",
    is_active: "Active?",
    timestamp: "When",
    scope: "Type of row",
    content: "Message text"
  };

  if (common[c]) return common[c];

  if (t.includes("projects") && c === "slug") return "Project id";
  if (t.includes("teams") && c === "slug") return "Team id";

  return column;
}
