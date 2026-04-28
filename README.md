# Cache

![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FSDC-Spring-2026%2Fsdc-project-team13%2Fraw%2Fmain%2Fpackage.json&query=%24.version&prefix=v&style=flat-square&label=Version)
![Node.js](https://img.shields.io/badge/Node.js-v22.20+-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

**Cache** is a Discord bot for SDC team projects. Members register their GitHub account, then create or join project groups — each backed by a dedicated Discord channel, role, and GitHub repository managed automatically via a GitHub App. The bot also supports **AI chat** via Google Gemini. Data is stored in **SQLite** (local dev) or **PostgreSQL** (when `DATABASE_URL` is set).

## Setup

This project uses **Node.js LTS v22.20+** and **Yarn 4**.

1. Clone the repository.
2. Run `corepack enable` (Windows: admin shell) and use Yarn 4.
3. Run `yarn install` in the repo root.

### Environment

Create a `.env` file at the project root:

```env
# Discord
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...              # dev: guild-scoped slash commands

# AI — optional
GEMINI_API_KEY=...
# GEMINI_MODEL=gemini-2.5-flash   # optional model override

# GitHub (for /github query commands)
GITHUB_TOKEN=...

# GitHub App (for automatic repo creation and collaborator management)
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...   # PEM contents; replace newlines with \n if inline
GITHUB_ORG=...               # GitHub org where team repos are created

# Database: omit to use local SQLite; set for PostgreSQL
# DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### First run

Initialize the database and register slash commands:

```bash
yarn dev:setup
```

To re-sync commands without re-running migrations:

```bash
yarn register:dev
```

## Running

| Script | What it does |
| ------ | ------------ |
| `yarn dev:bot` | Bot in watch mode |
| `yarn dev:web` | Next.js frontend at [localhost:3000](http://localhost:3000) |
| `yarn dev` | ESLint + bot + web, all in parallel |
| `yarn dev:compile:no-watch` | Bot, single run (no watch) |
| `yarn build && yarn start` | Production build and start |

## Commands

### Member commands

| Command | Description |
| ------- | ----------- |
| `/register <github>` | Link your Discord account to a GitHub username. Required before any team commands. |
| `/unregister` | Unlink your GitHub account from your Discord. |
| `/whois <member>` | Look up a member's linked GitHub and team info. |
| `/create <project> <description>` | Create a new project group. Provisions a Discord channel + role + private GitHub repo (all named after the team slug). You become the leader. |
| `/join <group>` | Request to join a group. A button is posted in the team channel; only the leader can accept (valid for 3 days). |
| `/leave <group>` | Leave a group you are currently a member of. |
| `/kick <group> <member>` | Remove a member from a team and revoke their GitHub repo access (leader only). |
| `/team` | Show an overview of your current team. |
| `/group <group>` | List all members of a group. |
| `/projects` | List all active project groups in the server. |
| `/manage <project> <description>` | Update a project's description and channel topic (leader only). |
| `/github repo <target>` | Repo info — stars, forks, language, latest commit. |
| `/github commits <target> [branch] [limit]` | Recent commits (1–20, default 5). |

### Admin commands

| Command | Description |
| ------- | ----------- |
| `/disable <group>` | Hide a team's channel and archive its GitHub repo. |
| `/enable <group>` | Restore a disabled team's channel and unarchive its GitHub repo. |
| `/purge <group>` | Permanently delete a team's channel, role, and GitHub repo. Team must be disabled first. |

### Team slugs

Teams are identified by a slug like `sp2026-team3`. The Discord channel, Discord role, and GitHub repository all share this name. The slug is derived from the current semester and an auto-incrementing number.

### AI chat

Ping the bot or reply to one of its messages to start an AI conversation. The bot responds using Google Gemini with context about the current project. Replies from others in the same thread continue the session. This is read-only — it does not modify any data. Edit `src/botInstructions.ts` to change the AI's system prompt.

## Project structure

```text
src/
  index.ts              # Entry point: DB init, Discord client, slash + AI
  setup.ts              # DB migration + dev guild command registration
  ai.ts                 # Gemini integration for AI chat
  botInstructions.ts    # AI system prompt
  bot/
    index.ts            # Discord client setup
    registerCommands.ts # Register guild-scoped slash commands
    recordTeamMessages.ts
    commands/           # One file per slash command; registry.ts routes by name
      isGuildAdmin.ts       # Admin permission check
      requireRegistered.ts  # Guard: caller must have run /register
      resolveTeam.ts        # Fuzzy team lookup by channel name
  database/
    driver/             # SQLite (dev) and PostgreSQL (prod) drivers
    defs/               # TypeScript interfaces for DB managers
    impl/               # SQL implementations
  integrations/
    github.ts           # Octokit REST — /github query commands
    githubApp.ts        # GitHub App — repo create/archive/delete, collaborators
  tools/                # Logging (Winston), slug generation
apps/
  web/                  # Next.js frontend
```

## Adding a command

1. Create `src/bot/commands/<name>.ts` exporting `<name>Command` (definition) and `handle<Name>` (handler).
2. Import and register both in `src/bot/commands/registry.ts`.
3. Run `yarn dev:setup` (or `yarn register:dev` if the DB is already initialized).

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| Commands not showing | Run `yarn dev:setup` or `yarn register:dev`; check `GUILD_ID`; confirm bot is in the guild. |
| DB errors on first run | Run `yarn dev:setup` once to run migrations. |
| AI not replying to pings | Set `GEMINI_API_KEY`; enable **Message Content Intent** on the bot; confirm the bot can read and send messages in the channel. |
| `.env` not loading | Scripts use `--env-file=.env`; make sure the file exists at the repo root. |
| GitHub repo not created | Set `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_ORG`; ensure the GitHub App is installed on the org with **Repository** read/write permissions. |
| "GitHub App is not installed on org" | GitHub App settings → Install App → select the org. |
| `/purge` fails to delete repo | Grant the GitHub App the **"Delete repositories"** permission (separate from read/write) in its settings. |
| Collaborator not added/removed | The member must have run `/register` so their GitHub username is on file. |

## Tech stack

| Area | Stack |
| ---- | ----- |
| Runtime | Node.js v22 LTS |
| Language | TypeScript 5 |
| Discord | Discord.js v14 |
| Database | better-sqlite3 (dev) · PostgreSQL via `pg` (prod) |
| AI | @google/genai (Gemini) |
| GitHub | Octokit REST · GitHub App (octokit) |
| Web | Next.js 16 · React 19 |
| Logging | Winston + winston-daily-rotate-file |
| Tooling | Yarn 4 · tsx · ESLint · Prettier |

## Contributing

Bugs and features: [GitHub Issues](https://github.com/SDC-Spring-2026/sdc-project-team13/issues)

**SDC Spring 2026 — Team 13** · Connor Furby · Cash Pergande · Gavin Smith
