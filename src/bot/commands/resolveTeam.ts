import type { Guild, GuildTextBasedChannel } from "discord.js";
import { driver } from "../../database/driver";
import { tbl } from "../../database/physicalTables";

/** Collapse whitespace for fuzzy channel ↔ key matching. */
function compactChannelName(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function channelNameCandidates(formattedName: string): string[] {
  const primary = formattedName.toLowerCase().replace(/\s+/g, "-").trim();
  const trimmed = primary.replace(/^-+|-+$/g, "");
  const spaced = primary.replace(/-/g, " ").trim();
  return [...new Set([primary, trimmed, spaced].filter((s) => s.length > 0))];
}

/**
 * Resolves a team slug from a formatted channel name (hyphenated, lowercase).
 * Matches channel in the guild cache, then looks up Teams.channel_id.
 */
export async function resolveTeamSlug(
  guild: Guild,
  formattedName: string
): Promise<string | null> {
  const T = tbl("teams");
  const candidates = channelNameCandidates(formattedName);
  const tryResolve = async (channelId: string) => {
    const rows = await driver().query<{ slug: string }>(
      `SELECT slug FROM ${T} WHERE channel_id = ?`,
      [channelId]
    );
    return rows[0]?.slug ?? null;
  };

  for (const cand of candidates) {
    const ch = guild.channels.cache.find((c) => c.name === cand);
    if (ch) {
      const slug = await tryResolve(ch.id);
      if (slug) return slug;
    }
  }

  const target = compactChannelName(formattedName);
  if (!target) return null;

  const fuzzy = guild.channels.cache.find(
    (c) => c.isTextBased() && compactChannelName(c.name) === target
  ) as GuildTextBasedChannel | undefined;
  if (fuzzy) {
    const slug = await tryResolve(fuzzy.id);
    if (slug) return slug;
  }

  return null;
}
