import { DatabaseMembersManager, Member } from "../defs/members";
import { Teams } from "../defs/teams";
import { driver } from "../driver";
import { tbl } from "../physicalTables";

export const db_members: DatabaseMembersManager = {
  async getMember(discord) {
    const M = tbl("members");
    const rows = await driver().query<Member>(
      `SELECT * FROM ${M} WHERE discord = ?`,
      [discord]
    );
    return rows[0] ?? null;
  },

  async getMemberTeams(discord, inactives) {
    const A = tbl("teamAssociations");
    const T = tbl("teams");
    const assocs = await driver().query<{ team_slug: string }>(
      `SELECT team_slug FROM ${A} WHERE user_id = ?`,
      [discord]
    );

    const teams = await Promise.all(
      assocs.map((row) =>
        driver()
          .query<Teams>(`SELECT * FROM ${T} WHERE slug = ?`, [row.team_slug])
          .then((r) => r[0])
      )
    );

    const valid = teams.filter(Boolean) as Teams[];
    return inactives ? valid : valid.filter((t) => t.is_active);
  },

  async validateMemberRegistration(discord, github) {
    const M = tbl("members");
    const rows = await driver().query(
      `SELECT 1 FROM ${M} WHERE discord = ? OR github = ?`,
      [discord, github]
    );
    if (rows.length !== 0) {
      throw new Error("Entry exists for either discord/github account.");
    }
  },

  async registerMember(discord, github) {
    const M = tbl("members");
    await driver().query(`INSERT INTO ${M} (discord, github) VALUES (?, ?)`, [
      discord,
      github
    ]);
  },

  async updateMemberRegistration(discord, github) {
    const M = tbl("members");
    await driver().query(`UPDATE ${M} SET github = ? WHERE discord = ?`, [
      github,
      discord
    ]);
  },

  async unregisterMember(discord) {
    const M = tbl("members");
    await driver().query(`DELETE FROM ${M} WHERE discord = ?`, [discord]);
  },

  async getMemberGithub(discord) {
    const M = tbl("members");
    const rows = await driver().query<{ github: string | null }>(
      `SELECT github FROM ${M} WHERE discord = ?`,
      [discord]
    );
    const g = rows[0]?.github;
    return g && g.length > 0 ? g : null;
  }
};
