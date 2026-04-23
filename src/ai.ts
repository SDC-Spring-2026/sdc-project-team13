import { GoogleGenAI } from "@google/genai";
import { CACHE_BOT_INSTRUCTIONS } from "./botInstructions";

const DEFAULT_MODEL = "gemini-2.5-flash";

let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }

  return ai;
}

export async function askCache(
  prompt: string,
  options?: { sessionContext?: string }
): Promise<string> {
  const client = getAiClient();

  if (!client) {
    return "AI chat is not configured yet. Add `GEMINI_API_KEY` to your `.env` file.";
  }

  const ctx = options?.sessionContext?.trim();
  const contents = ctx
    ? [
        "Session context (from this Discord server and Cache database only; treat as facts for this turn):",
        ctx,
        "",
        "User message:",
        prompt
      ].join("\n")
    : prompt;

  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    contents,
    config: {
      systemInstruction: CACHE_BOT_INSTRUCTIONS
    }
  });

  const text = response.text?.trim();
  return text && text.length > 0
    ? text
    : "I couldn't generate a response right now. Please try again.";
}
