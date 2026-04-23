import Database, { type Database as SQLDatabase } from "better-sqlite3";
import { join } from "path";
import { dbLogger as logger } from "..";
import { alreadyClosedError, alreadyOpenError, noOpWhileClosedError } from "../errors";
import { Driver } from ".";

let sql: SQLDatabase;
let ready = false;

export const sqliteDriver: Driver = {
  isReady: () => ready,

  getRawDBInstance: () => sql,

  query<T = Record<string, unknown>>(sql_str: string, params: unknown[] = []): Promise<T[]> {
    // Convert boolean params to integers (SQLite has no native boolean).
    const converted = params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p));
    const rows = sql.prepare(sql_str).all(...converted) as T[];
    return Promise.resolve(rows);
  },

  initiate() {
    return new Promise((resolve, reject) => {
      logger.info("Initiating SQLite database...");
      if (ready) return reject(alreadyOpenError());

      sql = new Database(join(process.cwd(), "./test.sqlite"));
      sql.pragma("journal_mode = WAL");

      logger.info("SQLite ready!");
      ready = true;
      resolve();
    });
  },

  async setup() {
    if (!ready) throw noOpWhileClosedError();
    logger.verbose("Creating tables if they dont exist...");

    sql.prepare(`
      CREATE TABLE IF NOT EXISTS Members (
        discord TEXT PRIMARY KEY NOT NULL,
        github  TEXT UNIQUE
      )
    `).run();

    sql.prepare(`
      CREATE TABLE IF NOT EXISTS Teams (
        slug       TEXT    PRIMARY KEY NOT NULL,
        role_id    TEXT,
        channel_id TEXT,
        is_active  INTEGER NOT NULL
      )
    `).run();

    sql.prepare(`
      CREATE TABLE IF NOT EXISTS TeamAssociations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    TEXT    NOT NULL,
        team_slug  TEXT    NOT NULL,
        perm_level INTEGER NOT NULL
      )
    `).run();

    sql.prepare(`
      CREATE TABLE IF NOT EXISTS Projects (
        slug      TEXT    PRIMARY KEY NOT NULL,
        name      TEXT    NOT NULL,
        team_slug TEXT    NOT NULL,
        is_active INTEGER NOT NULL
      )
    `).run();

    try {
      sql.prepare("ALTER TABLE Teams ADD COLUMN github_repo TEXT").run();
    } catch {
      // Column already exists — safe to ignore
    }

    sql.prepare(`
      CREATE TABLE IF NOT EXISTS MessageHistory (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        team_slug TEXT,
        user_id   TEXT,
        scope     TEXT,
        timestamp TEXT,
        content   TEXT
      )
    `).run();

    logger.verbose("Tables ready.");
  },

  close() {
    return new Promise((resolve, reject) => {
      logger.info("Closing SQLite database...");
      if (!ready) return reject(alreadyClosedError());

      sql.close();
      ready = false;
      resolve();
    });
  }
};
