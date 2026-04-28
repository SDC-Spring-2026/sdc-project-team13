import { DatabaseTeamAssocManager, TeamPermissionLevel } from "../defs/team_assoc";
import { Member } from "../defs/members";
import { driver } from "../driver";
import { tbl } from "../physicalTables";

export const db_team_assoc: DatabaseTeamAssocManager = {
  async getTeamMembers(team_slug) {
    const A = tbl("teamAssociations");
    return driver().query<Member>(
      `SELECT user_id AS discord FROM ${A} WHERE team_slug = ?`,
      [team_slug]
    ) as unknown as Promise<Member[]>;
  },

  async isTeamLeader(team_slug, discord_id) {
    const A = tbl("teamAssociations");
    const rows = await driver().query<{ perm_level: number }>(
      `SELECT perm_level FROM ${A} WHERE team_slug = ? AND user_id = ?`,
      [team_slug, discord_id]
    );
    return rows.length > 0 && rows[0].perm_level === TeamPermissionLevel.LEADER;
  },

  async getTeamLeaders(team_slug) {
    const A = tbl("teamAssociations");
    const rows = await driver().query<{ user_id: string }>(
      `SELECT user_id FROM ${A} WHERE team_slug = ? AND perm_level = ?`,
      [team_slug, TeamPermissionLevel.LEADER]
    );
    return rows.map(r => r.user_id);
  },

  async addMemberToTeam(team_slug, discord_id, perm_level) {
    const A = tbl("teamAssociations");
    await driver().query(
      `INSERT INTO ${A} (user_id, team_slug, perm_level) VALUES (?, ?, ?)`,
      [discord_id, team_slug, perm_level]
    );
  },

  async updateTeamMember(team_slug, discord_id, perm_level) {
    const A = tbl("teamAssociations");
    await driver().query(
      `UPDATE ${A} SET perm_level = ? WHERE team_slug = ? AND user_id = ?`,
      [perm_level, team_slug, discord_id]
    );
  },

  async removeMemberFromTeam(team_slug, discord_id) {
    const A = tbl("teamAssociations");
    await driver().query(
      `DELETE FROM ${A} WHERE team_slug = ? AND user_id = ?`,
      [team_slug, discord_id]
    );
  },

  async getMemberTeamPermission(team_slug, discord_id) {
    const A = tbl("teamAssociations");
    const rows = await driver().query<{ perm_level: number }>(
      `SELECT perm_level FROM ${A} WHERE team_slug = ? AND user_id = ?`,
      [team_slug, discord_id]
    );
    const v = rows[0]?.perm_level;
    if (v === undefined || v === null) return null;
    return v === TeamPermissionLevel.LEADER
      ? TeamPermissionLevel.LEADER
      : TeamPermissionLevel.MEMBER;
  }
};
