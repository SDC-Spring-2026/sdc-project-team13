import { CACHE_BOT_INSTRUCTIONS } from "./botInstructions";
import {
  GeminiAllKeysRateLimitedError,
  hasGeminiKeysConfigured,
  withGeminiKeyRotation
} from "./geminiKeys";

const DEFAULT_MODEL = "gemini-2.5-flash";

type GoogleGenAI = import("@google/genai", {
  with: { "resolution-mode": "import" }
}).GoogleGenAI;

async function generateWithKey(
  apiKey: string,
  contents: string,
  model: string
): Promise<{ text?: string | null }> {
  const { GoogleGenAI } = await import("@google/genai");
  const client: GoogleGenAI = new GoogleGenAI({ apiKey });

  try {
    return await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: CACHE_BOT_INSTRUCTIONS
      }
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      if (parsed?.error?.message) {
        throw new Error(parsed.error.message);
      }
    } catch {
      // Not JSON payload — preserve original throw
    }
    throw err;
  }
}

export async function askCache(
  prompt: string,
  options?: { sessionContext?: string }
): Promise<string> {
  if (!hasGeminiKeysConfigured()) {
    return (
      "AI chat is not configured yet. Add `GEMINI_API_KEY_1` (and optionally `GEMINI_API_KEY_2` / `GEMINI_API_KEY_3`), " +
      "or legacy `GEMINI_API_KEY`, to your `.env` file."
    );
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

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const text = await withGeminiKeyRotation(async (apiKey) => {
      const response = await generateWithKey(apiKey, contents, model);
      return response.text?.trim() ?? "";
    });

    return text.length > 0
      ? text
      : "I couldn't generate a response right now. Please try again.";
  } catch (e) {
    if (e instanceof GeminiAllKeysRateLimitedError) {
      return (
        `Gemini rate limit (all keys cooling down). Please try again in ~${e.retryAfterSeconds}s.`
      );
    }

    const raw = e instanceof Error ? e.message : String(e);
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      if (parsed?.error?.message) return parsed.error.message;
    } catch {
      // fall through
    }

    throw e;
  }
}
