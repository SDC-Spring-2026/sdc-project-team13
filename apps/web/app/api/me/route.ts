import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireWebUser } from "../../../lib/webAuth";
import { openWebDb } from "../../../lib/webDb";
import { tbl } from "../../../lib/physicalTables";

export const dynamic = "force-dynamic";

export async function GET() {
  loadEnvConfig(process.cwd());

  const { userId } = await requireWebUser();
  const conn = openWebDb();
  try {
    if (conn.driver === "postgres") {
      const r = await conn.pool.query(
        `SELECT discord, github FROM ${tbl("members")} WHERE discord = $1 LIMIT 1`,
        [userId]
      );
      const row = r.rows[0] as { discord: string; github: string | null } | undefined;
      return NextResponse.json({
        discordId: userId,
        github: row?.github ?? null,
        registered: Boolean(row)
      });
    }

    const row = conn.db
      .prepare(`SELECT discord, github FROM ${tbl("members")} WHERE discord = ? LIMIT 1`)
      .get(userId) as { discord: string; github: string | null } | undefined;
    return NextResponse.json({
      discordId: userId,
      github: row?.github ?? null,
      registered: Boolean(row)
    });
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

