import { loadEnvConfig } from "@next/env";
import { redirect } from "next/navigation";
import { userProfilePath } from "../../lib/routes";
import { requireWebUser } from "../../lib/webAuth";

/**
 * Legacy `/account` URL: same destination as tapping a roster name (`/users/[id]`).
 */
export default async function AccountPage() {
  loadEnvConfig(process.cwd());
  const { userId } = await requireWebUser();
  redirect(userProfilePath(userId));
}
