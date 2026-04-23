import { DatabaseTeamsManager, Teams } from "../defs/teams";
import { Project } from "../defs/projects";
import { TeamPermissionLevel } from "../defs/team_assoc";
import { generateTermSlug, generateTeamSlug } from "../../tools/slug";
import { driver } from "../driver";

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
    let sql = "SELECT COUNT(*) AS count FROM Teams";
    const params: unknown[] = [];

    if (term) {
      sql += " WHERE slug LIKE ?";
      params.push(`${term}-team%`);
    }

    const rows = await driver().query<{ count: string | number }>(sql, params);
    return Number(rows[0].count);
  },

  async getTeamProjects(team_slug) {
    return driver().query<Project>(
      "SELECT * FROM Projects WHERE team_slug = ?",
      [team_slug]
    );
  },

  async requestNewTeamID() {
    const term = generateTermSlug();
    const pattern = `${term}-team%`;

    const rows = await driver().query<{ max_num: number | null }>(
      "SELECT MAX(CAST(SUBSTR(slug, LENGTH(?) + 6) AS INTEGER)) AS max_num FROM Teams WHERE slug LIKE ?",
      [term, pattern]
    );

    const nextNum = (rows[0].max_num ?? 0) + 1;
    const slug = generateTeamSlug(nextNum);

    await driver().query(
      "INSERT INTO Teams (slug, is_active) VALUES (?, ?)",
      [slug, false]
    );

    return slug;
  },

  async finalizeNewTeam(team_slug, channel_id, role_id, leader_id) {
    await driver().query(
      "UPDATE Teams SET role_id = ?, channel_id = ?, is_active = ? WHERE slug = ?",
      [role_id, channel_id, true, team_slug]
    );

    await driver().query(
      "INSERT INTO TeamAssociations (user_id, team_slug, perm_level) VALUES (?, ?, ?)",
      [leader_id, team_slug, TeamPermissionLevel.LEADER]
    );
  },

  async updateTeamActive(team_slug, is_active) {
    await driver().query(
      "UPDATE Teams SET is_active = ? WHERE slug = ?",
      [is_active, team_slug]
    );
  },

  async deleteTeam(team_slug) {
    await driver().query("DELETE FROM Teams WHERE slug = ?", [team_slug]);
  }
};
