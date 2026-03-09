// Create logger
import { createNewLogger } from "../tools/log";
export const dbLogger = createNewLogger("db");

/**
 * Interface for a connected database, defines all of the methods we might need to access.
 * @param <T> The data type that defines the internal database manager.
 */
export interface DatabaseManager {
  /**
   * Gets the raw instance of the backend database, use wisely!
   * @returns An unknown instance of whatever underlying tool powers the database. (Could be sqlite, etc.)
   */
  getRawInstance(): unknown;

  /**
   * Checks if the database is ready for operations.
   * @returns A boolean that signifies if the database is ready or not.
   */
  isReady(): boolean;

  /**
   * Initiates the database with whatever it needs to be ready.
   */
  initiate(): void;

  /**
   * Closes the database connection, back to state before initiate was called.
   */
  close(): void;
}

// Export the database tool we want to use.
export * from "./sqlite";
