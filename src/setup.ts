// Import required setup modules.
import { db } from "./database";
import { createNewLogger } from "./tools/log";
import { REST, Routes } from "discord.js";
import { commandDefinitions } from "./bot/commands/registry";

/// Logger
const logger = createNewLogger("setup");

/// Database

logger.info("Setting up the database...");

// Initiate database, set it up, then close it out.
db.initiate();
db.setup();
db.close();

logger.info("Done!");

/// Discord Commands

// We dont have production steps for setup yet, so we will skip if so...

if (process.env.NODE_ENV == "production") {
  logger.warn(
    "Currently no setup steps for discord commands in prod environment. Will be later!!"
  );
} else {
  logger.info("Registering commands for test guild...");

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  // Check if all required environment variables are set
  if (!token || !clientId || !guildId) {
    console.error("Missing required discord bot environment variables :(");
    process.exit(1);
  }

  // Create a new REST client
  const rest = new REST({ version: "10" }).setToken(token);

  // Guild Commands for dev environment that propogate instantly
  rest
    .put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commandDefinitions
    })
    .then(() => {
      logger.info("Successfully registered commands for test server.");
    })
    .catch(logger.error);
}

/// Done!
