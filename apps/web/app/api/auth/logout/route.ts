import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, hashSessionToken, openWebDb } from "../../../../lib/webDb";

export const dynamic = "force-dynamic";

export async function POST() {
  loadEnvConfig(process.cwd());

  const token = (await cookies()).get("cache_session")?.value;
  if (token) {
    const conn = openWebDb();
    try {
      await deleteSession(conn, hashSessionToken(token)).catch(() => {});
    } finally {
      if (conn.driver === "postgres") await conn.close();
      else conn.close();
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "cache_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
  return res;
}

