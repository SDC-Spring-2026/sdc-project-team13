import { DatabaseMessagesManager } from "../defs/messages";

export const db_messages: DatabaseMessagesManager = {
  getAllTeamMessages(team_slug) {
    return new Promise((resolve, reject) => {});
  },
  getAllUserMessages(user_id) {
    return new Promise((resolve, reject) => {});
  },
  getMessageCount(team_slug) {
    return new Promise((resolve, reject) => {});
  },
  storeMessage(team_slug, user_id, timestamp, scope, content) {
    return new Promise((resolve, reject) => {});
  },
  purgeTeamMessages(team_slug) {
    return new Promise((resolve, reject) => {});
  }
};
