import { createNewLogger } from "../tools/log";

/**
 * Type import for Octokit (the GitHub REST client).
 * This prevents TypeScript from loading it until runtime.
 */
type OctokitType = import("@octokit/rest").Octokit;

// Create a dedicated logger for GitHub integration.
const log = createNewLogger("github", "verbose");

// Store a single Octokit instance so it’s reused (singleton pattern).
let octo: OctokitType | null = null;

/**
 * Small helper to perform a true dynamic import that TypeScript won’t rewrite into `require()`.
 * Using Function avoids the `ERR_REQUIRE_ESM` crash since `@octokit/rest` is ESM-only.
 */
const dynamicImport = new Function(
  "specifier",
  "return import(specifier)"
) as <T>(specifier: string) => Promise<T>;

/**
 * Returns a ready-to-use Octokit client instance.
 * - Creates one on the first call and caches it.
 * - Uses the GITHUB_TOKEN from your .env file for authentication.
 * - Logs useful info along the way.
 */
export async function getOctokit(): Promise<OctokitType> {
  // Only create one Octokit client (singleton)
  if (!octo) {
    // Dynamically import Octokit (ESM-safe)
    const { Octokit } = await dynamicImport<typeof import("@octokit/rest")>(
      "@octokit/rest"
    );

    // Get token from environment variables
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN not set. Add it to your .env file.");
    }

    // Create and authenticate the Octokit client
    octo = new Octokit({
      auth: token,
      userAgent: "cache-bot/1.0", // Custom identifier for GitHub API calls
    });

    log.info("Octokit client created successfully.");
  }

  // Return the existing instance
  return octo;
}
