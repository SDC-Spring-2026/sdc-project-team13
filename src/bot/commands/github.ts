import type { ChatInputCommandInteraction } from "discord.js";
import { getOctokit } from "../../integrations/github";

/**
 * The definition for the /github slash command.
 * Includes two subcommands:
 *   - /github repo → Show general repository info
 *   - /github commits → List recent commits
 */
export const githubCommand = {
  name: "github",
  description: "Check GitHub repositories and commits",
  options: [
    {
      type: 1, // SUB_COMMAND
      name: "repo",
      description: "Show repository details (stars, forks, etc.)",
      options: [
        {
          type: 3, // STRING
          name: "target",
          description: "The repo name or URL (e.g. vercel/next.js or https://github.com/vercel/next.js)",
          required: true,
        },
      ],
    },
    {
      type: 1, // SUB_COMMAND
      name: "commits",
      description: "List recent commits from a repository",
      options: [
        {
          type: 3,
          name: "target",
          description: "The repo name or URL (e.g. vercel/next.js or https://github.com/vercel/next.js)",
          required: true,
        },
        {
          type: 3,
          name: "branch",
          description: "Branch name (optional)",
          required: false,
        },
        {
          type: 4, // INTEGER
          name: "limit",
          description: "How many commits to list (1–20)",
          required: false,
        },
      ],
    },
  ],
};

/**
 * Utility function to interpret user input (owner/repo or full URL).
 * Supports:
 *   - "owner/repo"
 *   - "https://github.com/owner/repo"
 */
function parseRepoTarget(raw: string): { owner: string; repo: string } | null {
  const s = raw.trim();

  // Handle plain "owner/repo"
  const m1 = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (m1) return { owner: m1[1], repo: m1[2] };

  // Handle URLs like https://github.com/owner/repo/
  try {
    const u = new URL(s);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/(^\/|\/$)/g, "").split("/");
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  } catch {
    // Ignore invalid URLs
  }

  return null;
}

/**
 * Handles user interactions for the /github command.
 * Based on which subcommand the user used ("repo" or "commits"),
 * it calls the GitHub API and replies with the appropriate info.
 */
export async function handleGithub(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();

  // Defer reply so the bot has time to fetch data before Discord times out
  await interaction.deferReply();

  try {
    // Create or reuse Octokit client
    const octo = await getOctokit();

    // Get and parse the target repository
    const target = interaction.options.getString("target", true);
    const parsed = parseRepoTarget(target);
    if (!parsed) {
      await interaction.editReply(
        "Please provide a valid GitHub repo, e.g. `vercel/next.js` or a full GitHub URL."
      );
      return;
    }

    const { owner, repo } = parsed;

    /** ------------------------------
     *  /github repo → Show repo info
     * ------------------------------ */
    if (sub === "repo") {
      const { data } = await octo.repos.get({ owner, repo });

      await interaction.editReply(
        `**${owner}/${repo}**\n` +
          `Default branch: ${data.default_branch}\n` +
          `Visibility: ${data.private ? "private" : "public"}\n` +
          `Stars: ${data.stargazers_count}  Forks: ${data.forks_count}  Open issues: ${data.open_issues_count}\n` +
          `Updated: ${new Date(data.updated_at).toLocaleString()}\n` +
          `${data.description ?? "No description provided."}`
      );
      return;
    }

    /** ---------------------------------
     *  /github commits → List commits
     * --------------------------------- */
    if (sub === "commits") {
      const branch = interaction.options.getString("branch") ?? undefined;
      const limitRaw = interaction.options.getInteger("limit") ?? 5;
      const perPage = Math.max(1, Math.min(20, limitRaw)); // clamp between 1–20

      // Fetch commits from GitHub
      const { data } = await octo.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: perPage,
      });

      // No commits found (e.g. empty repo or wrong branch)
      if (!data.length) {
        await interaction.editReply(
          "No commits found. Check the branch name or try again."
        );
        return;
      }

      // Format commit list for Discord message
      const lines = data.map((c) => {
        const sha = c.sha?.slice(0, 7);
        const msg = (c.commit?.message ?? "").split("\n")[0];
        const author = c.commit?.author?.name ?? "unknown";
        const t = c.commit?.author?.date
          ? new Date(c.commit.author.date).toLocaleString()
          : "";
        return `\`${sha}\` ${msg} — ${author} at ${t}`;
      });

      // Send commit summary
      await interaction.editReply(
        `**${owner}/${repo}** ${branch ? `(${branch})` : ""}\n` +
          lines.join("\n")
      );
      return;
    }

    // Safety fallback for unexpected subcommands
    await interaction.editReply("Unknown subcommand.");
  } catch (err) {
    // Graceful error handling with proper type check
    const msg = err instanceof Error ? err.message : String(err);
    await interaction.editReply(`GitHub call failed: ${msg}`);
  }
}
