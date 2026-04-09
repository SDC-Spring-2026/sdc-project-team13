# Cache

![Project Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FSDC-Spring-2026%2Fsdc-project-team13%2Fraw%2Fmain%2Fpackage.json&query=%24.version&prefix=v&style=flat-square&label=Version)

**Cache** is a Discord bot for managing SDC team projects. Members can create project groups, request to join them, view rosters, and query GitHub repositories — all from within Discord.

## Commands

| Command | Description |
|---|---|
| `/create <project> <description>` | Create a new project group with a dedicated role and channel. You become the leader. |
| `/join <name>` | Send a join request to a group. The group channel gets an accept/decline button prompt valid for 3 days. |
| `/kick <group> <person>` | Remove a member from a group (leader only). |
| `/group <name>` | List all members of a group. |
| `/manage <project> <description>` | Update a project's description and channel topic. |
| `/github repo <target>` | Show repository info (stars, forks, language, latest commit). Accepts `owner/repo` or a full GitHub URL. |
| `/github commits <target> [branch] [limit]` | List recent commits (1–20, default 5). |
| `/flipcoin` | Flip a coin. |
| `/random` | Pick a random value. |
| `/hello` | Say hello. |

## Setup

### Prerequisites

- Node.js LTS v22.20+
- Yarn 4 (`corepack enable`)
- A Discord application with a bot token
- A GitHub personal access token (for `/github` commands)
- PostgreSQL (production) or nothing extra (development uses SQLite)

### 1. Install dependencies

```bash
corepack enable          # Windows: run in an admin shell first
yarn install
```

### 2. Configure environment

Create a `.env` file at the project root:

```env
# Discord
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-application-client-id
GUILD_ID=your-test-server-id       # dev only

# GitHub
GITHUB_TOKEN=your-github-pat

# Database (omit to use SQLite locally)
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### 3. Register commands and migrate the database

```bash
yarn dev:setup
```

### 4. Run

```bash
# Development (hot-reload)
yarn dev

# Production
yarn build
yarn setup    # register commands + run migrations
yarn start
```

## Project structure

```
src/
  index.ts              # Entry point — boots the DB and Discord client
  setup.ts              # Command registration + DB migration runner
  bot/
    index.ts            # Discord client singleton
    commands/           # One file per slash command
      registry.ts       # Central command definition / handler map
  database/
    index.ts            # Public DB API
    driver/             # SQLite / PostgreSQL drivers (auto-selected via DATABASE_URL)
    defs/               # Table schemas
    impl/               # SQL query implementations
  integrations/
    github.ts           # Octokit client singleton
  tools/
    log.ts              # Winston logger factory
    slug.ts             # Slug utilities
```

## Adding a command

1. Create `src/bot/commands/<name>.ts` exporting `<name>Command` (definition) and `handle<Name>` (handler).
2. Import both into `src/bot/commands/registry.ts` and add them to `commandDefinitions` and `commandHandlers`.
3. Re-run `yarn dev:setup` to push the updated command list to Discord.

## Troubleshooting

| Problem | Fix |
|---|---|
| Commands not appearing | Re-run `yarn dev:setup`, confirm `GUILD_ID`, and make sure the bot is in the guild. |
| Bot not replying | Check `interactionCreate` handler and bot permissions. |
| `.env` not loading | Ensure scripts use `--env-file=.env` (already set in `package.json`). |

## Tech stack

Discord.js v14 · TypeScript · better-sqlite3 (dev) / PostgreSQL (prod) · Octokit · Winston · Yarn 4

## Contributing

Bugs and feature requests: [GitHub Issues](https://github.com/SDC-Spring-2026/sdc-project-team13/issues)

**SDC Spring 2026 — Team 13** · Connor Furby · Cash Pergande · Gavin Smith
