// Create logger
import { createNewLogger } from "../tools/log";
import { TermIdentifier } from "../tools/slug";
export const dbLogger = createNewLogger("db");

/** Information about a member. */
interface Member {
  /** A member's discord id. */
  discord: string;
  /** A member's github username. */
  github: string;
}

/** Information about a project. */
interface Project {
  slug: string;
  name: string;
  team_slug: string;
  is_active: string;
}

/** A saved message in the database. */
interface Message {
  id: number;
  team_slug: string;
  user_id: string;
  timestamp: string;
  scope: string;
  content: string;
}

/** The permission level for any team member. */
enum TeamPermissionLevel {
  MEMBER,
  LEADER
}

/**
 * Interface for a connected database, defines all of the methods we might need to access.
 */
export interface DatabaseManager {
  // CONFIGURATION

  /**
   * Checks if the database is ready for operations.
   * @returns A boolean that signifies if the database is ready or not.
   */
  isReady(): boolean;

  /**
   * Setup the tables on the database that we want to use. Should only be run in init cycle!!
   */
  setup(): Promise<void>;

  /**
   * Initiates the database with whatever it needs to be ready.
   */
  initiate(): Promise<void>;

  /**
   * Closes the database connection, back to state before initiate was called.
   */
  close(): Promise<void>;

  /**
   * Get the underlying database handler, for experienced users. Currently `better-sqlite3.Database`
   * but subject to change... B)
   */
  getRawDBInstance(): unknown;

  // MEMBERS

  /**
   * Gets all active teams that a member is associated with.
   * @param discord_id Their discord user id.
   * @param include_inactive If this list should include teams that are now inactive.
   * @returns A list of team slugs that this user is associated with.
   */
  getMemberTeams(
    discord_id: string,
    include_inactive?: boolean
  ): Promise<string[]>;
  /**
   * Checks if a member is already registered to the db. Only **one** GitHub user can be assigned to
   * any **one** Discord account at one time, and vice versa. (**ONE-ONE**)
   * @param discord_id Their discord user id.
   * @param github_user Their github username. Not required, but if not present won't have any way to associate between discord and github.
   * @returns If this discord user id and github user are not present yet.
   */
  validateRegistration(discord_id: string, github_user?: string): Promise<void>;
  /**
   * Registers a new member with SDC.
   * @param discord_id Their discord user id.
   * @param github_user Their github username. Not required, but if not present won't have any way to associate between discord and github.
   * @returns A copy of their discord user id. This is the primary reference to any member.
   */
  registerMember(discord_id: string, github_user?: string): Promise<string>;
  /**
   * Updates a member's registration (what github account/if they have a github they are associated
   * with.)
   * @param discord_id Their discord user id.
   * @param github_user Their github username. Not required, but if not present won't have any way to associate between discord and github.
   * @returns A copy of their discord user id. This is the primary reference to any member.
   */
  updateMemberRegistration(
    discord_id: string,
    github_user?: string
  ): Promise<string>;
  /**
   * Unreigster a member from SDC.
   * @param discord_id Their discord user id.
   * @returns If the user was successfully removed from the database.
   */
  unregisterMember(discord_id: string): Promise<string>;

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

  // Team Associations

  /**
   * Get all members associated with a team.
   * @param team_slug The team slug id.
   * @returns A list of user records connected to this team.
   */
  getTeamMembers(team_slug: string): Promise<Member[]>;
  /**
   * Add a member to a team. A member can not be associated with a team more than once.
   * @param team_slug The team slug id.
   * @param discord_id Their discord user id.
   * @param perm_level The level of permission this member has.
   * @returns If this member was successfully added to team.
   */
  addMemberToTeam(
    team_slug: string,
    discord_id: string,
    perm_level: TeamPermissionLevel
  ): Promise<void>;
  /**
   * Update information about a team/member association.
   * @param team_slug The team slug id.
   * @param discord_id Their discord user id.
   * @param perm_level The level of permission to update them to.
   * @returns If this information was successfully updated.
   */
  updateTeamMember(
    team_slug: string,
    discord_id: string,
    perm_level: TeamPermissionLevel
  ): Promise<void>;
  /**
   * Remove a member from a team.
   * @param team_slug The team slug id.
   * @param discord_id Their discord user id.
   * @returns If the member was successfully removed from a team.
   */
  removeMemberFromTeam(team_slug: string, discord_id: string): Promise<void>;

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

  // Messages

  /**
   * Get number of messages associated with a team.
   * @param team_slug The team slug id.
   * @returns The number of saved messages.
   */
  getMessageCount(team_slug: string): Promise<number>;
  /**
   * Get all messages from a team.
   * @param team_slug A team slug id.
   * @returns A list of all messages from that team.
   */
  getAllTeamMessages(team_slug: string): Promise<Message[]>;
  /**
   * Get all messages from a user.
   * @param user_id The discord user id.
   * @returns A list of all messages from that user.
   */
  getAllUserMessages(user_id: string): Promise<Message[]>;
  /**
   * Store a new message in the database.
   * @param team_slug A team slug id to associate with this message.
   * @param user_id The user who sent the message.
   * @param timestamp The time the message was sent.
   * @param scope The scope of the message.
   * @param content The content of the message.
   * @returns If the message was stored.
   */
  storeMessage(
    team_slug: string,
    user_id: string,
    timestamp: string,
    scope: string,
    content: string
  ): Promise<boolean>;
  /**
   * Purge all messages from a team. Useful if condensing.
   * @param team_slug A team slug id.
   * @returns If the messages are successfully purged.
   */
  purgeTeamMessages(team_slug: string): Promise<void>;
}

// Export the database tool we want to use.
export * from "./sqlite";
