import { DatabaseMessagesManager } from "../defs/messages";
import { sql } from "./conf";
import { Message } from "../defs/messages";

export const db_messages: DatabaseMessagesManager = {
  getMessageCount(team_slug) {
    return new Promise((resolve, reject) => {
      try {
        // Count messages for the specified team
        const result = sql
          .prepare(
            "SELECT COUNT(*) as count FROM MessageHistory WHERE team_slug = ?"
          )
          .get(team_slug) as { count: number };
        resolve(result.count);
      } catch (error) {
        reject(error);
      }
    });
  },
  getAllTeamMessages(team_slug) {
    return new Promise((resolve, reject) => {
      try {
        // Retrieve all messages for the team, ordered by timestamp
        const stmt = sql.prepare(
          "SELECT team_slug, user_id, timestamp, scope, content FROM MessageHistory WHERE team_slug = ? ORDER BY timestamp"
        );
        const results = stmt.all(team_slug) as Message[];
        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
  },
  getAllUserMessages(user_id) {
    return new Promise((resolve, reject) => {
      try {
        // Retrieve all messages from the user
        const stmt = sql.prepare(
          "SELECT team_slug, user_id, timestamp, scope, content FROM MessageHistory WHERE user_id = ?"
        );
        const results = stmt.all(user_id) as Message[];
        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
  },
  storeMessage(team_slug, user_id, timestamp, scope, content) {
    return new Promise((resolve, reject) => {
      try {
        // Insert the new message into the database
        sql
          .prepare(
            "INSERT INTO MessageHistory (team_slug, user_id, timestamp, scope, content) VALUES (?, ?, ?, ?, ?)"
          )
          .run(team_slug, user_id, timestamp, scope, content);
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  },
  purgeTeamMessages(team_slug) {
    return new Promise((resolve, reject) => {
      try {
        // Delete all messages for the team
        sql
          .prepare("DELETE FROM MessageHistory WHERE team_slug = ?")
          .run(team_slug);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
};
