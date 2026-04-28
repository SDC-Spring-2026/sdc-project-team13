import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  loadEnvConfig(process.cwd());

  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/dashboard";

  const clientId = process.env.DISCORD_CLIENT_ID ?? process.env.CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Missing DISCORD_CLIENT_ID (or CLIENT_ID) in env." },
      { status: 500 }
    );
  }

  const appUrl = (process.env.APP_URL ?? url.origin).replace(/\/+$/, "");
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI ?? `${appUrl}/api/auth/discord/callback`;

  const state = Buffer.from(
    JSON.stringify({
      next,
      t: Date.now()
    })
  ).toString("base64url");

  const auth = new URL("https://discord.com/oauth2/authorize");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "identify");
  auth.searchParams.set("state", state);

  return NextResponse.redirect(auth.toString());
}
