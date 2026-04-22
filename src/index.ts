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

            client.on("error", (err) => {
                botLog.error(`Discord client error: ${err.message}`);
            });

            client.on("interactionCreate", async (interaction) => {
                if (!interaction.isChatInputCommand()) return;

                const handler = commandHandlers.get(interaction.commandName);
                if (!handler) {
                    botLog.warn(`No handler registered for command: /${interaction.commandName}`);
                    return;
                }

                botLog.info(`/${interaction.commandName} invoked by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guildId}`);

                try {
                    await handler(interaction);
                } catch (err) {
                    botLog.error(`Unhandled error in /${interaction.commandName}: ${err instanceof Error ? err.message : String(err)}`);
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply({ content: "There was an error while executing this command!" }).catch(() => {});
                    } else {
                        await interaction.reply({ content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral }).catch(() => {});
                    }
                }
            });
        })
        .catch((err) => {
            logger.error(String(err));
        });
})();
