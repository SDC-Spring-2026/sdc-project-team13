import { DatabaseProjectManager, Project } from "../defs/projects";
import { generateProjectSlug } from "../../tools/slug";
import { driver } from "../driver";
import { tbl } from "../physicalTables";
import { dbCache } from "../cache";

function invalidateProject(team_slug: string) {
  dbCache.del(`tp:${team_slug}`, `pp:${team_slug}`);
}

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
    invalidateProject(team_slug);
    return project_slug;
  },

  async changeProjectTeam(project_slug, team_slug) {
    const P = tbl("projects");
    // Fetch old team_slug to invalidate it too
    const rows = await driver().query<{ team_slug: string }>(
      `SELECT team_slug FROM ${P} WHERE slug = ?`,
      [project_slug]
    );
    await driver().query(`UPDATE ${P} SET team_slug = ? WHERE slug = ?`, [
      team_slug,
      project_slug
    ]);
    if (rows[0]) invalidateProject(rows[0].team_slug);
    invalidateProject(team_slug);
  },

  async changeProjectDisplayName(project_slug, display_name) {
    const P = tbl("projects");
    const rows = await driver().query<{ team_slug: string }>(
      `SELECT team_slug FROM ${P} WHERE slug = ?`,
      [project_slug]
    );
    await driver().query(`UPDATE ${P} SET name = ? WHERE slug = ?`, [
      display_name,
      project_slug
    ]);
    if (rows[0]) invalidateProject(rows[0].team_slug);
  },

  async changeProjectActiveStatus(project_slug, is_active) {
    const P = tbl("projects");
    const rows = await driver().query<{ team_slug: string }>(
      `SELECT team_slug FROM ${P} WHERE slug = ?`,
      [project_slug]
    );
    await driver().query(`UPDATE ${P} SET is_active = ? WHERE slug = ?`, [
      is_active,
      project_slug
    ]);
    if (rows[0]) invalidateProject(rows[0].team_slug);
  },

  async removeProject(project_slug) {
    const P = tbl("projects");
    const rows = await driver().query<{ team_slug: string }>(
      `SELECT team_slug FROM ${P} WHERE slug = ?`,
      [project_slug]
    );
    await driver().query(`DELETE FROM ${P} WHERE slug = ?`, [project_slug]);
    if (rows[0]) invalidateProject(rows[0].team_slug);
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
    const cached = dbCache.get<Project | undefined>(`pp:${team_slug}`);
    if (cached !== undefined) return cached;
    const P = tbl("projects");
    const rows = await driver().query<Project>(
      `SELECT * FROM ${P} WHERE team_slug = ? AND is_active = ? LIMIT 1`,
      [team_slug, true]
    );
    const result = rows[0];
    dbCache.set(`pp:${team_slug}`, result);
    return result;
  }
};
