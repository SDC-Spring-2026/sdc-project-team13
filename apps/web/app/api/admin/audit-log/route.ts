import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireWebAdmin } from "../../../../lib/adminAuth";
import { openWebDb } from "../../../../lib/webDb";
import { tbl } from "../../../../lib/physicalTables";

export const dynamic = "force-dynamic";

const KEY = "audit_log_channel_id";

export async function GET() {
  loadEnvConfig(process.cwd());
  await requireWebAdmin();

  const conn = openWebDb();
  try {
    const C = tbl("botConfig");
    if (conn.driver === "postgres") {
      const r = await conn.pool.query(`SELECT value FROM ${C} WHERE key = $1 LIMIT 1`, [KEY]);
      const row = r.rows[0] as { value: string | null } | undefined;
      return NextResponse.json({ channelId: row?.value ?? null });
    }
    const row = conn.db
      .prepare(`SELECT value FROM ${C} WHERE key = ? LIMIT 1`)
      .get(KEY) as { value: string | null } | undefined;
    return NextResponse.json({ channelId: row?.value ?? null });
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

export async function POST(request: Request) {
  loadEnvConfig(process.cwd());
  await requireWebAdmin();
  const body = (await request.json().catch(() => null)) as { channelId?: string | null } | null;
  const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : "";

  const conn = openWebDb();
  try {
    const C = tbl("botConfig");
    if (!channelId) {
      if (conn.driver === "postgres") {
        await conn.pool.query(`DELETE FROM ${C} WHERE key = $1`, [KEY]);
      } else {
        conn.db.prepare(`DELETE FROM ${C} WHERE key = ?`).run(KEY);
      }
      return NextResponse.json({ ok: true, channelId: null });
    }
    if (conn.driver === "postgres") {
      await conn.pool.query(
        `INSERT INTO ${C} (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [KEY, channelId]
      );
    } else {
      conn.db
        .prepare(
          `INSERT INTO ${C} (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        )
        .run(KEY, channelId);
    }
    return NextResponse.json({ ok: true, channelId });
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

