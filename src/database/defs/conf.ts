export interface DatabaseConfManager {
  // CONFIGURATION

  /**
   * Checks if the database is ready for operations.
   * @returns A boolean that signifies if the database is ready or not.
   */
  isReady(): boolean;

  /**
   * Setup the tables on the database that we want to use. Should only be run in init cycle!!
   */
  setup(): Promise<void>;

  /**
   * Initiates the database with whatever it needs to be ready.
   */
  initiate(): Promise<void>;

  /**
   * Closes the database connection, back to state before initiate was called.
   */
  close(): Promise<void>;

  /**
   * Get the underlying database handler, for experienced users. Currently `better-sqlite3.Database`
   * but subject to change... B)
   */
  getRawDBInstance(): unknown;
}
