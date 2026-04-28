export interface DatabaseBotConfigManager {
  /**
   * Get a config value by key, or null if missing.
   */
  getBotConfig(key: string): Promise<string | null>;
  /**
   * Set a config value (upsert). Use null to delete.
   */
  setBotConfig(key: string, value: string | null): Promise<void>;
}

