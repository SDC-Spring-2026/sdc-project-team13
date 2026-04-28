import { cookies } from "next/headers";
import { deleteSession, getSessionUserId, hashSessionToken, openWebDb } from "./webDb";

export const SESSION_COOKIE = "cache_session";

export async function requireWebUser(): Promise<{ userId: string }> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new Error("UNAUTHENTICATED");

  const tokenHash = hashSessionToken(token);
  const conn = openWebDb();
  try {
    const sess = await getSessionUserId(conn, tokenHash);
    if (!sess) throw new Error("UNAUTHENTICATED");
    if (sess.expiresAt.getTime() <= Date.now()) {
      await deleteSession(conn, tokenHash).catch(() => {});
      throw new Error("UNAUTHENTICATED");
    }
    return { userId: sess.userId };
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}

