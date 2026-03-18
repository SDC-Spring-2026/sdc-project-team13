import { getBotClient, logger as botLog } from "./bot";
import { logger } from "./tools/log";
import { commandHandlers } from "./bot/commands/registry";
import { db } from "./database";
import { askCache } from "./ai";

const AI_PREFIX = "!";

function getAiHelpText() {
  return [
    "AI mode:",
    `Start your message with \`${AI_PREFIX}\` to chat with Cache.`,
    `Example: \`${AI_PREFIX} summarize what this bot can do\``,
    "",
    "Hard commands use Discord slash commands such as:",
    getCommandListText()
  ].join("\n");
}

function getCommandListText() {
  const names = [...commandHandlers.keys()].map((name) => `/${name}`);
  return `Registered slash commands: ${names.join(", ")}`;
}

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

    client.on("messageCreate", async (message) => {
      if (message.author.bot) return;

      const content = message.content.trim();
      if (!content) return;

      if (!content.startsWith(AI_PREFIX)) return;

      const prompt = content.slice(AI_PREFIX.length).trim();
      if (!prompt) {
        await message.reply(getAiHelpText());
        return;
      }

      try {
        await message.channel.sendTyping();
        const reply = await askCache(prompt);
        await message.reply(reply);
      } catch (err) {
        botLog.error("Error during AI reply:", err as Error);
        await message.reply("AI chat failed. Check your Gemini API key and try again.");
      }
    });
  })
  .catch((err) => {
    logger.error(String(err));
  });
