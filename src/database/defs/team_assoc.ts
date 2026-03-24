import { Member } from "./members";

/** The permission level for any team member. */
export enum TeamPermissionLevel {
  MEMBER,
  LEADER
}
export interface TeamAssociations {
  user_id: string;
  team_slug: string;
  perm_level: TeamPermissionLevel;
}

/** Database Manager parts for TeamAssociations table. */
export interface DatabaseTeamAssocManager {
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
}
