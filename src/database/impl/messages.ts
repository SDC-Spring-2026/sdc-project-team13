import { DatabaseMessagesManager, Message } from "../defs/messages";
import { driver } from "../driver";

export const db_messages: DatabaseMessagesManager = {
  async getMessageCount(team_slug) {
    const rows = await driver().query<{ count: string | number }>(
      "SELECT COUNT(*) AS count FROM MessageHistory WHERE team_slug = ?",
      [team_slug]
    );
    return Number(rows[0].count);
  },

  async getAllTeamMessages(team_slug) {
    return driver().query<Message>(
      "SELECT team_slug, user_id, timestamp, scope, content FROM MessageHistory WHERE team_slug = ? ORDER BY timestamp",
      [team_slug]
    );
  },

  async getAllUserMessages(user_id) {
    return driver().query<Message>(
      "SELECT team_slug, user_id, timestamp, scope, content FROM MessageHistory WHERE user_id = ?",
      [user_id]
    );
  },

  async storeMessage(team_slug, user_id, timestamp, scope, content) {
    await driver().query(
      "INSERT INTO MessageHistory (team_slug, user_id, timestamp, scope, content) VALUES (?, ?, ?, ?, ?)",
      [team_slug, user_id, timestamp, scope, content]
    );
    return true;
  },

  async purgeTeamMessages(team_slug) {
    await driver().query(
      "DELETE FROM MessageHistory WHERE team_slug = ?",
      [team_slug]
    );
  }
};
