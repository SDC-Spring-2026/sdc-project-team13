/**
 * Keep in sync with `src/database/physicalTables.ts` (Next ESM cannot import root CJS package).
 * @see ../../src/database/physicalTables.ts
 */
const SAFE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

function sanitizePrefix(raw: string): string {
  const t = raw.trim();
  if (!t || !SAFE.test(t)) return "";
  return t;
}

export function tablePrefix(): string {
  if (process.env.CACHE_DB_TABLE_PREFIX?.trim()) {
    return sanitizePrefix(process.env.CACHE_DB_TABLE_PREFIX.trim());
  }
  if (process.env.CACHE_DB_USE_ISOLATED_TABLES === "1") {
    const iso = process.env.CACHE_DB_ISOLATED_PREFIX?.trim();
    return iso ? sanitizePrefix(iso) : "cache_team13";
  }
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

/** Display / JSON key: no SQL quoting. */
export function tblUnquoted(key: PhysicalTableKey): string {
  const p = tablePrefix();
  if (p) return `${p}_${SHORT[key]}`;
  if (process.env.DATABASE_URL) return PG_PUBLIC[key];
  return LEGACY[key];
}
