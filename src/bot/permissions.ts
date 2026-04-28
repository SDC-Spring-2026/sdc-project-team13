import type { GuildMember } from "discord.js";

function parseIdSet(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

const adminRoleIds = parseIdSet(process.env.DISCORD_ADMIN_ROLE_IDS);
const presidentRoleIds = parseIdSet(process.env.DISCORD_PRESIDENT_ROLE_IDS);

export function isAdmin(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  if (adminRoleIds.size === 0) return false;
  return member.roles.cache.some((r) => adminRoleIds.has(r.id));
}

export function isPresident(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  if (presidentRoleIds.size === 0) return false;
  return member.roles.cache.some((r) => presidentRoleIds.has(r.id));
}

export function isPresidentOrAdmin(
  member: GuildMember | null | undefined
): boolean {
  return isAdmin(member) || isPresident(member);
}
