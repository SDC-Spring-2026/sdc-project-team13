/** Information about a project. */
export interface Project {
  slug: string;
  name: string;
  team_slug: string;
  is_active: boolean;
}

/** Database Manager parts for Projects table. */
export interface DatabaseProjectManager {
  // Projects

  /**
   * Get all information related to a project.
   * @param project_slug The project slug id.
   * @returns An object with all project information.
   */
  getProjectInformation(project_slug: string): Promise<Project>;
  /**
   * Create a new project, active by default.
   * @param display_name The display name of this project.
   * @param team_slug The team slug id to assign this project to.
   * @returns The project slug id that references this project.
   */
  createNewProject(display_name: string, team_slug: string): Promise<string>;
  /**
   * Change what team a project belongs to.
   * @param project_slug A project slug id.
   * @param team_slug The team to assign this project to.
   * @returns If the project team was successfully changed.
   */
  changeProjectTeam(project_slug: string, team_slug: string): Promise<void>;
  /**
   * Change the display name of a project.
   * @param project_slug A project slug id.
   * @param display_name The new display name for the project.
   * @returns If the project was successfully changed.
   */
  changeProjectDisplayName(
    project_slug: string,
    display_name: string
  ): Promise<void>;
  /**
   * Change the active status of a project.
   * @param project_slug A project slug id.
   * @param is_active The status for the project.
   * @returns If the status was successfully updated.
   */
  changeProjectActiveStatus(
    project_slug: string,
    is_active: string
  ): Promise<void>;
  /**
   * Remove a project from the database.
   * @param project_slug The project slug id.
   * @returns If the project was successfully removed.
   */
  removeProject(project_slug: string): Promise<void>;
}
