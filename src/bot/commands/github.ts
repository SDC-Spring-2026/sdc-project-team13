import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { getOctokit } from "../../integrations/github";
import { db } from "../../database";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:github");

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
          description: "Repo name or URL — leave blank to use your team's linked repo",
          required: false,
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
          description: "Repo name or URL — leave blank to use your team's linked repo",
          required: false,
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
    {
      type: 1, // SUB_COMMAND
      name: "issues",
      description: "List open issues from a repository",
      options: [
        {
          type: 3,
          name: "target",
          description: "Repo name or URL — leave blank to use your team's linked repo",
          required: false,
        },
      ],
    },
    {
      type: 1, // SUB_COMMAND
      name: "prs",
      description: "List open pull requests from a repository",
      options: [
        {
          type: 3,
          name: "target",
          description: "Repo name or URL — leave blank to use your team's linked repo",
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
 * Resolves the owner/repo pair from either the user-provided target string
 * or the team linked to the current channel. Returns null and replies with
 * an ephemeral error if neither source can produce a valid target.
 */
async function resolveRepo(
  interaction: ChatInputCommandInteraction
): Promise<{ owner: string; repo: string } | null> {
  const targetInput = interaction.options.getString("target");

  if (targetInput) {
    const parsed = parseRepoTarget(targetInput);
    if (!parsed) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Please provide a valid GitHub repo, e.g. `vercel/next.js` or a full GitHub URL."
      });
      return null;
    }
    return parsed;
  }

  // No target provided — look up the team linked to this channel
  const team = await db.getTeamByChannelId(interaction.channelId);
  if (!team) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "This channel isn't linked to a team. Provide a repo target manually, e.g. `vercel/next.js`."
    });
    return null;
  }

  if (!team.github_repo) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "This team doesn't have a GitHub repo linked yet."
    });
    return null;
  }

  const org = process.env.GITHUB_ORG;
  if (!org) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "GitHub org is not configured on this bot."
    });
    return null;
  }

  return { owner: org, repo: team.github_repo };
}

/**
 * Handles user interactions for the /github command.
 * Based on which subcommand the user used ("repo" or "commits"),
 * it calls the GitHub API and replies with the appropriate info.
 */
