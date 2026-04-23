import { TermIdentifier } from "../../tools/slug";
import { Project } from "./projects";

export interface Teams {
  slug: string;
  role_id: string;
  channel_id: string;
  is_active: boolean;
}

/** Database Manager parts for Teams table. */
export interface DatabaseTeamsManager {
  // TEAMS

  /**
   * Gets the number of teams in SDC, optionally from any specific term.
   * @param term Optional, the term to count.
   * @returns The number of teams currently registered.
   */
  getNumberOfTeams(term?: TermIdentifier): Promise<number>;
  /**
   * Get all projects associated with a team.
   * @param team_slug The team slug id.
   * @returns A list of all project records connected to this team.
   */
  getTeamProjects(team_slug: string): Promise<Project[]>;
  /**
   * Look up a team by its linked Discord text channel id.
   * @param channel_id The Discord channel snowflake.
   * @returns The team row if this channel is a project team channel, else undefined.
   */
  getTeamByChannelId(channel_id: string): Promise<Teams | undefined>;
  /**
   * Load a team row by slug.
   */
  getTeamBySlug(team_slug: string): Promise<Teams | undefined>;
  /**
   * Find an active team whose active project display name normalizes to the same
   * compact string as a Discord channel name (spaces/hyphens stripped, lowercased).
   * Use when channel_id is stale or project title differs from the channel slug.
   */
  findActiveTeamByProjectNameCompact(
    compactHint: string
  ): Promise<Teams | undefined>;
  /**
   * Reserves a new team slug from SDC, and creates an unactivated team.
   * @returns The slug id for this team. Will be in the form `term-team#`. Team ID will count up from the first team create this term. Needed to finalize team registration.
   */
  requestNewTeamID(): Promise<string>;
  /**
   * Finalizes a new team and activates it in the database. Any given team can only have one attached channel and role.
   * @param team_slug A slug id referencing a team.
   * @param channel_id The discord channel id to attach to this team.
   * @param role_id The discord role id to attach to this team.
   * @param leader_id The discord user id to add to this team and make a leader.
   * @returns If this team was successfully finalized and activated.
   */
  finalizeNewTeam(
    team_slug: string,
    channel_id: string,
    role_id: string,
    leader_id: string
  ): Promise<void>;
  /**
   * Toggle if a team is active or not.
   * @param team_slug A team slug id.
   * @param is_active If this team should be active or inactive.
   * @returns If this setting was successfully changed.
   */
  updateTeamActive(team_slug: string, is_active: boolean): Promise<void>;
  /**
   * Remove a team from the database.
   * @param team_slug A team slug id.
   * @returns If the team was successfully removed.
   */
  deleteTeam(team_slug: string): Promise<void>;
}
