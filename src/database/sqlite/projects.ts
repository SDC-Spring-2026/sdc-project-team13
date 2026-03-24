import { DatabaseProjectManager } from "../defs/projects";

export const db_projects: DatabaseProjectManager = {
  getProjectInformation(project_slug) {
    return new Promise((resolve, reject) => {});
  },
  createNewProject(display_name, team_slug) {
    return new Promise((resolve, reject) => {});
  },
  changeProjectActiveStatus(project_slug, is_active) {
    return new Promise((resolve, reject) => {});
  },
  changeProjectDisplayName(project_slug, display_name) {
    return new Promise((resolve, reject) => {});
  },
  changeProjectTeam(project_slug, team_slug) {
    return new Promise((resolve, reject) => {});
  },
  removeProject(project_slug) {
    return new Promise((resolve, reject) => {});
  }
};
