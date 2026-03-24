import { DatabaseTeamAssocManager } from "../defs/team_assoc";

export const db_team_assoc: DatabaseTeamAssocManager = {
  getTeamMembers(team_slug) {
    return new Promise((resolve, reject) => {});
  },
  addMemberToTeam(team_slug, discord_id, perm_level) {
    return new Promise((resolve, reject) => {});
  },
  updateTeamMember(team_slug, discord_id, perm_level) {
    return new Promise((resolve, reject) => {});
  },
  removeMemberFromTeam(team_slug, discord_id) {
    return new Promise((resolve, reject) => {});
  }
};
