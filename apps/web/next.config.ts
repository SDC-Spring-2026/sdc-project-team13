import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

/** `next.config.ts` sits in `apps/web/` — two levels up is the monorepo root. */
const repoRoot = path.join(__dirname, "..", "..");
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3", "pg"]
};

export default nextConfig;
