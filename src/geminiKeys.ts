/**
 * Gemini API key rotation (Discord bot).
 * Mirrors `apps/web/lib/geminiKeys.ts` behavior: round-robin with per-key cooldown on 429/quota.
 */

type KeyEntry = {
  key: string;
  id: string;
  cooldownUntilMs: number;
};

let cursor = 0;
let entries: KeyEntry[] | null = null;

function loadEntriesFromEnv(): KeyEntry[] {
  const raw = [
    { id: "1", v: process.env.GEMINI_API_KEY_1 },
    { id: "2", v: process.env.GEMINI_API_KEY_2 },
    { id: "3", v: process.env.GEMINI_API_KEY_3 },
    { id: "default", v: process.env.GEMINI_API_KEY }
  ]
    .map((x) => ({ id: x.id, key: (x.v ?? "").trim() }))
    .filter((x) => x.key.length > 0);

  const uniq = new Map<string, KeyEntry>();
  for (const r of raw) {
    if (!uniq.has(r.key)) {
      uniq.set(r.key, { key: r.key, id: r.id, cooldownUntilMs: 0 });
    }
  }

  return [...uniq.values()];
}

function ensureEntriesLoaded() {
  if (!entries) entries = loadEntriesFromEnv();
  return entries;
}

export function hasGeminiKeysConfigured(): boolean {
  return loadEntriesFromEnv().length > 0;
}

export function parseRetryAfterSeconds(txt: string): number | null {
  const m1 = txt.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (m1) return Math.max(1, Math.ceil(Number(m1[1])));
  const m2 = txt.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (m2) return Math.max(1, Number(m2[1]));
  return null;
}

export class GeminiAllKeysRateLimitedError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(`All Gemini API keys are rate limited. Retry after ~${retryAfterSeconds}s.`);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function markGeminiKeyCooldown(apiKey: string, retryAfterSeconds: number) {
  const es = ensureEntriesLoaded();
  const e = es.find((x) => x.key === apiKey);
  if (!e) return;
  e.cooldownUntilMs = Math.max(e.cooldownUntilMs, Date.now() + retryAfterSeconds * 1000);
}

export function chooseGeminiApiKey(): { apiKey: string; keyId: string } {
  const es = ensureEntriesLoaded();
  if (es.length === 0) {
    throw new Error(
      "Missing Gemini API keys. Set GEMINI_API_KEY_1 (and optionally GEMINI_API_KEY_2 / _3), or GEMINI_API_KEY."
    );
  }

  const now = Date.now();
  const n = es.length;

  for (let i = 0; i < n; i++) {
    const idx = (cursor + i) % n;
    const e = es[idx];
    if (e.cooldownUntilMs <= now) {
      cursor = (idx + 1) % n;
      return { apiKey: e.key, keyId: e.id };
    }
  }

  const soonest = es.reduce(
    (acc, e) => Math.min(acc, e.cooldownUntilMs),
    Number.POSITIVE_INFINITY
  );
  const retryAfterSeconds = Math.max(1, Math.ceil((soonest - now) / 1000));
  throw new GeminiAllKeysRateLimitedError(retryAfterSeconds);
}

export async function withGeminiKeyRotation<T>(fn: (apiKey: string) => Promise<T>): Promise<T> {
  const es = ensureEntriesLoaded();
  const maxAttempts = Math.max(1, es.length);
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { apiKey } = chooseGeminiApiKey();
    try {
      return await fn(apiKey);
    } catch (e) {
      lastErr = e;
      const msg = stringifyErr(e);
      const retryAfter = parseRetryAfterSeconds(msg);
      if (
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("Quota exceeded") ||
        msg.includes("429")
      ) {
        markGeminiKeyCooldown(apiKey, retryAfter ?? 30);
        continue;
      }
      throw e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Extract message from Gemini / fetch errors that may stringify badly */
function stringifyErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
