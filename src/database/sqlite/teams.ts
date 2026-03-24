import { DatabaseTeamsManager } from "../defs/teams";

export const db_teams: DatabaseTeamsManager = {
  getNumberOfTeams(term) {
    return new Promise((resolve, reject) => {});
  },
  getTeamProjects(team_slug) {
    return new Promise((resolve, reject) => {});
  },
  requestNewTeamID() {
    return new Promise((resolve, reject) => {});
  },
  finalizeNewTeam(team_slug, channel_id, role_id, leader_id) {
    return new Promise((resolve, reject) => {});
  },
  updateTeamActive(team_slug, is_active) {
    return new Promise((resolve, reject) => {});
  },
  deleteTeam(team_slug) {
    return new Promise((resolve, reject) => {});
  }
};
