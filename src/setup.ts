// Import required setup modules.
import { db } from "./database";
import { createNewLogger } from "./tools/log";
import { REST, Routes } from "discord.js";
import { commandDefinitions } from "./bot/commands/registry";

/// Logger
const logger = createNewLogger("setup");

/// Run setup
(async () => {
  /// Database

  logger.info("Setting up the database...");

  // Initiate database, set it up, then close it out.
  await db.initiate();
  await db.setup();
  await db.close();

  logger.info("Done!");

  /// Discord Commands

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (!token || !clientId) {
    logger.error(
      "Missing DISCORD_TOKEN or CLIENT_ID: cannot register commands."
    );
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(token);

  if (process.env.NODE_ENV === "production") {
    // Global commands propagate to every server the bot is in (~1 hour delay).
    logger.info("Registering commands globally (production)...");
    await rest.put(Routes.applicationCommands(clientId), {
      body: commandDefinitions
    });
    logger.info(
      "Successfully registered global commands. Changes may take up to 1 hour to propagate."
    );
  } else {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      logger.error(
        "Missing GUILD_ID: cannot register guild commands for dev environment."
      );
      process.exit(1);
    }

    // Guild commands propagate instantly and are scoped to a single server.
    logger.info("Registering commands for test guild (dev)...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commandDefinitions
    });
    logger.info("Successfully registered commands for test server.");
  }

  /// Done!
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});
