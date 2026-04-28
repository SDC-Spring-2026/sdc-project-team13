import { requireWebUser } from "./webAuth";
import { getWebAdminFlags } from "./discordBotApi";

export async function requireWebAdmin(): Promise<{ userId: string; isAdmin: boolean; isPresident: boolean }> {
  const { userId } = await requireWebUser();
  const flags = await getWebAdminFlags(userId);
  if (!flags.isAdmin && !flags.isPresident) {
    throw new Error("FORBIDDEN");
  }
  return { userId, ...flags };
}

