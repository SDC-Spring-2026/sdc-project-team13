import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireWebAdmin } from "../../../../lib/adminAuth";
import { openWebDb } from "../../../../lib/webDb";
import { tbl } from "../../../../lib/physicalTables";

export const dynamic = "force-dynamic";

type RepairResult = {
  scannedTeams: number;
  fixedLeaderTeams: number;
  fixedActiveFlagTeams: number;
  notes: string[];
};

export async function POST() {
  loadEnvConfig(process.cwd());
  await requireWebAdmin();

  const conn = openWebDb();
  const notes: string[] = [];
  let scannedTeams = 0;
  let fixedLeaderTeams = 0;
  let fixedActiveFlagTeams = 0;

  const T = tbl("teams");
  const A = tbl("teamAssociations");

  try {
    if (conn.driver === "postgres") {
      const teamsR = await conn.pool.query(
        `SELECT slug, is_active, channel_id, role_id FROM ${T}`
      );
      const teams = teamsR.rows as Array<{
        slug: string;
        is_active: boolean;
        channel_id: string | null;
        role_id: string | null;
      }>;
      scannedTeams = teams.length;

      for (const t of teams) {
        // If team has channel+role but is not active, flip active on.
        if (!t.is_active && t.channel_id && t.role_id) {
          await conn.pool.query(
            `UPDATE ${T} SET is_active = TRUE WHERE slug = $1`,
            [t.slug]
          );
          fixedActiveFlagTeams++;
        }

        const leaderR = await conn.pool.query(
          `SELECT user_id, perm_level FROM ${A} WHERE team_slug = $1 ORDER BY perm_level DESC, id ASC`,
          [t.slug]
        );
        const rows = leaderR.rows as Array<{
          user_id: string;
          perm_level: number;
        }>;
        if (rows.length === 0) continue;
        const hasLeader = rows.some((r) => Number(r.perm_level) === 1);
        if (!hasLeader) {
          const chosen = rows[0].user_id;
          await conn.pool.query(
            `UPDATE ${A} SET perm_level = 1 WHERE team_slug = $1 AND user_id = $2`,
            [t.slug, chosen]
          );
          fixedLeaderTeams++;
          notes.push(`Set leader for ${t.slug} → ${chosen}`);
        }
      }
    } else {
      const teams = conn.db
        .prepare(
          `SELECT slug, is_active as isActive, channel_id as channelId, role_id as roleId FROM ${T}`
        )
        .all() as Array<{
        slug: string;
        isActive: number;
        channelId: string | null;
        roleId: string | null;
      }>;
      scannedTeams = teams.length;

      const updateActive = conn.db.prepare(
        `UPDATE ${T} SET is_active = 1 WHERE slug = ?`
      );
      const assocRowsStmt = conn.db.prepare(
        `SELECT id, user_id as userId, perm_level as permLevel FROM ${A} WHERE team_slug = ? ORDER BY perm_level DESC, id ASC`
      );
      const setLeaderStmt = conn.db.prepare(
        `UPDATE ${A} SET perm_level = 1 WHERE team_slug = ? AND user_id = ?`
      );

      for (const t of teams) {
        if (!t.isActive && t.channelId && t.roleId) {
          updateActive.run(t.slug);
          fixedActiveFlagTeams++;
        }
        const rows = assocRowsStmt.all(t.slug) as Array<{
          userId: string;
          permLevel: number;
        }>;
        if (rows.length === 0) continue;
        const hasLeader = rows.some((r) => Number(r.permLevel) === 1);
        if (!hasLeader) {
          const chosen = rows[0].userId;
          setLeaderStmt.run(t.slug, chosen);
          fixedLeaderTeams++;
          notes.push(`Set leader for ${t.slug} → ${chosen}`);
        }
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Repair failed: ${String(e)}` },
      { status: 500 }
    );
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }

  const out: RepairResult = {
    scannedTeams,
    fixedLeaderTeams,
    fixedActiveFlagTeams,
    notes
  };
  return NextResponse.json(out);
}
