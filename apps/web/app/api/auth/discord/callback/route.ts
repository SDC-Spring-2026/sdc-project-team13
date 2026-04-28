import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { ensureWebSessionTable, insertSession, newSessionToken, openWebDb } from "../../../../../lib/webDb";

export const dynamic = "force-dynamic";

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

function safeParseState(raw: string | null): { next: string } {
  if (!raw) return { next: "/dashboard" };
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      next?: string;
    };
    const next = typeof json.next === "string" ? json.next : "/dashboard";
    if (!next.startsWith("/")) return { next: "/dashboard" };
    return { next };
  } catch {
    return { next: "/dashboard" };
  }
}

export async function GET(request: Request) {
  loadEnvConfig(process.cwd());

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const { next } = safeParseState(url.searchParams.get("state"));
  if (!code) {
    return NextResponse.redirect(new URL(`/?error=missing_code`, url.origin));
  }

  const clientId = process.env.DISCORD_CLIENT_ID ?? process.env.CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing DISCORD_CLIENT_ID/CLIENT_ID or DISCORD_CLIENT_SECRET in env." },
      { status: 500 }
    );
  }

  const appUrl = (process.env.APP_URL ?? url.origin).replace(/\/+$/, "");
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI ?? `${appUrl}/api/auth/discord/callback`;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Discord token exchange failed (${tokenRes.status})`, detail: txt.slice(0, 500) },
      { status: 400 }
    );
  }

  const tokenJson = (await tokenRes.json()) as DiscordTokenResponse;
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `${tokenJson.token_type} ${tokenJson.access_token}` }
  });

  if (!userRes.ok) {
    const txt = await userRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Discord user fetch failed (${userRes.status})`, detail: txt.slice(0, 500) },
      { status: 400 }
    );
  }

  const user = (await userRes.json()) as DiscordUser;
  if (!user?.id) {
    return NextResponse.json({ error: "Discord user payload missing id." }, { status: 400 });
  }

  const conn = openWebDb();
  try {
    await ensureWebSessionTable(conn);
    const { token, tokenHash } = newSessionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await insertSession(conn, { tokenHash, userId: user.id, expiresAt });

    const res = NextResponse.redirect(new URL(next, appUrl));
    res.cookies.set({
      name: "cache_session",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt
    });
    return res;
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

