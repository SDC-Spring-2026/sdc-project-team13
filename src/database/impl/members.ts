import { DatabaseMembersManager } from "../defs/members";
import { Teams } from "../defs/teams";
import { driver } from "../driver";

export const db_members: DatabaseMembersManager = {
  async getMemberTeams(discord, inactives) {
    const assocs = await driver().query<{ team_slug: string }>(
      "SELECT team_slug FROM TeamAssociations WHERE user_id = ?",
      [discord]
    );

    const teams = await Promise.all(
      assocs.map((row) =>
        driver()
          .query<Teams>("SELECT * FROM Teams WHERE slug = ?", [row.team_slug])
          .then((r) => r[0])
      )
    );

    const valid = teams.filter(Boolean) as Teams[];
    return inactives ? valid : valid.filter((t) => t.is_active);
  },

  async validateMemberRegistration(discord, github) {
    const rows = await driver().query(
      "SELECT 1 FROM Members WHERE discord = ? OR github = ?",
      [discord, github]
    );
    if (rows.length !== 0) {
      throw new Error("Entry exists for either discord/github account.");
    }
  },

  async registerMember(discord, github) {
    await driver().query(
      "INSERT INTO Members (discord, github) VALUES (?, ?)",
      [discord, github]
    );
  },

  async updateMemberRegistration(discord, github) {
    await driver().query(
      "UPDATE Members SET github = ? WHERE discord = ?",
      [github, discord]
    );
  },

  async unregisterMember(discord) {
    await driver().query("DELETE FROM Members WHERE discord = ?", [discord]);
  }
};
