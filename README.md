# Cache

![Project Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FSDC-Fall-2025%2Fsdc-project-team13%2Fraw%2Fmain%2Fpackage.json&query=%24.version&prefix=v&style=flat-square&label=Version)

**Cache** is a discord bot that helps with managing, leading, and contributing to SDC team projects.

Using bot commands and natural language interaction, Cache can track progress, offer programming advice, create/manage projects and scheduling, and integrate with tools such as [Cal.com](https://cal.com) and [GitHub](https://github.com) for real-time activity monitering.

## Contribute

This project uses NodeJS LTS v22.20+ and Yarn 4 to manage dependancies. To download the repository and set up a local development environment, do the following:

1. Clone the repository.
2. Ensure you are using Node LTS v22.20 or greater.
3. Run `corepack enable` to activate Yarn.
4. In the repository, run `yarn` to install all dev dependancies.

You're good to contribute!

## Quickstart

1. Install
   - Admin shell (Windows only): `corepack enable && corepack prepare yarn@4.10.3 --activate`
   - Install deps: `yarn install`
2. Configure `.env` in project root:
   - `DISCORD_TOKEN=...`
   - `CLIENT_ID=...`
   - `GUILD_ID=...`
3. Invite the bot to your test server
4. Register commands (guild/dev):
   - `yarn dev:setup`
5. Run
   - Dev: `yarn dev`
   - Prod: `yarn build && yarn start`

## Project Structure
- `src/index.ts`: boot + event wiring
- `src/bot/`: Discord client + command system
  - `index.ts`: creates/logs in the Discord client
  - `commands/`: command files (definition + handler)
    - `hello.ts`: example command
    - `random.ts`: random number command
    - `registry.ts`: single source of truth for definitions/handlers
  - `registerCommands.ts`: registers slash commands (guild/global)
- `src/tools/log.ts`: Winston logging
- `src/database/`: placeholder for persistence

## Commands
- Add: create `src/bot/commands/<name>.ts` exporting `<name>Command` and `handle<Name>`. Import into `registry.ts`, add to `commandDefinitions` and `commandHandlers`. Re-run `yarn register:dev`.
- Update: change the command definition; re-run `yarn register:dev`.
- Remove: remove from `registry.ts` and re-run `yarn register:dev` (Discord will delete it from the guild).
- Global vs Guild:
  - Dev: `Routes.applicationGuildCommands(clientId, guildId)` (fast).
  - Prod: `Routes.applicationCommands(clientId)` (slow propagation).

## Troubleshooting
- `.env` not loading: ensure `package.json` uses `--env-file=.env` or add `import "dotenv/config"` in scripts.
- Commands not showing: re-run `yarn register:dev`, confirm `GUILD_ID`, ensure bot is in the guild.
- Bot not replying: check `interactionCreate` handler and permissions to send messages.
