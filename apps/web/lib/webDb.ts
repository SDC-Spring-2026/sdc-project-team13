import Database from "better-sqlite3";
import { createHash, randomBytes } from "crypto";
import { join } from "path";
import { Pool } from "pg";

export type DbDriver = "postgres" | "sqlite";

type SqliteConn = { driver: "sqlite"; db: Database.Database; close: () => void };
type PgConn = { driver: "postgres"; pool: Pool; close: () => Promise<void> };

export type WebDbConn = SqliteConn | PgConn;

export function openWebDb(): WebDbConn {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return { driver: "postgres", pool, close: async () => pool.end() };
  }
  const dbPath = join(process.cwd(), "test.sqlite");
  const db = new Database(dbPath, { fileMustExist: false });
  return { driver: "sqlite", db, close: () => db.close() };
}

function webSessionTableName(): string {
  // Keep sessions isolated when bot tables are prefixed.
  const prefix =
    process.env.CACHE_DB_TABLE_PREFIX?.trim() ||
    (process.env.CACHE_DB_USE_ISOLATED_TABLES === "1"
      ? process.env.CACHE_DB_ISOLATED_PREFIX?.trim() || "cache_team13"
      : "");
  const safe = (prefix ?? "").trim().match(/^[a-zA-Z][a-zA-Z0-9_]*$/) ? prefix!.trim() : "";
  const base = "websessions";
  if (!safe) return base;
  return `${safe}_${base}`;
}

export async function ensureWebSessionTable(conn: WebDbConn): Promise<void> {
  const table = webSessionTableName();
  if (conn.driver === "postgres") {
    await conn.pool.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    return;
  }
  conn.db
    .prepare(
      `CREATE TABLE IF NOT EXISTS "${table}" (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    )
    .run();
}

export function newSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function insertSession(
  conn: WebDbConn,
  opts: { tokenHash: string; userId: string; expiresAt: Date }
): Promise<void> {
  const table = webSessionTableName();
  if (conn.driver === "postgres") {
    await conn.pool.query(
      `INSERT INTO ${table} (id, user_id, expires_at) VALUES ($1, $2, $3)`,
      [opts.tokenHash, opts.userId, opts.expiresAt]
    );
    return;
  }
  conn.db
    .prepare(
      `INSERT INTO "${table}" (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
    )
    .run(
      opts.tokenHash,
      opts.userId,
      opts.expiresAt.toISOString(),
      new Date().toISOString()
    );
}

export async function deleteSession(conn: WebDbConn, tokenHash: string): Promise<void> {
  const table = webSessionTableName();
  if (conn.driver === "postgres") {
    await conn.pool.query(`DELETE FROM ${table} WHERE id = $1`, [tokenHash]);
    return;
  }
  conn.db.prepare(`DELETE FROM "${table}" WHERE id = ?`).run(tokenHash);
}

export async function getSessionUserId(
  conn: WebDbConn,
  tokenHash: string
): Promise<{ userId: string; expiresAt: Date } | null> {
  const table = webSessionTableName();
  if (conn.driver === "postgres") {
    const r = await conn.pool.query(
      `SELECT user_id, expires_at FROM ${table} WHERE id = $1 LIMIT 1`,
      [tokenHash]
    );
    const row = r.rows[0] as { user_id: string; expires_at: string } | undefined;
    if (!row) return null;
    return { userId: row.user_id, expiresAt: new Date(row.expires_at) };
  }
  const row = conn.db
    .prepare(`SELECT user_id as userId, expires_at as expiresAt FROM "${table}" WHERE id = ? LIMIT 1`)
    .get(tokenHash) as { userId: string; expiresAt: string } | undefined;
  if (!row) return null;
  return { userId: row.userId, expiresAt: new Date(row.expiresAt) };
}

