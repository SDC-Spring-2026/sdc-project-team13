import { Message } from "discord.js";
import { db } from "../database";
import { resolveTeamForMessage } from "./teamFromMessage";

const MAX_STORED_LEN = 2000;

/**
 * Persist a normal Discord message into MessageHistory when it occurs in a
 * channel that maps to a team (linked channel or project-name fallback).
 */
export async function recordUserChannelMessage(
  message: Message
): Promise<void> {
  if (message.author.bot || message.partial) return;

  const text = message.content?.trim() ?? "";
  if (!text) return;

  const { team } = await resolveTeamForMessage(message);
  if (!team) return;

  await db.storeMessage(
    team.slug,
    message.author.id,
    message.createdAt.toISOString(),
    "discord",
    text.slice(0, MAX_STORED_LEN)
  );
}

/**
 * Persist the bot's AI reply for the same team context as the user's message.
 */
export async function recordAiAssistantReply(
  message: Message,
  replyText: string
): Promise<void> {
  if (message.partial) return;

  const { team } = await resolveTeamForMessage(message);
  if (!team) return;

  const botId = message.client.user?.id ?? "cache";
  await db.storeMessage(
    team.slug,
    botId,
    new Date().toISOString(),
    "ai-assistant",
    replyText.trim().slice(0, MAX_STORED_LEN)
  );
}
