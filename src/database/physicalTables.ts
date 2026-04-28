/**
 * Physical SQL table names for the Cache bot schema.
 *
 * **Supabase / dedicated Postgres (CacheBot):** leave prefix unset — we use the
 * standard public tables `teams`, `members`, `teamassociations`, `projects`,
 * `messagehistory` (lowercase, unquoted in SQL).
 *
 * **Shared Postgres** with foreign tables named the same: set
 * `CACHE_DB_USE_ISOLATED_TABLES=1` to use prefixed tables (default prefix
 * `cache_team13`), or set `CACHE_DB_TABLE_PREFIX=myapp` explicitly.
 *
 * **Local SQLite:** no `DATABASE_URL` — uses legacy quoted names `Members`, `Teams`, …
 */
const SAFE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

function sanitizePrefix(raw: string): string {
  const t = raw.trim();
  if (!t || !SAFE.test(t)) return "";
  return t;
}

/** Prefix without trailing underscore (e.g. cache_team13). Empty = public schema names. */
export function tablePrefix(): string {
  if (process.env.CACHE_DB_TABLE_PREFIX?.trim()) {
    return sanitizePrefix(process.env.CACHE_DB_TABLE_PREFIX.trim());
  }
  if (process.env.CACHE_DB_USE_ISOLATED_TABLES === "1") {
    const iso = process.env.CACHE_DB_ISOLATED_PREFIX?.trim();
    return iso ? sanitizePrefix(iso) : "cache_team13";
  }
  // Still allow explicit “use public tables” on Postgres when prefix was set empty string — rare
  if (process.env.CACHE_DB_USE_SHARED_SCHEMA === "1") {
    return "";
  }
  return "";
}

export type PhysicalTableKey =
  | "members"
  | "teams"
  | "teamAssociations"
  | "projects"
  | "messageHistory"
  | "botConfig";

const LEGACY: Record<PhysicalTableKey, string> = {
  members: "Members",
  teams: "Teams",
  teamAssociations: "TeamAssociations",
  projects: "Projects",
  messageHistory: "MessageHistory",
  botConfig: "BotConfig"
};

/** Lowercase names used by Supabase / Postgres public schema. */
const PG_PUBLIC: Record<PhysicalTableKey, string> = {
  members: "members",
  teams: "teams",
  teamAssociations: "teamassociations",
  projects: "projects",
  messageHistory: "messagehistory",
  botConfig: "botconfig"
};

const SHORT: Record<PhysicalTableKey, string> = {
  members: "members",
  teams: "teams",
  teamAssociations: "teamassociations",
  projects: "projects",
  messageHistory: "messagehistory",
  botConfig: "botconfig"
};

/**
 * SQL table identifier for queries and DDL.
 * - Prefixed: quoted "prefix_teams"
 * - Postgres, no prefix: lowercase teams (matches Supabase)
 * - SQLite, no prefix: quoted "Teams" (matches local DDL)
 */
export function tbl(key: PhysicalTableKey): string {
  const p = tablePrefix();
  if (p) {
    return `"${p}_${SHORT[key]}"`;
  }
  if (process.env.DATABASE_URL) {
    return PG_PUBLIC[key];
  }
  return `"${LEGACY[key]}"`;
}

export function snapshotTableKeys(): PhysicalTableKey[] {
  return ["teams", "projects", "members", "teamAssociations", "messageHistory"];
}

export function tblUnquoted(key: PhysicalTableKey): string {
  const p = tablePrefix();
  if (p) return `${p}_${SHORT[key]}`;
  if (process.env.DATABASE_URL) return PG_PUBLIC[key];
  return LEGACY[key];
}
