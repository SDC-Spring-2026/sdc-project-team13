import { getBotClient, logger as botLog } from "./bot";
import { logger } from "./tools/log";
import { commandHandlers } from "./bot/commands/registry";
import { db } from "./database";

// Start the application.
logger.info("Starting the program...");

// Start database.
db.initiate();

// Attempt to connect to the bot system, and close the connection after.
getBotClient()
  .then((client) => {
    botLog.info("Bot is online. Waiting for commands...");

    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const handler = commandHandlers.get(interaction.commandName);
      if (!handler) return; // Command not found, ignore.

      try {
        await handler(interaction);
      } catch (err) {
        botLog.error(
          `Error executing command ${interaction.commandName}:`,
          err as Error
        );
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true
        });
      }
    });
  })
  .catch((err) => {
    logger.error(String(err));
  });
