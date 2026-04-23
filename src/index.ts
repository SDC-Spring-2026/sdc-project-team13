import { getBotClient, logger as botLog } from "./bot";
import { logger } from "./tools/log";
import { commandHandlers } from "./bot/commands/registry";
import { db } from "./database";
import { askCache } from "./ai";
import { buildAiSessionContext } from "./ai/messageContext";
import {
  recordAiAssistantReply,
  recordUserChannelMessage
} from "./bot/recordTeamMessages";
import { MessageFlags } from "discord.js";

const AI_PREFIX = "!";

/** `!` at start, or after whitespace (e.g. "intro text !question"). */
function extractAiPrompt(raw: string): string | null {
  const t = raw.trim();
  for (let k = 0; k < t.length; k++) {
    if (t[k] !== AI_PREFIX) continue;
    if (k > 0 && !/\s/.test(t[k - 1] ?? " ")) continue;
    return t.slice(k + AI_PREFIX.length).trim();
  }
  return null;
}

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
          botLog.error(
            `Error executing command ${interaction.commandName}:`,
            err as Error
          );
          await interaction.reply({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral
          });
        }
      });

      client.on("messageCreate", async (message) => {
        if (message.author.bot) return;

        const content = message.content?.trim() ?? "";
        if (content) {
          void recordUserChannelMessage(message).catch((err) =>
            botLog.warn("MessageHistory archive failed:", err as Error)
          );
        }

        if (!content) return;

        const prompt = extractAiPrompt(content);
        if (prompt === null) return;

        if (!prompt) {
          await message.reply(getAiHelpText());
          return;
        }

        try {
          await message.channel.sendTyping();
          const sessionContext = await buildAiSessionContext(message);
          const reply = await askCache(prompt, { sessionContext });
          await message.reply(reply);
          void recordAiAssistantReply(message, reply).catch((err) =>
            botLog.warn("MessageHistory AI reply archive failed:", err as Error)
          );
        } catch (err) {
          botLog.error("Error during AI reply:", err as Error);
          await message.reply(
            "AI chat failed. Check your Gemini API key and try again."
          );
        }
      });
    })
    .catch((err) => {
      logger.error(String(err));
    });
})();