export async function handleGithub(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();

  const parsed = await resolveRepo(interaction);
  if (!parsed) return; // resolveRepo already replied with an error

  await interaction.deferReply();

  try {
    // Create or reuse Octokit client
    const octo = await getOctokit();
    const { owner, repo } = parsed;

    /** ------------------------------
     *  /github repo → Show repo info
     * ------------------------------ */
    if (sub === "repo") {
      const { data } = await octo.repos.get({ owner, repo });

      // get most recent commit for display
      const {data: recentCommits} = await octo.repos.listCommits({owner, repo, per_page: 1});
      const latest = recentCommits[0];

      const commitFields = latest ? [
            {name: '📝 Latest Commit', value: latest.commit.message.split('\n')[0]},
            {name: '👤 By', value: latest.commit.author?.name ?? 'unknown', inline: true},
            {name: '🕰️ When', value: new Date(latest.commit.author?.date ?? '').toLocaleString(), inline: true}
      ] : [
            {name: '📝 Latest Commit', value: 'No commits yet'}
      ];

      // create the message to be displayed in discord using Discord.js's EmbedBuilder
      const embed = new EmbedBuilder()
        .setTitle(`${owner}/${repo}`)
        .setURL(data.html_url)
        .setColor(0x00cc66)
        .addFields(
            {name: '🌲 Default branch', value: data.default_branch, inline: true},
            {name: '👀 Visibility', value: data.private ? "private" : "public", inline: true},
            {name: '🌠 Stars', value: String(data.stargazers_count), inline: true},
            {name: '🍴 Forks', value: String(data.forks_count), inline: true},
            {name: '🫨 Issues', value: String(data.open_issues_count), inline: true},
            {name: "🗣️ Language",    value: data.language ?? "Unknown", inline: true},
            ...commitFields
          )
          .setFooter({text: 'Brought to you be Cache 🤖'})
          .setThumbnail(data.owner.avatar_url);

      logger.info(`Repo info fetched for ${owner}/${repo} by ${interaction.user.tag}`);
      await interaction.editReply({embeds: [embed]});
      return;
    }

    /** ---------------------------------
     *  /github commits → List commits
     * --------------------------------- */
    if (sub === "commits") {
      const branch = interaction.options.getString("branch") ?? undefined;
      const limitRaw = interaction.options.getInteger("limit") ?? 5;
      const perPage = Math.max(1, Math.min(20, limitRaw)); // clamp between 1–20

      // repo object - has html_url, avatar_url, etc.
      const { data: repoData } = await octo.repos.get({ owner, repo });

      // commits array - has the list of commits
      const { data: commits } = await octo.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: perPage
      });

      // No commits found (e.g. empty repo or wrong branch)
      if (!commits.length) {
        await interaction.editReply(
          "No commits found. Check the branch name or try again."
        );
        return;
      }

      // lambda expression that builds a string full of all the commit data for display
      const lines = commits.map((c, i) => {
        const sha = c.sha?.slice(0, 7); // get first 7 characters of commit hash
        const msg = c.commit?.message.split('\n')[0]; // get commit message
        const author = c.commit?.author?.name ?? 'unknown'; // get author name
        const date = new Date(c.commit?.author?.date ?? '').toLocaleDateString(); // get timestamp
        return `**${i + 1}.** [\`${sha}\`](https://github.com/${owner}/${repo}/commit/${c.sha}) ${msg}\n└ ${author} • ${date}`;
      });

      // create the message to be displayed in discord using Discord.js's EmbedBuilder
      const embed2 = new EmbedBuilder()
        .setTitle(`${owner}/${repo}`)
        .setURL(repoData.html_url)
        .setColor(660066)
        .setDescription(lines.join('\n\n'))
        .setFooter({text: 'Brought to you be Cache 🤖'})
        .setThumbnail(repoData.owner.avatar_url);


      logger.info(`${perPage} commits fetched for ${owner}/${repo}${branch ? `@${branch}` : ""} by ${interaction.user.tag}`);
      await interaction.editReply({embeds: [embed2]});
      return;
    }

    /** ---------------------------------
     *  /github issues → List open issues
     * --------------------------------- */
    if (sub === "issues") {
      const { data: repoData } = await octo.repos.get({ owner, repo });
      const { data: allItems } = await octo.issues.listForRepo({
        owner,
        repo,
        state: "open",
        per_page: 10
      });

      // GitHub's issues endpoint returns PRs too — filter them out
      const issues = allItems.filter(i => !i.pull_request);

      if (!issues.length) {
        await interaction.editReply("No open issues found.");
        return;
      }

      const lines = issues.map(i => {
        const assignee = i.assignee ? ` — @${i.assignee.login}` : "";
        return `**#${i.number}** [${i.title}](${i.html_url})${assignee}`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`Open Issues — ${owner}/${repo}`)
        .setURL(`${repoData.html_url}/issues`)
        .setColor(0xe4432d)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${issues.length} open issue${issues.length !== 1 ? 's' : ''} • Brought to you by Cache 🤖` })
        .setThumbnail(repoData.owner.avatar_url);

      logger.info(`Issues fetched for ${owner}/${repo} by ${interaction.user.tag}`);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    /** ---------------------------------
     *  /github prs → List open PRs
     * --------------------------------- */
    if (sub === "prs") {
      const { data: repoData } = await octo.repos.get({ owner, repo });
      const { data: prs } = await octo.pulls.list({
        owner,
        repo,
        state: "open",
        per_page: 10
      });

      if (!prs.length) {
        await interaction.editReply("No open pull requests found.");
        return;
      }

      const lines = prs.map(pr => {
        const author = pr.user ? ` — @${pr.user.login}` : "";
        const base = pr.base.ref;
        return `**#${pr.number}** [${pr.title}](${pr.html_url}) → \`${base}\`${author}`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`Open Pull Requests — ${owner}/${repo}`)
        .setURL(`${repoData.html_url}/pulls`)
        .setColor(0x8957e5)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${prs.length} open PR${prs.length !== 1 ? 's' : ''} • Brought to you by Cache 🤖` })
        .setThumbnail(repoData.owner.avatar_url);

      logger.info(`PRs fetched for ${owner}/${repo} by ${interaction.user.tag}`);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Safety fallback for unexpected subcommands
    await interaction.editReply("Unknown subcommand.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`GitHub API call failed for ${interaction.user.tag}: ${msg}`);
    await interaction.editReply(`GitHub call failed: ${msg}`);
  }
}