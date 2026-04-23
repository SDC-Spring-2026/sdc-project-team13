import { Pool } from "pg";
import { dbLogger as logger } from "..";
import { alreadyClosedError, alreadyOpenError, noOpWhileClosedError } from "../errors";
import { tbl } from "../physicalTables";
import { Driver } from ".";

let pool: Pool;
let ready = false;

/** Convert `?` placeholders to PostgreSQL-style `$1, $2, ...`. */
function pgSQL(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export const postgresDriver: Driver = {
  isReady: () => ready,

  getRawDBInstance: () => pool,

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await pool.query(pgSQL(sql), params);
    return result.rows as T[];
  },

  async initiate() {
    logger.info("Initiating PostgreSQL database...");
    if (ready) throw alreadyOpenError();

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("SELECT 1");

    logger.info("PostgreSQL ready!");
    ready = true;
  },

  async setup() {
    if (!ready) throw noOpWhileClosedError();
    logger.verbose("Creating tables if they dont exist...");

    const M = tbl("members");
    const T = tbl("teams");
    const A = tbl("teamAssociations");
    const P = tbl("projects");
    const H = tbl("messageHistory");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${M} (
        discord TEXT PRIMARY KEY NOT NULL,
        github  TEXT UNIQUE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${T} (
        slug       TEXT    PRIMARY KEY NOT NULL,
        role_id    TEXT,
        channel_id TEXT,
        is_active  BOOLEAN NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${A} (
        id         SERIAL  PRIMARY KEY,
        user_id    TEXT    NOT NULL,
        team_slug  TEXT    NOT NULL,
        perm_level INTEGER NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${P} (
        slug      TEXT    PRIMARY KEY NOT NULL,
        name      TEXT    NOT NULL,
        team_slug TEXT    NOT NULL,
        is_active BOOLEAN NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${H} (
        id        SERIAL PRIMARY KEY,
        team_slug TEXT,
        user_id   TEXT,
        scope     TEXT,
        timestamp TEXT,
        content   TEXT
      )
    `);

    await pool.query(
      `ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS role_id TEXT`
    );
    await pool.query(
      `ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS channel_id TEXT`
    );
    await pool.query(
      `ALTER TABLE ${T} ADD COLUMN IF NOT EXISTS github_repo TEXT`
    );

    logger.verbose("Tables ready.");
  },

  async close() {
    logger.info("Closing PostgreSQL database...");
    if (!ready) throw alreadyClosedError();

    await pool.end();
    ready = false;
  }
};
