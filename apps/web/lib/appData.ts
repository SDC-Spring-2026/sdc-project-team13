import { loadEnvConfig } from "@next/env";
import { tbl } from "./physicalTables";
import { openWebDb } from "./webDb";
import { searchDiscordGuildMemberId } from "./discordBotApi";

export type MyTeam = {
  slug: string;
  isActive: boolean;
  githubRepo: string | null;
  permLevel: number;
  memberCount: number;
  messageCount: number;
  projectName: string | null;
};

export type ClubTeam = {
  slug: string;
  isActive: boolean;
  projectName: string | null;
  memberCount: number;
  // The current viewer's permission on that team, if they're a member.
  viewerPermLevel: number | null;
  // Admin-only fields (can be null/omitted in UI for non-admin).
  githubRepo: string | null;
  messageCount: number | null;
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

export type UserTeamInvolvement = {
  teamSlug: string;
  permLevel: number;
  isActive: boolean;
  projectName: string | null;
};

export type UserProfile = {
  userId: string;
  github: string | null;
  teams: UserTeamInvolvement[];
};

async function resolveUserId(
  conn: ReturnType<typeof openWebDb>,
  idOrHandle: string
): Promise<{ userId: string; github: string | null } | null> {
  const raw = idOrHandle.trim().replace(/^@+/, "");
  if (!raw) return null;
  const isId = /^[0-9]{6,}$/.test(raw);

  if (conn.driver === "postgres") {
    if (isId) {
      const r = await conn.pool.query(
        `SELECT discord, github FROM ${tbl("members")} WHERE discord = $1 LIMIT 1`,
        [raw]
      );
      const row = r.rows[0] as
        | { discord: string; github: string | null }
        | undefined;
      if (!row) return { userId: raw, github: null };
      return {
        userId: String(row.discord),
        github: (row.github as string | null) ?? null
      };
    }
    const r = await conn.pool.query(
      `SELECT discord, github FROM ${tbl("members")} WHERE LOWER(github) = LOWER($1) LIMIT 1`,
      [raw]
    );
    const row = r.rows[0] as
      | { discord: string; github: string | null }
      | undefined;
    if (!row) {
      const discordId = await searchDiscordGuildMemberId(raw);
      if (!discordId) return null;
      const r2 = await conn.pool.query(
        `SELECT discord, github FROM ${tbl("members")} WHERE discord = $1 LIMIT 1`,
        [discordId]
      );
      const row2 = r2.rows[0] as
        | { discord: string; github: string | null }
        | undefined;
      return {
        userId: discordId,
        github: (row2?.github as string | null) ?? null
      };
    }
    return {
      userId: String(row.discord),
      github: (row.github as string | null) ?? null
    };
  }

  if (isId) {
    const row = conn.db
      .prepare(
        `SELECT discord as discord, github as github FROM ${tbl("members")} WHERE discord = ? LIMIT 1`
      )
      .get(raw) as { discord: string; github: string | null } | undefined;
    if (!row) return { userId: raw, github: null };
    return { userId: String(row.discord), github: row.github ?? null };
  }

  const row = conn.db
    .prepare(
      `SELECT discord as discord, github as github FROM ${tbl("members")} WHERE LOWER(github) = LOWER(?) LIMIT 1`
    )
    .get(raw) as { discord: string; github: string | null } | undefined;
  if (!row) {
    const discordId = await searchDiscordGuildMemberId(raw);
    if (!discordId) return null;
    const row2 = conn.db
      .prepare(
        `SELECT discord as discord, github as github FROM ${tbl("members")} WHERE discord = ? LIMIT 1`
      )
      .get(discordId) as { discord: string; github: string | null } | undefined;
    return { userId: discordId, github: row2?.github ?? null };
  }
  return { userId: String(row.discord), github: row.github ?? null };
}

async function assertProfileViewAllowed(
  conn: ReturnType<typeof openWebDb>,
  viewerId: string,
  targetUserId: string,
  opts?: { allowAdminView?: boolean }
) {
  if (opts?.allowAdminView) return;
  if (viewerId === targetUserId) return;

  if (conn.driver === "postgres") {
    const r = await conn.pool.query(
      `
      SELECT 1
      FROM ${tbl("teamAssociations")} a
      JOIN ${tbl("teamAssociations")} b ON b.team_slug = a.team_slug
      WHERE a.user_id = $1 AND b.user_id = $2
      LIMIT 1
      `,
      [viewerId, targetUserId]
    );
    if (!r.rows[0]) throw new Error("FORBIDDEN");
    return;
  }

  const row = conn.db
    .prepare(
      `
      SELECT 1
      FROM ${tbl("teamAssociations")} a
      JOIN ${tbl("teamAssociations")} b ON b.team_slug = a.team_slug
      WHERE a.user_id = ? AND b.user_id = ?
      LIMIT 1
      `
    )
    .get(viewerId, targetUserId) as { 1: number } | undefined;
  if (!row) throw new Error("FORBIDDEN");
}

export async function getUserProfile(
  viewerId: string,
  idOrHandle: string,
  opts?: { allowAdminView?: boolean }
): Promise<UserProfile> {
  loadEnvConfig(process.cwd());
  const conn = openWebDb();
  try {
    const resolved = await resolveUserId(conn, idOrHandle);
    if (!resolved) throw new Error("NOT_FOUND");

    await assertProfileViewAllowed(conn, viewerId, resolved.userId, opts);

    if (conn.driver === "postgres") {
      const r = await conn.pool.query(
        `
        SELECT
          a.team_slug,
          a.perm_level,
          t.is_active,
          p.name AS project_name
        FROM ${tbl("teamAssociations")} a
        JOIN ${tbl("teams")} t ON t.slug = a.team_slug
        LEFT JOIN (
          SELECT DISTINCT ON (team_slug) team_slug, name
          FROM ${tbl("projects")}
          WHERE is_active = TRUE
          ORDER BY team_slug, slug ASC
        ) p ON p.team_slug = t.slug
        WHERE a.user_id = $1
        ORDER BY a.perm_level DESC, a.team_slug ASC
        `,
        [resolved.userId]
      );

      return {
        userId: resolved.userId,
        github: resolved.github,
        teams: r.rows.map((row) => ({
          teamSlug: String(row.team_slug),
          permLevel: Number(row.perm_level ?? 0),
          isActive: Boolean(row.is_active),
          projectName: (row.project_name as string | null) ?? null
        }))
      };
    }

    const rows = conn.db
      .prepare(
        `
        SELECT
          a.team_slug as teamSlug,
          a.perm_level as permLevel,
          t.is_active as isActive,
          (SELECT p.name FROM ${tbl("projects")} p WHERE p.team_slug = t.slug AND p.is_active = 1 ORDER BY p.slug ASC LIMIT 1) AS projectName
        FROM ${tbl("teamAssociations")} a
        JOIN ${tbl("teams")} t ON t.slug = a.team_slug
        WHERE a.user_id = ?
        ORDER BY a.perm_level DESC, a.team_slug ASC
        `
      )
      .all(resolved.userId) as Array<{
      teamSlug: string;
      permLevel: number;
      isActive: number;
      projectName: string | null;
    }>;

    return {
      userId: resolved.userId,
      github: resolved.github,
      teams: rows.map((row) => ({
        teamSlug: row.teamSlug,
        permLevel: Number(row.permLevel ?? 0),
        isActive: Boolean(row.isActive),
        projectName: row.projectName ?? null
      }))
    };
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

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

export async function getClubTeams(
  userId: string,
  opts: { includeAdminFields: boolean }
): Promise<ClubTeam[]> {
  loadEnvConfig(process.cwd());
  const conn = openWebDb();
  try {
    const includeAdmin = Boolean(opts.includeAdminFields);

    if (conn.driver === "postgres") {
      const r = await conn.pool.query(
        `
        SELECT
          t.slug,
          t.is_active,
          t.github_repo,
          COALESCE(m.member_count, 0) AS member_count,
          COALESCE(h.message_count, 0) AS message_count,
          p.name AS project_name,
          a.perm_level AS viewer_perm_level
        FROM ${tbl("teams")} t
        LEFT JOIN ${tbl("teamAssociations")} a
          ON a.team_slug = t.slug AND a.user_id = $1
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
        ORDER BY t.slug ASC
        `,
        [userId]
      );

      return r.rows.map((row) => ({
        slug: String(row.slug),
        isActive: Boolean(row.is_active),
        projectName: (row.project_name as string | null) ?? null,
        memberCount: Number(row.member_count ?? 0),
        viewerPermLevel:
          row.viewer_perm_level === null || row.viewer_perm_level === undefined
            ? null
            : Number(row.viewer_perm_level),
        githubRepo: includeAdmin
          ? ((row.github_repo as string | null) ?? null)
          : null,
        messageCount: includeAdmin ? Number(row.message_count ?? 0) : null
      }));
    }

    const rows = conn.db
      .prepare(
        `
        SELECT
          t.slug as slug,
          t.is_active as is_active,
          t.github_repo as github_repo,
          (SELECT COUNT(*) FROM ${tbl("teamAssociations")} a2 WHERE a2.team_slug = t.slug) AS member_count,
          (SELECT COUNT(*) FROM ${tbl("messageHistory")} h WHERE h.team_slug = t.slug) AS message_count,
          (SELECT p.name FROM ${tbl("projects")} p WHERE p.team_slug = t.slug AND p.is_active = 1 ORDER BY p.slug ASC LIMIT 1) AS project_name,
          (SELECT perm_level FROM ${tbl("teamAssociations")} a3 WHERE a3.team_slug = t.slug AND a3.user_id = ? LIMIT 1) AS viewer_perm_level
        FROM ${tbl("teams")} t
        ORDER BY t.slug ASC
        `
      )
      .all(userId) as Array<{
      slug: string;
      is_active: number;
      github_repo: string | null;
      member_count: number;
      message_count: number;
      project_name: string | null;
      viewer_perm_level: number | null;
    }>;

    return rows.map((row) => ({
      slug: row.slug,
      isActive: Boolean(row.is_active),
      projectName: row.project_name ?? null,
      memberCount: Number(row.member_count ?? 0),
      viewerPermLevel:
        row.viewer_perm_level === null || row.viewer_perm_level === undefined
          ? null
          : Number(row.viewer_perm_level),
      githubRepo: includeAdmin ? (row.github_repo ?? null) : null,
      messageCount: includeAdmin ? Number(row.message_count ?? 0) : null
    }));
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

async function assertTeamMembership(
  conn: ReturnType<typeof openWebDb>,
  userId: string,
  teamSlug: string,
  opts?: { allowAdminView?: boolean }
): Promise<number> {
  if (conn.driver === "postgres") {
    const r = await conn.pool.query(
      `SELECT perm_level FROM ${tbl("teamAssociations")} WHERE user_id = $1 AND team_slug = $2 LIMIT 1`,
      [userId, teamSlug]
    );
    const row = r.rows[0] as { perm_level: number } | undefined;
    if (!row) {
      if (opts?.allowAdminView) return 0;
      throw new Error("FORBIDDEN");
    }
    return Number(row.perm_level ?? 0);
  }
  const row = conn.db
    .prepare(
      `SELECT perm_level as permLevel FROM ${tbl("teamAssociations")} WHERE user_id = ? AND team_slug = ? LIMIT 1`
    )
    .get(userId, teamSlug) as { permLevel: number } | undefined;
  if (!row) {
    if (opts?.allowAdminView) return 0;
    throw new Error("FORBIDDEN");
  }
  return Number(row.permLevel ?? 0);
}

export async function getTeamOverview(
  userId: string,
  teamSlug: string,
  opts?: { allowAdminView?: boolean }
): Promise<TeamOverview> {
  loadEnvConfig(process.cwd());
  const conn = openWebDb();
  try {
    await assertTeamMembership(conn, userId, teamSlug, opts);

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

      const team = teamR.rows[0] as
        | { slug: string; is_active: boolean; github_repo: string | null }
        | undefined;
      if (!team) throw new Error("NOT_FOUND");
      const projectName =
        (projectR.rows[0] as { name: string } | undefined)?.name ?? null;

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
      .prepare(
        `SELECT slug, is_active as isActive, github_repo as githubRepo FROM ${tbl("teams")} WHERE slug = ? LIMIT 1`
      )
      .get(teamSlug) as
      | { slug: string; isActive: number; githubRepo: string | null }
      | undefined;
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
      .all(teamSlug) as Array<{
      userId: string;
      permLevel: number;
      github: string | null;
    }>;

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
  limit: number,
  opts?: { allowAdminView?: boolean }
): Promise<TeamMessage[]> {
  loadEnvConfig(process.cwd());
  const conn = openWebDb();
  try {
    await assertTeamMembership(conn, userId, teamSlug, opts);
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
