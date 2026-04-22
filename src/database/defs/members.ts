import { Teams } from "./teams";

/** Information about a member. */
export interface Member {
  discord: string;
  github: string;
}

/** Database Manager parts for Members table. */
export interface DatabaseMembersManager {
  // MEMBERS

  /**
   * Gets a single member record by discord ID, or null if not registered.
   * @param discord_id Their discord user id.
   */
  getMember(discord_id: string): Promise<Member | null>;
  /**
   * Gets all active teams that a member is associated with.
   * @param discord_id Their discord user id.
   * @param include_inactive If this list should include teams that are now inactive.
   * @returns A list of team slugs that this user is associated with.
   */
  getMemberTeams(
    discord_id: string,
    include_inactive?: boolean
  ): Promise<Teams[]>;
  /**
   * Checks if a member is already registered to the db. Only **one** GitHub user can be assigned to
   * any **one** Discord account at one time, and vice versa. (**ONE-ONE**)
   * @param discord_id Their discord user id.
   * @param github_user Their github username. Not required, but if not present won't have any way to associate between discord and github.
   * @returns If this discord user id and github user are not present yet.
   */
  validateMemberRegistration(
    discord_id: string,
    github_user?: string
  ): Promise<void>;
  /**
   * Registers a new member with SDC.
   * @param discord_id Their discord user id.
   * @param github_user Their github username. Not required, but if not present won't have any way to associate between discord and github.
   * @returns A copy of their discord user id. This is the primary reference to any member.
   */
  registerMember(discord_id: string, github_user?: string): Promise<void>;
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
  ): Promise<void>;
  /**
   * Unreigster a member from SDC.
   * @param discord_id Their discord user id.
   * @returns If the user was successfully removed from the database.
   */
  unregisterMember(discord_id: string): Promise<void>;
}
