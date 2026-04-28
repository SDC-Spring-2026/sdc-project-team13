import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireWebUser } from "../../../lib/webAuth";
import { openWebDb } from "../../../lib/webDb";
import { tbl } from "../../../lib/physicalTables";

export const dynamic = "force-dynamic";

type TeamRow = {
  slug: string;
  role_id: string | null;
  channel_id: string | null;
  is_active: boolean | number;
  github_repo: string | null;
};

export async function GET() {
  loadEnvConfig(process.cwd());

  const { userId } = await requireWebUser();
  const conn = openWebDb();
  try {
    if (conn.driver === "postgres") {
      const r = await conn.pool.query(
        `
        SELECT t.slug, t.role_id, t.channel_id, t.is_active, t.github_repo, a.perm_level
        FROM ${tbl("teamAssociations")} a
        JOIN ${tbl("teams")} t ON t.slug = a.team_slug
        WHERE a.user_id = $1
        ORDER BY t.slug ASC
        `,
        [userId]
      );
      return NextResponse.json({
        teams: r.rows.map((row) => ({
          slug: row.slug as string,
          roleId: (row.role_id as string | null) ?? null,
          channelId: (row.channel_id as string | null) ?? null,
          isActive: Boolean(row.is_active),
          githubRepo: (row.github_repo as string | null) ?? null,
          permLevel: Number(row.perm_level ?? 0)
        }))
      });
    }

    const rows = conn.db
      .prepare(
        `
        SELECT t.slug, t.role_id, t.channel_id, t.is_active, t.github_repo, a.perm_level
        FROM ${tbl("teamAssociations")} a
        JOIN ${tbl("teams")} t ON t.slug = a.team_slug
        WHERE a.user_id = ?
        ORDER BY t.slug ASC
        `
      )
      .all(userId) as (TeamRow & { perm_level: number })[];

    return NextResponse.json({
      teams: rows.map((row) => ({
        slug: row.slug,
        roleId: row.role_id ?? null,
        channelId: row.channel_id ?? null,
        isActive: Boolean(row.is_active),
        githubRepo: row.github_repo ?? null,
        permLevel: Number(
          (row as unknown as { perm_level: number }).perm_level ?? 0
        )
      }))
    });
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}
