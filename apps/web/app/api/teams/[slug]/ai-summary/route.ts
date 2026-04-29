import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requireWebUser } from "../../../../../lib/webAuth";
import { getTeamRecentMessages } from "../../../../../lib/appData";
import {
  GeminiAllKeysRateLimitedError,
  withGeminiKeyRotation
} from "../../../../../lib/geminiKeys";

export const dynamic = "force-dynamic";

function sseFrame(event: string, data: unknown) {
  // SSE requires double newline between events.
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function shapeTranscript(
  msgs: Array<{
    userId: string | null;
    scope: string | null;
    timestamp: string | null;
    content: string | null;
  }>,
  {
    maxLines,
    maxLineChars,
    maxTotalChars
  }: { maxLines: number; maxLineChars: number; maxTotalChars: number }
) {
  const newestLast = msgs.slice().reverse();
  const out: string[] = [];
  let total = 0;

  for (const m of newestLast.slice(-maxLines)) {
    const who = m.userId ? `user:${m.userId}` : "user:unknown";
    const scope = m.scope ? ` scope:${m.scope}` : "";
    const ts = m.timestamp ? ` ts:${m.timestamp}` : "";
    const content = (m.content ?? "").replace(/\s+/g, " ").trim();
    const line = `${who}${scope}${ts}: ${content}`.slice(0, maxLineChars);
    if (!line) continue;
    if (total + line.length + 1 > maxTotalChars) break;
    out.push(line);
    total += line.length + 1;
  }
  return out.join("\n");
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  loadEnvConfig(process.cwd());
  const { userId } = await requireWebUser();

  const { slug } = await ctx.params;
  const teamSlug = decodeURIComponent(slug);

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const msgs = await getTeamRecentMessages(userId, teamSlug, 120);
  const transcript = shapeTranscript(msgs, {
    maxLines: 100,
    maxLineChars: 600,
    maxTotalChars: 30_000
  });

  const prompt = [
    "You are an assistant summarizing a Discord project team channel.",
    "Write a high-signal summary for a dashboard. Be detailed and specific, not generic.",
    "",
    "Return MARKDOWN ONLY (no preamble).",
    "Output MUST start with `## Status` on the first line.",
    "You MUST use these exact headings (including the leading `##`).",
    "Under every heading, use `- ` bullets only (no paragraphs).",
    "Use short, skimmable bullets. Prefer bold for key nouns (e.g. **Objective**, **Owner**, **Due**).",
    "",
    "Use this exact structure and keep it crisp:",
    "## Status",
    "- (2-4 bullets)",
    "",
    "## Decisions",
    "- (bullets, only if any)",
    "",
    "## Action items",
    "- (bullets; include owner if inferable like @name; otherwise omit owner)",
    "",
    "## Risks / blockers",
    "- (bullets, only if any)",
    "",
    "## Open questions",
    "- (bullets, only if any)",
    "",
    "Constraints:",
    "- Prefer concrete next steps over vague commentary.",
    "- If the transcript seems jokey/off-topic, say so and focus on actionable items anyway.",
    "- Do NOT repeat the team slug or restate the prompt.",
    "- Never emit a plain-text label like `Status` without the `##` prefix.",
    "",
    "Mini-example of formatting (not content):",
    "## Status",
    "- **Goal**: ...",
    "- **Current**: ...",
    "",
    "## Action items",
    "- **@name**: ...",
    "",
    "Be honest when the transcript lacks info. Do not invent facts.",
    "",
    "Transcript (newest last):",
    transcript || "(no messages)"
  ].join("\n");

  const accept = request.headers.get("accept") ?? "";
  const wantsSse = accept.includes("text/event-stream");

  // Fallback non-streaming JSON response.
  if (!wantsSse) {
    try {
      const text = await withGeminiKeyRotation(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const resp = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        return (
          resp.text ??
          resp.candidates?.[0]?.content?.parts
            ?.map((p) => ("text" in p ? p.text : ""))
            .join("") ??
          ""
        ).trim();
      });

      return NextResponse.json({
        teamSlug,
        model,
        generatedAt: new Date().toISOString(),
        summary: text
      });
    } catch (e) {
      if (e instanceof GeminiAllKeysRateLimitedError) {
        return NextResponse.json(
          { error: e.message },
          {
            status: 429,
            headers: { "retry-after": String(e.retryAfterSeconds) }
          }
        );
      }
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  const enc = new TextEncoder();
  const generatedAt = new Date().toISOString();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        enc.encode(sseFrame("meta", { teamSlug, model, generatedAt }))
      );
    },
    async pull(controller) {
      // Only run once; after we finish, close. (We use pull to allow async.)
      try {
        if (request.signal.aborted) {
          controller.enqueue(
            enc.encode(sseFrame("error", { error: "aborted" }))
          );
          controller.close();
          return;
        }

        await withGeminiKeyRotation(async (apiKey) => {
          const ai = new GoogleGenAI({ apiKey });
          // @google/genai streaming: generateContentStream returns an async iterable.
          // If this API shape changes, we'll fall back to one-shot and still stream the whole text as one delta.
          const anyModels = ai.models as unknown as {
            generateContentStream?: (args: unknown) => AsyncIterable<unknown>;
            generateContent?: (args: unknown) => Promise<unknown>;
          };

          try {
            if (typeof anyModels.generateContentStream === "function") {
              const streamOrIter = anyModels.generateContentStream({
                model,
                contents: [{ role: "user", parts: [{ text: prompt }] }]
              });

              // Some versions return a Promise or an object with a `.stream` async iterable.
              const iter = (await Promise.resolve(streamOrIter)) as unknown as
                | AsyncIterable<unknown>
                | { stream?: AsyncIterable<unknown> };

              const source =
                typeof (iter as AsyncIterable<unknown>)?.[
                  Symbol.asyncIterator
                ] === "function"
                  ? (iter as AsyncIterable<unknown>)
                  : (iter as { stream?: AsyncIterable<unknown> }).stream;

              if (source) {
                for await (const chunk of source) {
                  if (request.signal.aborted) break;
                  const c = chunk as {
                    text?: string;
                    candidates?: Array<{
                      content?: { parts?: Array<{ text?: string }> };
                    }>;
                  };
                  const delta =
                    c.text ??
                    c.candidates?.[0]?.content?.parts
                      ?.map((p) => p.text ?? "")
                      .join("") ??
                    "";
                  if (delta)
                    controller.enqueue(
                      enc.encode(sseFrame("delta", { delta }))
                    );
                }
              } else {
                throw new Error("Gemini stream is not async iterable");
              }
            } else {
              throw new Error("Streaming not supported");
            }
          } catch (e) {
            const msg = String((e as Error)?.message ?? e);
            // Don't swallow quota / rate limit errors: let the key-rotation wrapper retry with another key.
            if (
              msg.includes("RESOURCE_EXHAUSTED") ||
              msg.includes("Quota exceeded") ||
              msg.includes("429")
            ) {
              throw e;
            }

            // Hard fallback: one-shot generation, then stream as a single delta.
            const resp = (await anyModels.generateContent?.({
              model,
              contents: [{ role: "user", parts: [{ text: prompt }] }]
            })) as {
              text?: string;
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
              }>;
            };

            const text =
              resp?.text ??
              resp?.candidates?.[0]?.content?.parts
                ?.map((p) => p.text ?? "")
                .join("") ??
              "";
            if (text)
              controller.enqueue(
                enc.encode(sseFrame("delta", { delta: text }))
              );
          }

          return true;
        });

        controller.enqueue(enc.encode(sseFrame("done", { ok: true })));
        controller.close();
      } catch (e) {
        if (e instanceof GeminiAllKeysRateLimitedError) {
          controller.enqueue(
            enc.encode(
              sseFrame("error", {
                error: e.message,
                retryAfterSeconds: e.retryAfterSeconds
              })
            )
          );
        } else {
          controller.enqueue(
            enc.encode(sseFrame("error", { error: String(e) }))
          );
        }
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    }
  });
}
