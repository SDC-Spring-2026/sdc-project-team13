import { loadEnvConfig } from "@next/env";
import { DbInspectorClient } from "../../components/db-inspector-client";
import { requireWebAdmin } from "../../lib/adminAuth";
import { userProfilePath } from "../../lib/routes";

export default async function DbInspectorPage() {
  loadEnvConfig(process.cwd());
  const { userId } = await requireWebAdmin();
  return <DbInspectorClient accountHref={userProfilePath(userId)} />;
}
