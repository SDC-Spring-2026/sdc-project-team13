import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireWebAdmin } from "../../../../lib/adminAuth";
import { openWebDb } from "../../../../lib/webDb";
import { tbl } from "../../../../lib/physicalTables";

export const dynamic = "force-dynamic";

export async function GET() {
  loadEnvConfig(process.cwd());
  const { userId, isAdmin, isPresident } = await requireWebAdmin();

  const required = [
    "DISCORD_TOKEN",
    "DISCORD_GUILD_ID",
    "DISCORD_ADMIN_ROLE_IDS",
    "DISCORD_PRESIDENT_ROLE_IDS",
    "GEMINI_API_KEY"
  ];
  const missing = required.filter((k) => !process.env[k]);

  // Quick DB reachability check
  const conn = openWebDb();
  try {
    const T = tbl("teams");
    if (conn.driver === "postgres") {
      await conn.pool.query(`SELECT COUNT(*)::int AS c FROM ${T}`);
    } else {
      conn.db.prepare(`SELECT COUNT(*) AS c FROM ${T}`).get();
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `DB check failed: ${String(e)}` },
      { status: 500 }
    );
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }

  return NextResponse.json({
    ok: missing.length === 0,
    missing,
    userId,
    isAdmin,
    isPresident
  });
}
