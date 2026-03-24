// Import sqlite3 module, database struct, and path join.
import Database, { type Database as SQLDatabase } from "better-sqlite3";
import { dbLogger as logger } from "..";
import { join } from "path";
import {
  alreadyClosedError,
  alreadyOpenError,
  noOpWhileClosedError
} from "../errors";
import tables from "../tables.json";
import { DatabaseConfManager } from "../defs/conf";

// This is the reference to the current database instance.
export let sql: SQLDatabase;

// This variable keeps track of the ready state of the db.
// (i.e. is a current connection open or nah)
export let ready = false;

// Defines columns from the table generator file.
interface TableGenColumnOpts {
  is_primary: boolean;
  is_unique: boolean;
  not_null: boolean;
  auto_increment: boolean;
}
interface TableGenColumn {
  name: string;
  type: string;
  opts?: Partial<TableGenColumnOpts>;
}

export const db_conf: DatabaseConfManager = {
  // Return whatever ready is at this time.
  isReady() {
    return ready;
  },

  // Setup the tables from this database.
  setup() {
    return new Promise((resolve, reject) => {
      // Check DB is open.
      if (!this.isReady()) reject(noOpWhileClosedError());

      // Create projects table if not exist.
      logger.verbose("Creating tables if they dont exist...");

      // Helper function to create the column configuration options string.
      function createColOptsString(opts?: Partial<TableGenColumnOpts>): string {
        if (!opts) return "";

        const conf: string[] = [];

        // Just append the correct SQL options string.
        if (opts.auto_increment) conf.push("AUTOINCREMENT");
        if (opts.is_primary) conf.push("PRIMARY KEY");
        if (opts.is_unique) conf.push("UNIQUE");
        if (opts.not_null) conf.push("NOT NULL");

        return conf.join(" ");
      }

      // Helper function to create a SQL string to create a new table.
      function buildNewTableStatement(
        name: string,
        cols: TableGenColumn[]
      ): string {
        logger.verbose(`- Checking table "${name}"...`);

        // Save column def strings
        const col_str = cols
          .map((c) => `${c.name} ${c.type} ${createColOptsString(c.opts)}`)
          .join(",");

        // Create final statement.
        return `CREATE TABLE IF NOT EXISTS ${name} (${col_str})`;
      }

      // Create new tables.
      tables.forEach((tbl) => {
        sql.prepare(buildNewTableStatement(tbl.name, tbl.cols)).run();
      });

      resolve();
    });
  },

  // Initiate db.
  initiate() {
    return new Promise((resolve, reject) => {
      logger.info("Initiating SQLite database...");

      // Check the global ready var for if closed.
      if (!ready) {
        // Create new instance, should boot automatically, but checking just to be sure...
        sql = new Database(join(process.cwd(), "./test.sqlite"));
        sql.pragma("journal_mode = WAL");

        logger.info("SQLite ready!");
        ready = true;

        resolve();
      } else {
        // Table was already open.
        reject(alreadyOpenError());
      }
    });
  },

  close() {
    return new Promise((resolve, reject) => {
      logger.info("Closing SQLite database...");

      // Check if open, then close
      if (ready) {
        sql.close();
        ready = false;
        resolve();
      } else {
        // Table was not open in the first place.
        reject(alreadyClosedError());
      }
    });
  },

  // Return the underlying database so we can get to work!
  getRawDBInstance() {
    return sql;
  }
};
