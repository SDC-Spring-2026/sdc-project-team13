import { getBotClient, logger as botLog } from "./bot";
import { logger } from "./tools/log";
import { commandHandlers } from "./bot/commands/registry";
import { db } from "./database";
import { MessageFlags } from "discord.js";

// Start the application.
logger.info("Starting the program...");

// Start database.
(async () => {
    await db.initiate();
    await db.setup();

    getBotClient()
        .then((client) => {
            botLog.info("Bot is online. Waiting for commands...");

            client.on("interactionCreate", async (interaction) => {
                if (!interaction.isChatInputCommand()) return;

                const handler = commandHandlers.get(interaction.commandName);
                if (!handler) return;

                try {
                    await handler(interaction);
                } catch (err) {
                    botLog.error(`Error executing command ${interaction.commandName}:`, err as Error);
                    await interaction.reply({
                        content: "There was an error while executing this command!",
                        flags: MessageFlags.Ephemeral
                    });
                }
            });
        })
        .catch((err) => {
            logger.error(String(err));
        });
})();
