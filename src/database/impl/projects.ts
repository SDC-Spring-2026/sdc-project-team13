import { DatabaseProjectManager, Project } from "../defs/projects";
import { generateProjectSlug } from "../../tools/slug";
import { driver } from "../driver";

export const db_projects: DatabaseProjectManager = {
  async getProjectInformation(project_slug) {
    const rows = await driver().query<Project>(
      "SELECT * FROM Projects WHERE slug = ?",
      [project_slug]
    );
    return rows[0];
  },

  async createNewProject(display_name, team_slug) {
    const team_number = parseInt(team_slug.split("team")[1]);
    const project_slug = generateProjectSlug(display_name, team_number);

    await driver().query(
      "INSERT INTO Projects (slug, name, team_slug, is_active) VALUES (?, ?, ?, ?)",
      [project_slug, display_name, team_slug, true]
    );

    return project_slug;
  },

  async changeProjectTeam(project_slug, team_slug) {
    await driver().query(
      "UPDATE Projects SET team_slug = ? WHERE slug = ?",
      [team_slug, project_slug]
    );
  },

  async changeProjectDisplayName(project_slug, display_name) {
    await driver().query(
      "UPDATE Projects SET name = ? WHERE slug = ?",
      [display_name, project_slug]
    );
  },

  async changeProjectActiveStatus(project_slug, is_active) {
    await driver().query(
      "UPDATE Projects SET is_active = ? WHERE slug = ?",
      [is_active, project_slug]
    );
  },

  async removeProject(project_slug) {
    await driver().query("DELETE FROM Projects WHERE slug = ?", [project_slug]);
  },

  async getProjectByName(name) {
    const rows = await driver().query<Project>(
      "SELECT * FROM Projects WHERE LOWER(name) = LOWER(?)",
      [name]
    );
    return rows[0];
  }
};
