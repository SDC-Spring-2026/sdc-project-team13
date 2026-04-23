import { loadEnvConfig } from "@next/env";
import Database from "better-sqlite3";
import {
  snapshotTableKeys,
  tablePrefix,
  tbl,
  tblUnquoted
} from "../../../../lib/physicalTables";
import { NextResponse } from "next/server";
import { join } from "path";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

function prodBlock() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DB_INSPECTOR !== "true"
  ) {
    return NextResponse.json(
      {
        error:
          "DB inspector is disabled in production. Use development, or set ALLOW_DB_INSPECTOR=true (still read-only)."
      },
      { status: 403 }
    );
  }
  return null;
}

export async function GET() {
  const blocked = prodBlock();
  if (blocked) return blocked;

  loadEnvConfig(process.cwd());

  try {
    if (process.env.DATABASE_URL) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      try {
        const out: Record<string, unknown[]> = {};
        for (const key of snapshotTableKeys()) {
          const label = tblUnquoted(key);
          try {
            const r = await pool.query(`SELECT * FROM ${tbl(key)} LIMIT 500`);
            out[label] = r.rows;
          } catch (e) {
            out[label] = [
              {
                _error: String(e),
                _hint:
                  "Wrong tables? Point DATABASE_URL at CacheBot. On a shared DB use CACHE_DB_USE_ISOLATED_TABLES=1 or CACHE_DB_TABLE_PREFIX."
              }
            ];
          }
        }
        return NextResponse.json({
          driver: "postgres",
          tablePrefix: tablePrefix(),
          tables: out
        });
      } finally {
        await pool.end();
      }
    }

    const dbPath = join(process.cwd(), "test.sqlite");
    const sql = new Database(dbPath, { readonly: true, fileMustExist: false });
    try {
      const out: Record<string, unknown[]> = {};
      for (const key of snapshotTableKeys()) {
        const label = tblUnquoted(key);
        try {
          const rows = sql.prepare(`SELECT * FROM ${tbl(key)} LIMIT 500`).all();
          out[label] = rows as unknown[];
        } catch (e) {
          out[label] = [{ _error: String(e) }];
        }
      }
      return NextResponse.json({
        driver: "sqlite",
        path: dbPath,
        tablePrefix: tablePrefix(),
        tables: out
      });
    } finally {
      sql.close();
    }
  } catch (e) {
    return NextResponse.json(
      { error: String(e), cwd: process.cwd() },
      { status: 500 }
    );
  }
}
