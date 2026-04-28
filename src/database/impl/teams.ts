import { DatabaseTeamsManager, Teams } from "../defs/teams";
import { Project } from "../defs/projects";
import { TeamPermissionLevel } from "../defs/team_assoc";
import { generateTermSlug, generateTeamSlug } from "../../tools/slug";
import { driver } from "../driver";
import { tbl } from "../physicalTables";
import { dbCache } from "../cache";

function invalidateTeam(team_slug: string, channel_id?: string | null) {
  dbCache.del(`t:${team_slug}`, `tl:${team_slug}`, `tp:${team_slug}`);
  if (channel_id) dbCache.del(`tc:${channel_id}`);
}

export const db_teams: DatabaseTeamsManager = {
  async getTeam(team_slug) {
    const cached = dbCache.get<Teams | null>(`t:${team_slug}`);
    if (cached !== undefined) return cached;
    const rows = await driver().query<Teams>(
      "SELECT * FROM Teams WHERE slug = ?",
      [team_slug]
    );
    const result = rows[0] ?? null;
    dbCache.set(`t:${team_slug}`, result);
    return result;
  },

  async setTeamRepo(team_slug, repo_name) {
    await driver().query("UPDATE Teams SET github_repo = ? WHERE slug = ?", [
      repo_name,
      team_slug
    ]);
    const cached = dbCache.get<Teams | null>(`t:${team_slug}`);
    invalidateTeam(team_slug, cached?.channel_id);
  },

  async getNumberOfTeams(term) {
    const T = tbl("teams");
    let sql = `SELECT COUNT(*) AS count FROM ${T}`;
    const params: unknown[] = [];

    if (term) {
      sql += " WHERE slug LIKE ?";
      params.push(`${term}-team%`);
    }

    const rows = await driver().query<{ count: string | number }>(sql, params);
    return Number(rows[0].count);
  },

  async getTeamProjects(team_slug) {
    const cached = dbCache.get<Project[]>(`tp:${team_slug}`);
    if (cached) return cached;
    const P = tbl("projects");
    const result = await driver().query<Project>(
      `SELECT * FROM ${P} WHERE team_slug = ?`,
      [team_slug]
    );
    dbCache.set(`tp:${team_slug}`, result);
    return result;
  },

  async getTeamByChannelId(channel_id) {
    const cached = dbCache.get<Teams | undefined>(`tc:${channel_id}`);
    if (cached !== undefined) return cached;
    const T = tbl("teams");
    const rows = await driver().query<Teams>(
      `SELECT * FROM ${T} WHERE channel_id = ?`,
      [channel_id]
    );
    const result = rows[0];
    dbCache.set(`tc:${channel_id}`, result);
    return result;
  },

  async getTeamBySlug(team_slug) {
    const cached = dbCache.get<Teams | undefined>(`t:${team_slug}`);
    if (cached !== undefined) return cached;
    const T = tbl("teams");
    const rows = await driver().query<Teams>(
      `SELECT * FROM ${T} WHERE slug = ?`,
      [team_slug]
    );
    const result = rows[0];
    dbCache.set(`t:${team_slug}`, result);
    return result;
  },

  async findActiveTeamByProjectNameCompact(compactHint) {
    const hint = compactHint
      .trim()
      .toLowerCase()
      .replace(/[\s\-_.]+/g, "");
    if (!hint) return undefined;

    const T = tbl("teams");
    const P = tbl("projects");
    const rows = await driver().query<Teams>(
      `SELECT t.* FROM ${T} t
       INNER JOIN ${P} p ON p.team_slug = t.slug
       WHERE p.is_active = ? AND t.is_active = ?
       AND REPLACE(REPLACE(REPLACE(LOWER(TRIM(p.name)), ' ', ''), '-', ''), '_', '') = ?
       LIMIT 1`,
      [true, true, hint]
    );
    return rows[0];
  },

  async requestNewTeamID() {
    const T = tbl("teams");
    const term = generateTermSlug();
    const pattern = `${term}-team%`;

    const rows = await driver().query<{ max_num: number | null }>(
      `SELECT MAX(CAST(SUBSTR(slug, LENGTH(?) + 6) AS INTEGER)) AS max_num FROM ${T} WHERE slug LIKE ?`,
      [term, pattern]
    );

    const nextNum = (rows[0].max_num ?? 0) + 1;
    const slug = generateTeamSlug(nextNum);

    await driver().query(`INSERT INTO ${T} (slug, is_active) VALUES (?, ?)`, [
      slug,
      false
    ]);

    return slug;
  },

  async finalizeNewTeam(team_slug, channel_id, role_id, leader_id) {
    const T = tbl("teams");
    const A = tbl("teamAssociations");
    await driver().query(
      `UPDATE ${T} SET role_id = ?, channel_id = ?, is_active = ? WHERE slug = ?`,
      [role_id, channel_id, true, team_slug]
    );
    await driver().query(
      `INSERT INTO ${A} (user_id, team_slug, perm_level) VALUES (?, ?, ?)`,
      [leader_id, team_slug, TeamPermissionLevel.LEADER]
    );
    invalidateTeam(team_slug, channel_id);
  },

  async updateTeamActive(team_slug, is_active) {
    const T = tbl("teams");
    await driver().query(`UPDATE ${T} SET is_active = ? WHERE slug = ?`, [
      is_active,
      team_slug
    ]);
    const cached = dbCache.get<Teams | null>(`t:${team_slug}`);
    invalidateTeam(team_slug, cached?.channel_id);
  },

  async setTeamDisabled(team_slug, is_disabled) {
    const T = tbl("teams");
    await driver().query(`UPDATE ${T} SET is_disabled = ? WHERE slug = ?`, [
      is_disabled,
      team_slug
    ]);
    const cached = dbCache.get<Teams | null>(`t:${team_slug}`);
    invalidateTeam(team_slug, cached?.channel_id);
  },

  async deleteTeam(team_slug) {
    const T = tbl("teams");
    const cached = dbCache.get<Teams | null>(`t:${team_slug}`);
    await driver().query(`DELETE FROM ${T} WHERE slug = ?`, [team_slug]);
    invalidateTeam(team_slug, cached?.channel_id);
  },

  async tombstoneTeam(team_slug) {
    const T = tbl("teams");
    const cached = dbCache.get<Teams | null>(`t:${team_slug}`);
    await driver().query(
      `UPDATE ${T} SET role_id = NULL, channel_id = NULL, github_repo = NULL, is_active = ?, is_disabled = ? WHERE slug = ?`,
      [false, true, team_slug]
    );
    invalidateTeam(team_slug, cached?.channel_id);
  },

  async getAllActiveTeamsWithProjects() {
    const T = tbl("teams");
    const P = tbl("projects");
    return driver().query<{
      slug: string;
      channel_id: string;
      github_repo: string | null;
      project_name: string | null;
    }>(
      `SELECT t.slug, t.channel_id, t.github_repo, p.name AS project_name
       FROM ${T} t
       LEFT JOIN ${P} p ON p.team_slug = t.slug AND p.is_active = ?
       WHERE t.is_active = ?
       ORDER BY t.slug`,
      [true, true]
    );
  },

  async getTeamLeader(team_slug) {
    const cached = dbCache.get<string | null>(`tl:${team_slug}`);
    if (cached !== undefined) return cached;
    const A = tbl("teamAssociations");
    const rows = await driver().query<{ user_id: string }>(
      `SELECT user_id FROM ${A} WHERE team_slug = ? AND perm_level = ?`,
      [team_slug, TeamPermissionLevel.LEADER]
    );
    const result = rows[0]?.user_id ?? null;
    dbCache.set(`tl:${team_slug}`, result);
    return result;
  }
};
