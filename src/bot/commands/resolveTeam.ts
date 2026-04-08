import { Guild } from "discord.js";
import { driver } from "../../database/driver";

/**
 * Resolves a team slug from a formatted channel name.
 * Looks up the channel in the guild cache, then finds the matching team by channel_id.
 */
export async function resolveTeamSlug(
  guild: Guild,
  formattedName: string
): Promise<string | null> {
  const channel = guild.channels.cache.find((c) => c.name === formattedName);

  if (!channel) return null;

  const rows = await driver().query<{ slug: string }>(
    "SELECT slug FROM Teams WHERE channel_id = ?",
    [channel.id]
  );

  return rows[0]?.slug ?? null;
}
