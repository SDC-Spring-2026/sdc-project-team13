import { DatabaseTeamAssocManager, TeamPermissionLevel } from "../defs/team_assoc";
import { Member } from "../defs/members";
import { driver } from "../driver";

export const db_team_assoc: DatabaseTeamAssocManager = {
  async getTeamMembers(team_slug) {
    return driver().query<Member>(
      "SELECT user_id AS discord FROM TeamAssociations WHERE team_slug = ?",
      [team_slug]
    ) as unknown as Promise<Member[]>;
  },

  async isTeamLeader(team_slug, discord_id) {
    const rows = await driver().query<{ perm_level: number }>(
      "SELECT perm_level FROM TeamAssociations WHERE team_slug = ? AND user_id = ?",
      [team_slug, discord_id]
    );
    return rows.length > 0 && rows[0].perm_level === TeamPermissionLevel.LEADER;
  },

  async addMemberToTeam(team_slug, discord_id, perm_level) {
    await driver().query(
      "INSERT INTO TeamAssociations (user_id, team_slug, perm_level) VALUES (?, ?, ?)",
      [discord_id, team_slug, perm_level]
    );
  },

  async updateTeamMember(team_slug, discord_id, perm_level) {
    await driver().query(
      "UPDATE TeamAssociations SET perm_level = ? WHERE team_slug = ? AND user_id = ?",
      [perm_level, team_slug, discord_id]
    );
  },

  async removeMemberFromTeam(team_slug, discord_id) {
    await driver().query(
      "DELETE FROM TeamAssociations WHERE team_slug = ? AND user_id = ?",
      [team_slug, discord_id]
    );
  }
};
