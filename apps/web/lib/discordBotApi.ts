import { loadEnvConfig } from "@next/env";

type GuildMember = {
  user?: { id: string; username?: string; global_name?: string | null };
  nick?: string | null;
  roles?: string[];
};

function parseIdSet(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export async function getDiscordGuildMember(
  userId: string
): Promise<GuildMember | null> {
  loadEnvConfig(process.cwd());
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_TOKEN;
  if (!guildId || !botToken) return null;

  const r = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
    {
      headers: { authorization: `Bot ${botToken}` },
      cache: "no-store"
    }
  );
  if (!r.ok) return null;
  return (await r.json()) as GuildMember;
}

export async function getWebAdminFlags(
  userId: string
): Promise<{ isAdmin: boolean; isPresident: boolean }> {
  const member = await getDiscordGuildMember(userId);
  const roles = new Set(member?.roles ?? []);

  const adminRoleIds = parseIdSet(process.env.DISCORD_ADMIN_ROLE_IDS);
  const presidentRoleIds = parseIdSet(process.env.DISCORD_PRESIDENT_ROLE_IDS);

  const isAdmin = [...adminRoleIds].some((id) => roles.has(id));
  const isPresident = [...presidentRoleIds].some((id) => roles.has(id));
  return { isAdmin, isPresident };
}

export async function getDiscordDisplayName(
  userId: string
): Promise<string | null> {
  const member = await getDiscordGuildMember(userId);
  const nick = member?.nick?.trim();
  if (nick) return nick;
  const gn = member?.user?.global_name?.trim();
  if (gn) return gn;
  const un = member?.user?.username?.trim();
  if (un) return un;
  return null;
}
