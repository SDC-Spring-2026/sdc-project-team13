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

const ACTIVE_SESSION_TIMEOUT_MS = 2 * 60 * 1000;

/** Channels where the bot is in active-conversation mode, mapped to their inactivity timer. */
const activeChannels = new Map<string, NodeJS.Timeout>();

/** Start or extend an active session for a channel. */
function touchActiveSession(channelId: string): void {
  const existing = activeChannels.get(channelId);
  if (existing) clearTimeout(existing);
  activeChannels.set(
    channelId,
    setTimeout(() => activeChannels.delete(channelId), ACTIVE_SESSION_TIMEOUT_MS)
  );
}

function getAiHelpText() {
  return [
    "AI mode:",
    "Mention me or reply to one of my messages to chat with Cache.",
    "Example: `@Cache summarize what this bot can do`",
    "",
    "Hard commands use Discord slash commands such as:",
    getCommandListText()
  ].join("\n");
}

function getCommandListText() {
  const names = [...commandHandlers.keys()].map((name) => `/${name}`);
  return `Registered slash commands: ${names.join(", ")}`;
}

logger.info("Starting the program...");

(async () => {
  await db.initiate();

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
          botLog.warn(
            `No handler registered for command: /${interaction.commandName}`
          );
          return;
        }

        botLog.info(
          `/${interaction.commandName} invoked by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guildId}`
        );

        try {
          await handler(interaction);
        } catch (err) {
          botLog.error(
            `Unhandled error in /${interaction.commandName}: ${err instanceof Error ? err.message : String(err)}`
          );
          if (interaction.deferred || interaction.replied) {
            await interaction
              .editReply({
                content: "There was an error while executing this command!"
              })
              .catch(() => {});
          } else {
            await interaction
              .reply({
                content: "There was an error while executing this command!",
                flags: MessageFlags.Ephemeral
              })
              .catch(() => {});
          }
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

        const botId = client.user?.id;
        const channelId = message.channelId;

        const isMentioned = botId ? message.mentions.users.has(botId) : false;

        let isReplyToBot = false;
        if (!isMentioned && message.reference?.messageId) {
          try {
            const referenced = await message.channel.messages.fetch(message.reference.messageId);
            isReplyToBot = referenced.author.id === botId;
          } catch {
            // Referenced message deleted or inaccessible — skip
          }
        }

        const isActiveSession = activeChannels.has(channelId);

        if (!isMentioned && !isReplyToBot && !isActiveSession) return;

        // Any qualifying message extends the session window
        touchActiveSession(channelId);

        // Strip mentions so they don't appear in the prompt sent to the model
        const prompt = content.replace(/<@!?\d+>/g, "").trim();

        const respond = isActiveSession && !isMentioned && !isReplyToBot
          ? (text: string) => message.channel.send(text)
          : (text: string) => message.reply(text);

        if (!prompt) {
          await respond(getAiHelpText());
          return;
        }

        try {
          await message.channel.sendTyping();
          const sessionContext = await buildAiSessionContext(message);
          const member = await db.getMember(message.author.id).catch(() => null);
          const displayName = member?.github ?? message.author.username;
          const reply = await askCache(`${displayName}: ${prompt}`, { sessionContext });
          await respond(reply);
          void recordAiAssistantReply(message, reply).catch((err) =>
            botLog.warn("MessageHistory AI reply archive failed:", err as Error)
          );
        } catch (err) {
          botLog.error("Error during AI reply:", err as Error);
          await respond("AI chat failed. Check your Gemini API key and try again.");
        }
      });
    })
    .catch((err) => {
      logger.error(String(err));
    });
})();
