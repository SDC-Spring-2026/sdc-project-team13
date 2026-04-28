import { CACHE_BOT_INSTRUCTIONS } from "./botInstructions";

const DEFAULT_MODEL = "gemini-2.5-flash";

type GoogleGenAI = import("@google/genai", { with: { "resolution-mode": "import" } }).GoogleGenAI;
let ai: GoogleGenAI | null = null;

async function getAiClient(): Promise<GoogleGenAI | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!ai) {
    const { GoogleGenAI } = await import("@google/genai");
    ai = new GoogleGenAI({ apiKey });
  }

  return ai;
}

export async function askCache(
  prompt: string,
  options?: { sessionContext?: string }
): Promise<string> {
  const client = await getAiClient();

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

  let response;
  try {
    response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents,
      config: {
        systemInstruction: CACHE_BOT_INSTRUCTIONS
      }
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      if (parsed?.error?.message) return parsed.error.message;
    } catch {
      // Not a JSON payload — fall through and rethrow
    }
    throw err;
  }

  const text = response.text?.trim();
  return text && text.length > 0
    ? text
    : "I couldn't generate a response right now. Please try again.";
}
