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

type ReqBody = { prompt?: string };

export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  loadEnvConfig(process.cwd());
  const { userId } = await requireWebUser();

  const { slug } = await ctx.params;
  const teamSlug = decodeURIComponent(slug);

  const body = (await request.json().catch(() => null)) as ReqBody | null;
  const promptRaw = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!promptRaw) {
    return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const msgs = await getTeamRecentMessages(userId, teamSlug, 200);
  const transcript = shapeTranscript(msgs, {
    maxLines: 120,
    maxLineChars: 600,
    maxTotalChars: 45_000
  });

  const system = [
    "You are Cache, an assistant helping a Discord project team.",
    "Be concrete and high-signal. Prefer bullet points, checklists, and short headings.",
    "If you don't have evidence in the transcript, say so.",
    "When asked for a plan, propose a short plan + next actions.",
    "Always use markdown formatting (headings + lists).",
    "If you write multiple sentences, you should probably be using bullets instead.",
    "Avoid repetition. Do not restate the user's question verbatim unless necessary.",
    "",
    "Transcript (newest last):",
    transcript || "(no messages)"
  ].join("\n");

  const enc = new TextEncoder();
  const createdAt = new Date().toISOString();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        enc.encode(sseFrame("meta", { teamSlug, model, createdAt }))
      );
    },
    async pull(controller) {
      try {
        if (request.signal.aborted) {
          controller.enqueue(
            enc.encode(sseFrame("error", { error: "aborted" }))
          );
          controller.close();
          return;
        }

        const contents = [
          { role: "user", parts: [{ text: system }] },
          {
            role: "user",
            parts: [{ text: `User (${userId}) asks: ${promptRaw}` }]
          }
        ];

        await withGeminiKeyRotation(async (apiKey) => {
          const ai = new GoogleGenAI({ apiKey });
          const anyModels = ai.models as unknown as {
            generateContentStream?: (args: unknown) => AsyncIterable<unknown>;
            generateContent?: (args: unknown) => Promise<unknown>;
          };

          try {
            if (typeof anyModels.generateContentStream === "function") {
              const streamOrIter = anyModels.generateContentStream({
                model,
                contents
              });

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
            if (
              msg.includes("RESOURCE_EXHAUSTED") ||
              msg.includes("Quota exceeded") ||
              msg.includes("429")
            ) {
              throw e;
            }

            const resp = (await anyModels.generateContent?.({
              model,
              contents
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
