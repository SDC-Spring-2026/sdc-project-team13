import {
  DatabaseTeamAssocManager,
  TeamPermissionLevel
} from "../defs/team_assoc";
import { Member } from "../defs/members";
import { driver } from "../driver";
import { tbl } from "../physicalTables";
import { dbCache } from "../cache";

/** Invalidate all per-member and per-team association caches on any membership change. */
function invalidateAssoc(team_slug: string, discord_id: string) {
  dbCache.del(
    `il:${team_slug}:${discord_id}`,
    `ap:${team_slug}:${discord_id}`,
    `tl:${team_slug}`,
    `tls:${team_slug}`,
    `tm:${team_slug}`
  );
}

export const db_team_assoc: DatabaseTeamAssocManager = {
  async getTeamMembers(team_slug) {
    const cached = dbCache.get<Member[]>(`tm:${team_slug}`);
    if (cached) return cached;
    const A = tbl("teamAssociations");
    const result = (await driver().query<Member>(
      `SELECT user_id AS discord FROM ${A} WHERE team_slug = ?`,
      [team_slug]
    )) as unknown as Member[];
    dbCache.set(`tm:${team_slug}`, result);
    return result;
  },

  async isTeamLeader(team_slug, discord_id) {
    const cached = dbCache.get<boolean>(`il:${team_slug}:${discord_id}`);
    if (cached !== undefined) return cached;
    const A = tbl("teamAssociations");
    const rows = await driver().query<{ perm_level: number }>(
      `SELECT perm_level FROM ${A} WHERE team_slug = ? AND user_id = ?`,
      [team_slug, discord_id]
    );
    const result =
      rows.length > 0 && rows[0].perm_level === TeamPermissionLevel.LEADER;
    dbCache.set(`il:${team_slug}:${discord_id}`, result);
    return result;
  },

  async getTeamLeaders(team_slug) {
    const cached = dbCache.get<string[]>(`tls:${team_slug}`);
    if (cached) return cached;
    const A = tbl("teamAssociations");
    const rows = await driver().query<{ user_id: string }>(
      `SELECT user_id FROM ${A} WHERE team_slug = ? AND perm_level = ?`,
      [team_slug, TeamPermissionLevel.LEADER]
    );
    const result = rows.map((r) => r.user_id);
    dbCache.set(`tls:${team_slug}`, result);
    return result;
  },

  async addMemberToTeam(team_slug, discord_id, perm_level) {
    const A = tbl("teamAssociations");
    await driver().query(
      `INSERT INTO ${A} (user_id, team_slug, perm_level) VALUES (?, ?, ?)`,
      [discord_id, team_slug, perm_level]
    );
    invalidateAssoc(team_slug, discord_id);
  },

  async updateTeamMember(team_slug, discord_id, perm_level) {
    const A = tbl("teamAssociations");
    await driver().query(
      `UPDATE ${A} SET perm_level = ? WHERE team_slug = ? AND user_id = ?`,
      [perm_level, team_slug, discord_id]
    );
    invalidateAssoc(team_slug, discord_id);
  },

  async removeMemberFromTeam(team_slug, discord_id) {
    const A = tbl("teamAssociations");
    await driver().query(
      `DELETE FROM ${A} WHERE team_slug = ? AND user_id = ?`,
      [team_slug, discord_id]
    );
    invalidateAssoc(team_slug, discord_id);
  },

  async getMemberTeamPermission(team_slug, discord_id) {
    const cached = dbCache.get<TeamPermissionLevel | null>(
      `ap:${team_slug}:${discord_id}`
    );
    if (cached !== undefined) return cached;
    const A = tbl("teamAssociations");
    const rows = await driver().query<{ perm_level: number }>(
      `SELECT perm_level FROM ${A} WHERE team_slug = ? AND user_id = ?`,
      [team_slug, discord_id]
    );
    const v = rows[0]?.perm_level;
    const result =
      v === undefined || v === null
        ? null
        : v === TeamPermissionLevel.LEADER
          ? TeamPermissionLevel.LEADER
          : TeamPermissionLevel.MEMBER;
    dbCache.set(`ap:${team_slug}:${discord_id}`, result);
    return result;
  }
};
