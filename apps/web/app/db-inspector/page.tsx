import { loadEnvConfig } from "@next/env";
import { DbInspectorClient } from "../../components/db-inspector-client";
import { requireWebAdmin } from "../../lib/adminAuth";

export default async function DbInspectorPage() {
  loadEnvConfig(process.cwd());
  await requireWebAdmin();
  return <DbInspectorClient />;
}
