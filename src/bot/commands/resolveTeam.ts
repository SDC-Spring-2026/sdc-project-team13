import { Guild } from "discord.js";
import { sql } from "../../database/sqlite/conf";

/**
 * Resolves a team slug from a formatted channel name.
 * Looks up the channel in the guild cache, then finds the matching team by channel_id.
 */
export async function resolveTeamSlug(guild: Guild, formattedName: string): Promise<string | null> {
    const channel = guild.channels.cache.find(c => c.name === formattedName);

    if (!channel) return null;

    const team = sql
        .prepare("SELECT slug FROM Teams WHERE channel_id = ?")
        .get(channel.id) as { slug: string } | undefined;

    return team?.slug ?? null;
}
