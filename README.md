# Cache

![Project Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FSDC-Spring-2026%2Fsdc-project-team13%2Fraw%2Fmain%2Fpackage.json&query=%24.version&prefix=v&style=flat-square&label=Version)

**Cache** is a Discord bot for SDC team projects. Members can create project groups, request to join them, list rosters, and query GitHub — from Discord. The bot also supports **AI chat** (messages starting with `!`) via Google Gemini, with project data stored in **SQLite** (local dev) or **PostgreSQL** (when `DATABASE_URL` is set).

## Contribute

This project uses **Node.js LTS v22.20+** and **Yarn 4**.

1. Clone the repository.
2. Run `corepack enable` (Windows: admin shell) and use Yarn 4.
3. In the repository root, run `yarn install`.

## Quickstart

1. **Install**

   - Admin shell (Windows): `corepack enable && corepack prepare yarn@4.10.3 --activate`
   - Install dependencies: `yarn install`

2. **Environment** — create a `.env` file at the project root:

   ```env
   # Discord
   DISCORD_TOKEN=...
   CLIENT_ID=...
   GUILD_ID=...              # dev: guild slash commands

   # AI (! prefix) — optional
   GEMINI_API_KEY=...
   # GEMINI_MODEL=gemini-2.5-flash   # optional override

   # GitHub (for /github commands)
   GITHUB_TOKEN=...

   # Database: omit to use local SQLite; set for PostgreSQL
   # DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

3. **Invite the bot** to your test server (with **Message Content Intent** if you use `!` AI mode).

4. **Database + register slash commands** (first run / after command changes):

   ```bash
   yarn dev:setup
   ```

   For quick guild command sync without full setup, you can also use: `yarn register:dev`

5. **Run**

   - Bot (watch): `yarn dev:bot`
   - Web (Next.js): `yarn dev:web` → [http://localhost:3000](http://localhost:3000)
   - All (lint + bot + web): `yarn dev`
   - Production: `yarn build && yarn start` (and `yarn build:web` / `yarn start:web` for the site)

## How to use Cache

- **Slash commands** such as `/create`, `/join`, `/group`, `/github` — see table below.
- **AI text mode** — prefix a message with `!` in a channel the bot can read, e.g. `!what can this bot do?`  
  This is read-only: it does not change project data; use `/` commands for real actions.

### Bot instructions (AI tone and rules)

Edit `src/botInstructions.ts` to change the system-style instructions for `!` mode.

## Commands

| Command | Description |
|--------|-------------|
| `/create <project> <description>` | Create a new project group with a dedicated role and channel. You become the leader. |
| `/join <name>` | Send a join request to a group. The group channel gets an accept/decline button (valid 3 days). |
| `/kick <group> <person>` | Remove a member (leader only). |
| `/group <name>` | List members of a group. |
| `/manage <project> <description>` | Update project description and channel topic. |
| `/github repo <target>` | Repo info (stars, forks, language, latest commit). |
| `/github commits <target> [branch] [limit]` | Recent commits (1–20, default 5). |
| `/flipcoin` | Flip a coin. |
| `/random` | Random value. |
| `/hello` | Say hello. |

## Project structure

```
src/
  index.ts              # Entry: DB, Discord, slash + ! AI
  setup.ts              # DB migration/close + dev guild command registration
  ai.ts                 # Gemini helper for ! chat
  botInstructions.ts    # AI system instructions
  bot/
    index.ts            # Discord client
    registerCommands.ts # Optional: register guild commands only
    commands/           # Slash commands; registry.ts maps names → handlers
  database/             # Drivers (SQLite/Postgres), defs, impl
  integrations/         # GitHub (Octokit)
  tools/                # Logging, slugs
apps/web/               # Next.js frontend (separate from the bot)
```

## Adding a command

1. Add `src/bot/commands/<name>.ts` with `<name>Command` and `handle<Name>`.
2. Register in `src/bot/commands/registry.ts`.
3. Run `yarn dev:setup` (or `yarn register:dev` for commands only, after DB is ready once).

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Commands not showing | `yarn dev:setup` or `yarn register:dev`; check `GUILD_ID`; bot in guild. |
| DB errors on first run | Run `yarn dev:setup` once. |
| `!` AI not replying | Set `GEMINI_API_KEY`; enable **Message Content Intent**; bot can read/send in channel. |
| `.env` not loading | Scripts use `--env-file=.env` in `package.json`. |

## Tech stack

Discord.js v14 · TypeScript · **better-sqlite3** (dev) / **PostgreSQL** (prod) · **@google/genai** (AI) · Next.js (web) · Octokit · Winston · Yarn 4

## Contributing

Bugs and features: [GitHub Issues](https://github.com/SDC-Spring-2026/sdc-project-team13/issues)

**SDC Spring 2026 — Team 13** · Connor Furby · Cash Pergande · Gavin Smith
