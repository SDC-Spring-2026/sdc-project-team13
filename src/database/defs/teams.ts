import { TermIdentifier } from "../../tools/slug";
import { Project } from "./projects";

export interface Teams {
  slug: string;
  role_id: string;
  channel_id: string;
  is_active: boolean;
  is_disabled: boolean;
  github_repo: string | null;
}

/** Database Manager parts for Teams table. */
export interface DatabaseTeamsManager {
  // TEAMS

  /**
   * Get a single team record by slug.
   * @param team_slug The team slug id.
   * @returns The team record, or null if not found.
   */
  getTeam(team_slug: string): Promise<Teams | null>;
  /**
   * Store the GitHub repo name for a team.
   * @param team_slug The team slug id.
   * @param repo_name The GitHub repository name.
   */
  setTeamRepo(team_slug: string, repo_name: string): Promise<void>;
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
   * Set the disabled flag on a team (toggled by /disable and /enable).
   * Unlike is_active, this does not affect the team creation lifecycle.
   * @param team_slug A team slug id.
   * @param is_disabled Whether the team should be marked as disabled.
   */
  setTeamDisabled(team_slug: string, is_disabled: boolean): Promise<void>;
  /**
   * Remove a team from the database.
   * @param team_slug A team slug id.
   * @returns If the team was successfully removed.
   */
  deleteTeam(team_slug: string): Promise<void>;
  /**
   * Tombstone a purged team: nulls out channel_id, role_id, github_repo and marks
   * the row inactive so the slug stays in the table and is never reused by requestNewTeamID.
   * @param team_slug A team slug id.
   */
  tombstoneTeam(team_slug: string): Promise<void>;
  /**
   * Returns all active teams joined with their primary active project name.
   * Teams with no active project have project_name = null.
   */
  getAllActiveTeamsWithProjects(): Promise<
    {
      slug: string;
      channel_id: string;
      github_repo: string | null;
      project_name: string | null;
    }[]
  >;
  /**
   * Returns the Discord ID of the team's current leader, or null if none is set.
   */
  getTeamLeader(team_slug: string): Promise<string | null>;
}
