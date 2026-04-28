import { loadEnvConfig } from "@next/env";
import { tbl } from "./physicalTables";
import { openWebDb } from "./webDb";

export type MyTeam = {
  slug: string;
  isActive: boolean;
  githubRepo: string | null;
  permLevel: number;
  memberCount: number;
  messageCount: number;
  projectName: string | null;
};

export type TeamMember = {
  discordId: string;
  github: string | null;
  permLevel: number;
};

export type TeamOverview = {
  slug: string;
  isActive: boolean;
  githubRepo: string | null;
  projectName: string | null;
  members: TeamMember[];
};

export type TeamMessage = {
  id: number;
  teamSlug: string | null;
  userId: string | null;
  scope: string | null;
  timestamp: string | null;
  content: string | null;
};

export async function getMyTeams(userId: string): Promise<MyTeam[]> {
  loadEnvConfig(process.cwd());
  const conn = openWebDb();
  try {
    if (conn.driver === "postgres") {
      const r = await conn.pool.query(
        `
        SELECT
          t.slug,
          t.is_active,
          t.github_repo,
          a.perm_level,
          COALESCE(m.member_count, 0) AS member_count,
          COALESCE(h.message_count, 0) AS message_count,
          p.name AS project_name
        FROM ${tbl("teamAssociations")} a
        JOIN ${tbl("teams")} t ON t.slug = a.team_slug
        LEFT JOIN (
          SELECT team_slug, COUNT(*)::int AS member_count
          FROM ${tbl("teamAssociations")}
          GROUP BY team_slug
        ) m ON m.team_slug = t.slug
        LEFT JOIN (
          SELECT team_slug, COUNT(*)::int AS message_count
          FROM ${tbl("messageHistory")}
          GROUP BY team_slug
        ) h ON h.team_slug = t.slug
        LEFT JOIN (
          SELECT DISTINCT ON (team_slug) team_slug, name
          FROM ${tbl("projects")}
          WHERE is_active = TRUE
          ORDER BY team_slug, slug ASC
        ) p ON p.team_slug = t.slug
        WHERE a.user_id = $1
        ORDER BY t.slug ASC
        `,
        [userId]
      );

      return r.rows.map((row) => ({
        slug: String(row.slug),
        isActive: Boolean(row.is_active),
        githubRepo: (row.github_repo as string | null) ?? null,
        permLevel: Number(row.perm_level ?? 0),
        memberCount: Number(row.member_count ?? 0),
        messageCount: Number(row.message_count ?? 0),
        projectName: (row.project_name as string | null) ?? null
      }));
    }

    const rows = conn.db
      .prepare(
        `
        SELECT
          t.slug as slug,
          t.is_active as is_active,
          t.github_repo as github_repo,
          a.perm_level as perm_level,
          (SELECT COUNT(*) FROM ${tbl("teamAssociations")} a2 WHERE a2.team_slug = t.slug) AS member_count,
          (SELECT COUNT(*) FROM ${tbl("messageHistory")} h WHERE h.team_slug = t.slug) AS message_count,
          (SELECT p.name FROM ${tbl("projects")} p WHERE p.team_slug = t.slug AND p.is_active = 1 ORDER BY p.slug ASC LIMIT 1) AS project_name
        FROM ${tbl("teamAssociations")} a
        JOIN ${tbl("teams")} t ON t.slug = a.team_slug
        WHERE a.user_id = ?
        ORDER BY t.slug ASC
        `
      )
      .all(userId) as Array<{
      slug: string;
      is_active: number;
      github_repo: string | null;
      perm_level: number;
      member_count: number;
      message_count: number;
      project_name: string | null;
    }>;

    return rows.map((row) => ({
      slug: row.slug,
      isActive: Boolean(row.is_active),
      githubRepo: row.github_repo ?? null,
      permLevel: Number(row.perm_level ?? 0),
      memberCount: Number(row.member_count ?? 0),
      messageCount: Number(row.message_count ?? 0),
      projectName: row.project_name ?? null
    }));
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

async function assertTeamMembership(conn: ReturnType<typeof openWebDb>, userId: string, teamSlug: string): Promise<number> {
  if (conn.driver === "postgres") {
    const r = await conn.pool.query(
      `SELECT perm_level FROM ${tbl("teamAssociations")} WHERE user_id = $1 AND team_slug = $2 LIMIT 1`,
      [userId, teamSlug]
    );
    const row = r.rows[0] as { perm_level: number } | undefined;
    if (!row) throw new Error("FORBIDDEN");
    return Number(row.perm_level ?? 0);
  }
  const row = conn.db
    .prepare(
      `SELECT perm_level as permLevel FROM ${tbl("teamAssociations")} WHERE user_id = ? AND team_slug = ? LIMIT 1`
    )
    .get(userId, teamSlug) as { permLevel: number } | undefined;
  if (!row) throw new Error("FORBIDDEN");
  return Number(row.permLevel ?? 0);
}

export async function getTeamOverview(userId: string, teamSlug: string): Promise<TeamOverview> {
  loadEnvConfig(process.cwd());
  const conn = openWebDb();
  try {
    await assertTeamMembership(conn, userId, teamSlug);

    if (conn.driver === "postgres") {
      const [teamR, membersR, projectR] = await Promise.all([
        conn.pool.query(
          `SELECT slug, is_active, github_repo FROM ${tbl("teams")} WHERE slug = $1 LIMIT 1`,
          [teamSlug]
        ),
        conn.pool.query(
          `
          SELECT a.user_id, a.perm_level, m.github
          FROM ${tbl("teamAssociations")} a
          LEFT JOIN ${tbl("members")} m ON m.discord = a.user_id
          WHERE a.team_slug = $1
          ORDER BY a.perm_level DESC, a.user_id ASC
          `,
          [teamSlug]
        ),
        conn.pool.query(
          `SELECT name FROM ${tbl("projects")} WHERE team_slug = $1 AND is_active = TRUE ORDER BY slug ASC LIMIT 1`,
          [teamSlug]
        )
      ]);

      const team = teamR.rows[0] as { slug: string; is_active: boolean; github_repo: string | null } | undefined;
      if (!team) throw new Error("NOT_FOUND");
      const projectName = (projectR.rows[0] as { name: string } | undefined)?.name ?? null;

      return {
        slug: team.slug,
        isActive: Boolean(team.is_active),
        githubRepo: team.github_repo ?? null,
        projectName,
        members: membersR.rows.map((r) => ({
          discordId: String(r.user_id),
          permLevel: Number(r.perm_level ?? 0),
          github: (r.github as string | null) ?? null
        }))
      };
    }

    const team = conn.db
      .prepare(`SELECT slug, is_active as isActive, github_repo as githubRepo FROM ${tbl("teams")} WHERE slug = ? LIMIT 1`)
      .get(teamSlug) as { slug: string; isActive: number; githubRepo: string | null } | undefined;
    if (!team) throw new Error("NOT_FOUND");

    const members = conn.db
      .prepare(
        `
        SELECT a.user_id as userId, a.perm_level as permLevel, m.github as github
        FROM ${tbl("teamAssociations")} a
        LEFT JOIN ${tbl("members")} m ON m.discord = a.user_id
        WHERE a.team_slug = ?
        ORDER BY a.perm_level DESC, a.user_id ASC
        `
      )
      .all(teamSlug) as Array<{ userId: string; permLevel: number; github: string | null }>;

    const project = conn.db
      .prepare(
        `SELECT name FROM ${tbl("projects")} WHERE team_slug = ? AND is_active = 1 ORDER BY slug ASC LIMIT 1`
      )
      .get(teamSlug) as { name: string } | undefined;

    return {
      slug: team.slug,
      isActive: Boolean(team.isActive),
      githubRepo: team.githubRepo ?? null,
      projectName: project?.name ?? null,
      members: members.map((m) => ({
        discordId: m.userId,
        permLevel: Number(m.permLevel ?? 0),
        github: m.github ?? null
      }))
    };
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

export async function getTeamRecentMessages(
  userId: string,
  teamSlug: string,
  limit: number
): Promise<TeamMessage[]> {
  loadEnvConfig(process.cwd());
  const conn = openWebDb();
  try {
    await assertTeamMembership(conn, userId, teamSlug);
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));

    if (conn.driver === "postgres") {
      const r = await conn.pool.query(
        `SELECT id, team_slug, user_id, scope, timestamp, content
         FROM ${tbl("messageHistory")}
         WHERE team_slug = $1
         ORDER BY id DESC
         LIMIT $2`,
        [teamSlug, safeLimit]
      );
      return r.rows.map((row) => ({
        id: Number(row.id),
        teamSlug: (row.team_slug as string | null) ?? null,
        userId: (row.user_id as string | null) ?? null,
        scope: (row.scope as string | null) ?? null,
        timestamp: (row.timestamp as string | null) ?? null,
        content: (row.content as string | null) ?? null
      }));
    }

    const rows = conn.db
      .prepare(
        `SELECT id, team_slug as teamSlug, user_id as userId, scope, timestamp, content
         FROM ${tbl("messageHistory")}
         WHERE team_slug = ?
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(teamSlug, safeLimit) as Array<{
      id: number;
      teamSlug: string | null;
      userId: string | null;
      scope: string | null;
      timestamp: string | null;
      content: string | null;
    }>;

    return rows.map((r) => ({
      id: Number(r.id),
      teamSlug: r.teamSlug ?? null,
      userId: r.userId ?? null,
      scope: r.scope ?? null,
      timestamp: r.timestamp ?? null,
      content: r.content ?? null
    }));
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

