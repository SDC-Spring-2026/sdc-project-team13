// Import sqlite3 module, database struct, and path join.
import Database, { type Database as SQLDatabase } from "better-sqlite3";
import { DatabaseManager, dbLogger as logger } from ".";
import { join } from "path";
import {
  alreadyClosedError,
  alreadyOpenError,
  noOpWhileClosedError
} from "./errors";

// This is the reference to the current database instance.
let sql: SQLDatabase;

// This variable keeps track of the ready state of the db.
// (i.e. is a current connection open or nah)
let ready = false;

// Export the proper tools
export const db: DatabaseManager = {
  // Return the sqlite3 instance.
  getRawInstance() {
    return sql;
  },

  // Return whatever ready is at this time.
  isReady() {
    return ready;
  },

  // Setup the tables from this database.
  setup() {
    // Check DB is open.
    if (!this.isReady()) throw noOpWhileClosedError();

    // Create projects table if not exist.
    logger.verbose('Creating "Projects" table if it does not exist...');
    sql
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS Projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          team INTEGER
        )
        `
      )
      .run();

    // Create members table if not exist.
    logger.verbose('Creating "Members" table if it does not exist...');
    sql
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS Members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          team INTEGER,
          role TEXT
        )
        `
      )
      .run();
  },

  // Initiate db.
  initiate() {
    logger.info("Initiating SQLite database...");

    // Check the global ready var for if closed.
    if (!ready) {
      // Create new instance, should boot automatically, but checking just to be sure...
      sql = new Database(join(process.cwd(), "./test.sqlite"));
      sql.pragma("journal_mode = WAL");

      logger.info("SQLite ready!");
      ready = true;
    } else {
      // Table was already open.
      throw alreadyOpenError();
    }
  },

  close() {
    logger.info("Closing SQLite database...");

    // Check if open, then close
    if (ready) {
      sql.close();
      ready = false;
    } else {
      // Table was not open in the first place.
      throw alreadyClosedError();
    }
  },

  // Return the underlying database so we can get to work!
  getRawDatabase() {
    return sql;
  }
};
