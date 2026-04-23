import { DatabaseProjectManager, Project } from "../defs/projects";
import { generateProjectSlug } from "../../tools/slug";
import { driver } from "../driver";
import { tbl } from "../physicalTables";

export const db_projects: DatabaseProjectManager = {
  async getProjectInformation(project_slug) {
    const P = tbl("projects");
    const rows = await driver().query<Project>(
      `SELECT * FROM ${P} WHERE slug = ?`,
      [project_slug]
    );
    return rows[0];
  },

  async createNewProject(display_name, team_slug) {
    const P = tbl("projects");
    const team_number = parseInt(team_slug.split("team")[1]);
    const project_slug = generateProjectSlug(display_name, team_number);

    await driver().query(
      `INSERT INTO ${P} (slug, name, team_slug, is_active) VALUES (?, ?, ?, ?)`,
      [project_slug, display_name, team_slug, true]
    );

    return project_slug;
  },

  async changeProjectTeam(project_slug, team_slug) {
    const P = tbl("projects");
    await driver().query(`UPDATE ${P} SET team_slug = ? WHERE slug = ?`, [
      team_slug,
      project_slug
    ]);
  },

  async changeProjectDisplayName(project_slug, display_name) {
    const P = tbl("projects");
    await driver().query(`UPDATE ${P} SET name = ? WHERE slug = ?`, [
      display_name,
      project_slug
    ]);
  },

  async changeProjectActiveStatus(project_slug, is_active) {
    const P = tbl("projects");
    await driver().query(`UPDATE ${P} SET is_active = ? WHERE slug = ?`, [
      is_active,
      project_slug
    ]);
  },

  async removeProject(project_slug) {
    const P = tbl("projects");
    await driver().query(`DELETE FROM ${P} WHERE slug = ?`, [project_slug]);
  },

  async getProjectByName(name) {
    const P = tbl("projects");
    const rows = await driver().query<Project>(
      `SELECT * FROM ${P} WHERE LOWER(name) = LOWER(?)`,
      [name]
    );
    return rows[0];
  },

  async getPrimaryActiveProjectForTeam(team_slug) {
    const P = tbl("projects");
    const rows = await driver().query<Project>(
      `SELECT * FROM ${P} WHERE team_slug = ? AND is_active = ? LIMIT 1`,
      [team_slug, true]
    );
    return rows[0];
  }
};
