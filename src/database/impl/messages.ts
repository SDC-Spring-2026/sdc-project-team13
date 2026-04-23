import { DatabaseMessagesManager, Message } from "../defs/messages";
import { driver } from "../driver";
import { tbl } from "../physicalTables";

export const db_messages: DatabaseMessagesManager = {
  async getMessageCount(team_slug) {
    const H = tbl("messageHistory");
    const rows = await driver().query<{ count: string | number }>(
      `SELECT COUNT(*) AS count FROM ${H} WHERE team_slug = ?`,
      [team_slug]
    );
    return Number(rows[0].count);
  },

  async getAllTeamMessages(team_slug) {
    const H = tbl("messageHistory");
    return driver().query<Message>(
      `SELECT team_slug, user_id, timestamp, scope, content FROM ${H} WHERE team_slug = ? ORDER BY timestamp`,
      [team_slug]
    );
  },

  async getRecentTeamMessages(team_slug, limit) {
    const H = tbl("messageHistory");
    const cap = Math.max(1, Math.min(200, Math.floor(limit)));
    return driver().query<Message>(
      `SELECT team_slug, user_id, timestamp, scope, content FROM ${H} WHERE team_slug = ? ORDER BY id DESC LIMIT ?`,
      [team_slug, cap]
    );
  },

  async getAllUserMessages(user_id) {
    const H = tbl("messageHistory");
    return driver().query<Message>(
      `SELECT team_slug, user_id, timestamp, scope, content FROM ${H} WHERE user_id = ?`,
      [user_id]
    );
  },

  async storeMessage(team_slug, user_id, timestamp, scope, content) {
    const H = tbl("messageHistory");
    await driver().query(
      `INSERT INTO ${H} (team_slug, user_id, timestamp, scope, content) VALUES (?, ?, ?, ?, ?)`,
      [team_slug, user_id, timestamp, scope, content]
    );
    return true;
  },

  async purgeTeamMessages(team_slug) {
    const H = tbl("messageHistory");
    await driver().query(`DELETE FROM ${H} WHERE team_slug = ?`, [team_slug]);
  }
};
