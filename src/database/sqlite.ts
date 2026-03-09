// Import sqlite3 module, database struct, and path join.
import { Database as SQLiteDatabase, verbose } from "sqlite3";
import { DatabaseManager, dbLogger as logger } from ".";
import { join } from "path";

// Enable verbose logging.
verbose();

// This is the reference to the current database instance.
let sql: SQLiteDatabase;

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

  // Initiate db.
  initiate() {
    logger.info("Initiating SQLite database...");

    // Check the global
    if (!ready) {
      // Create new instance, should boot automatically, but checking just to be sure...
      sql = new SQLiteDatabase(join(process.cwd(), "./test.sqlite"));
      sql.once("open", () => {
        logger.info("SQLite ready!");
        ready = true;
      });
    } else {
      throw new Error("Can not initiate database while currently open.");
    }
  },

  close() {
    logger.info("Closing SQLite database...");

    // Check if open, then close
    if (ready) {
      sql.close(() => {
        logger.info("Done!");
        ready = false;
      });
    } else {
      throw new Error("Can not close database while currently closed.");
    }
  }
};
