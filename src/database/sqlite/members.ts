import { DatabaseMembersManager } from "../defs/members";
import { TeamAssociations } from "../defs/team_assoc";
import { Teams } from "../defs/teams";
import { sql } from "./conf";

export const db_members: DatabaseMembersManager = {
  // Members

  // Get member teams
  getMemberTeams(discord, inactives) {
    return new Promise((resolve, reject) => {
      // Get all team associations.
      const team_assocs = sql
        .prepare<
          {},
          TeamAssociations
        >("SELECT * FROM TeamAssociations WHERE user_id = @discord")
        .all({ discord });

      // Get actual teams
      const teams = <Teams[]>(
        team_assocs.map((asc) =>
          sql
            .prepare<{}, Teams>("SELECT * FROM Teams WHERE slug = @slug")
            .get({ slug: asc.team_slug })
        )
      );

      // If include inactive, a bit different.
      if (inactives) {
        resolve(teams);
      } else {
        resolve(teams.filter((tm) => tm.is_active));
      }
    });
  },

  // Validate registration
  validateMemberRegistration(discord, github) {
    return new Promise((resolve, reject) => {
      const n = sql
        .prepare(
          "SELECT * FROM Members WHERE discord = @discord OR github = @github"
        )
        .all({ discord, github });

      if (n.length != 0) {
        reject(new Error("Entry exists for either discord/github account."));
      } else {
        resolve();
      }
    });
  },

  // Register member.
  registerMember(discord, github) {
    return new Promise((resolve, reject) => {
      sql
        .prepare(
          "INSERT INTO Members (discord, github) VALUES (@discord, @github)"
        )
        .run({ discord, github });

      resolve();
    });
  },

  // Update member registration.
  updateMemberRegistration(discord, github) {
    return new Promise((resolve, reject) => {});
  },

  // Unregister member.
  unregisterMember(discord_id) {
    return new Promise((resolve, reject) => {});
  }
};
