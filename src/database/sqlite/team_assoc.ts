import { DatabaseTeamAssocManager } from "../defs/team_assoc";
import { sql } from "./conf";
import { Member } from "../defs/members";

export const db_team_assoc: DatabaseTeamAssocManager = {
  getTeamMembers(team_slug) {
      return new Promise((resolve, reject) => {
          try {
              const results = sql
                  .prepare("SELECT user_id as discord FROM TeamAssociations WHERE team_slug = ?")
                  .all(team_slug) as { discord: string }[];
              resolve(results as any);
          } catch (error) {
              reject(error);
          }
      });
  },
  addMemberToTeam(team_slug, discord_id, perm_level) {
    return new Promise((resolve, reject) => {
      try {
        // Insert new team association
        sql
          .prepare(
            "INSERT INTO TeamAssociations (user_id, team_slug, perm_level) VALUES (?, ?, ?)"
          )
          .run(discord_id, team_slug, perm_level);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  updateTeamMember(team_slug, discord_id, perm_level) {
    return new Promise((resolve, reject) => {
      try {
        // Update the permission level for the member in the team
        sql
          .prepare(
            "UPDATE TeamAssociations SET perm_level = ? WHERE team_slug = ? AND user_id = ?"
          )
          .run(perm_level, team_slug, discord_id);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  removeMemberFromTeam(team_slug, discord_id) {
    return new Promise((resolve, reject) => {
      try {
        // Remove the member from the team
        sql
          .prepare(
            "DELETE FROM TeamAssociations WHERE team_slug = ? AND user_id = ?"
          )
          .run(team_slug, discord_id);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
};
