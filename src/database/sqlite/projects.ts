import { DatabaseProjectManager } from "../defs/projects";
import { sql } from "./conf";
import { Project } from "../defs/projects";
import { generateProjectSlug } from "../../tools/slug";

export const db_projects: DatabaseProjectManager = {
  getProjectInformation(project_slug) {
    return new Promise((resolve, reject) => {
      try {
        // Retrieve the project information by slug
        const result = sql
          .prepare("SELECT * FROM Projects WHERE slug = ?")
          .get(project_slug) as Project;
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },
  createNewProject(display_name, team_slug) {
    return new Promise((resolve, reject) => {
      try {
        // Extract team number from team_slug (e.g., "sp2026-team1" -> 1)
        const team_number = parseInt(team_slug.split("team")[1]);
        // Generate project slug
        const project_slug = generateProjectSlug(display_name, team_number);
        // Insert new project as active
        sql
          .prepare(
            "INSERT INTO Projects (slug, name, team_slug, is_active) VALUES (?, ?, ?, 1)"
          )
          .run(project_slug, display_name, team_slug);
        resolve(project_slug);
      } catch (error) {
        reject(error);
      }
    });
  },
  changeProjectTeam(project_slug, team_slug) {
    return new Promise((resolve, reject) => {
      try {
        // Update the team association for the project
        sql
          .prepare("UPDATE Projects SET team_slug = ? WHERE slug = ?")
          .run(team_slug, project_slug);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  changeProjectDisplayName(project_slug, display_name) {
    return new Promise((resolve, reject) => {
      try {
        // Update the display name of the project
        sql
          .prepare("UPDATE Projects SET name = ? WHERE slug = ?")
          .run(display_name, project_slug);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  changeProjectActiveStatus(project_slug, is_active) {
    return new Promise((resolve, reject) => {
      try {
        // Update the active status of the project
        sql
          .prepare("UPDATE Projects SET is_active = ? WHERE slug = ?")
          .run(is_active ? 1 : 0, project_slug);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  removeProject(project_slug) {
    return new Promise((resolve, reject) => {
      try {
        // Delete the project from the database
        sql.prepare("DELETE FROM Projects WHERE slug = ?").run(project_slug);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  getProjectByName(name) {
      return new Promise((resolve, reject) => {
          try {
              const result = sql
                  .prepare("SELECT * FROM Projects WHERE LOWER(name) = LOWER(?)")
                  .get(name) as Project | undefined;
              resolve(result);
          } catch (error) {
              reject(error);
          }
      });
  }
};
