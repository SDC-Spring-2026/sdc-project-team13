import { DatabaseTeamsManager, Teams } from "../defs/teams";
import { Project } from "../defs/projects";
import { TeamPermissionLevel } from "../defs/team_assoc";
import { generateTermSlug, generateTeamSlug } from "../../tools/slug";
import { driver } from "../driver";
import { tbl } from "../physicalTables";

export const db_teams: DatabaseTeamsManager = {
  async getTeam(team_slug) {
    const rows = await driver().query<Teams>(
      "SELECT * FROM Teams WHERE slug = ?",
      [team_slug]
    );
    return rows[0] ?? null;
  },

  async setTeamRepo(team_slug, repo_name) {
    await driver().query(
      "UPDATE Teams SET github_repo = ? WHERE slug = ?",
      [repo_name, team_slug]
    );
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
    const P = tbl("projects");
    return driver().query<Project>(
      `SELECT * FROM ${P} WHERE team_slug = ?`,
      [team_slug]
    );
  },

  async getTeamByChannelId(channel_id) {
    const T = tbl("teams");
    const rows = await driver().query<Teams>(
      `SELECT * FROM ${T} WHERE channel_id = ?`,
      [channel_id]
    );
    return rows[0];
  },

  async getTeamBySlug(team_slug) {
    const T = tbl("teams");
    const rows = await driver().query<Teams>(
      `SELECT * FROM ${T} WHERE slug = ?`,
      [team_slug]
    );
    return rows[0];
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
  },

  async updateTeamActive(team_slug, is_active) {
    const T = tbl("teams");
    await driver().query(`UPDATE ${T} SET is_active = ? WHERE slug = ?`, [
      is_active,
      team_slug
    ]);
  },

  async deleteTeam(team_slug) {
    const T = tbl("teams");
    await driver().query(`DELETE FROM ${T} WHERE slug = ?`, [team_slug]);
  }
};
