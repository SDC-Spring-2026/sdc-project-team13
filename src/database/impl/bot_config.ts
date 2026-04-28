import { driver } from "../driver";
import { tbl } from "../physicalTables";
import { DatabaseBotConfigManager } from "../defs/bot_config";

export const db_bot_config: DatabaseBotConfigManager = {
  async getBotConfig(key) {
    const C = tbl("botConfig");
    const rows = await driver().query<{ value: string | null }>(
      `SELECT value FROM ${C} WHERE key = ? LIMIT 1`,
      [key]
    );
    return rows[0]?.value ?? null;
  },

  async setBotConfig(key, value) {
    const C = tbl("botConfig");
    if (value === null) {
      await driver().query(`DELETE FROM ${C} WHERE key = ?`, [key]);
      return;
    }
    await driver().query(
      `INSERT INTO ${C} (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
  }
};

