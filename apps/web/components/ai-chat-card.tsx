"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Send, Sparkles, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Markdown } from "./markdown";

type Meta = { teamSlug: string; model: string; createdAt: string };
type ChatMsg = { role: "user" | "assistant"; text: string };

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

export function AiChatCard({ teamSlug, embedded = false }: { teamSlug: string; embedded?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [prompt, setPrompt] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [stream, setStream] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const shown = useMemo(() => stream || "", [stream]);
  const canSend = Boolean(prompt.trim()) && !loading;

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const send = useCallback(async () => {
    const p = prompt.trim();
    if (!p) return;

    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPrompt("");
    setStream("");
    setMeta(null);
    setMsgs((m) => [...m, { role: "user", text: p }]);

    try {
      const r = await fetch(`/api/teams/${encodeURIComponent(teamSlug)}/ai-chat`, {
        method: "POST",
        headers: { accept: "text/event-stream", "content-type": "application/json" },
        body: JSON.stringify({ prompt: p }),
        signal: ac.signal
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        setMsgs((m) => [
          ...m,
          { role: "assistant", text: `AI chat failed (${r.status}). ${txt.slice(0, 300)}` }
        ]);
        return;
      }
      if (!r.body) {
        setMsgs((m) => [...m, { role: "assistant", text: "AI chat failed (no response body)." }]);
        return;
      }

      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      let localMeta: Meta | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        while (true) {
          const idx = buf.indexOf("\n\n");
          if (idx === -1) break;
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 2);

          const lines = raw.split("\n");
          const ev =
            lines
              .find((l) => l.startsWith("event:"))
              ?.slice("event:".length)
              .trim() ?? "message";
          const dataLine =
            lines
              .find((l) => l.startsWith("data:"))
              ?.slice("data:".length)
              .trim() ?? "";
          const payload = safeJsonParse(dataLine);

          if (ev === "meta" && isRecord(payload)) {
            localMeta = {
              teamSlug: String(payload.teamSlug ?? teamSlug),
              model: String(payload.model ?? "unknown"),
              createdAt: String(payload.createdAt ?? new Date().toISOString())
            };
            setMeta(localMeta);
          } else if (ev === "delta") {
            const delta = isRecord(payload) && typeof payload.delta === "string" ? payload.delta : "";
            if (delta) {
              full += delta;
              setStream(full);
            }
          } else if (ev === "error") {
            const err =
              isRecord(payload) && payload.error !== undefined ? String(payload.error) : "Unknown error";
            setMsgs((m) => [...m, { role: "assistant", text: `AI error: ${err}` }]);
          } else if (ev === "done") {
            setMsgs((m) => [...m, { role: "assistant", text: full.trim() }]);
            setStream("");
          }
        }
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setMsgs((m) => [...m, { role: "assistant", text: `AI chat error: ${String(e)}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [prompt, teamSlug]);

  const Inner = (
    <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask for next steps, risks, or a plan…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={loading}
          />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              {meta ? `${new Date(meta.createdAt).toLocaleString()} • ${meta.model}` : "Uses recent saved messages for context."}
            </div>
            <Button
              variant="ghost"
              className="h-8 px-2"
              onClick={() => void navigator.clipboard.writeText(msgs.map((m) => `${m.role}: ${m.text}`).join("\n\n"))}
              disabled={msgs.length === 0}
              title="Copy chat"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          {msgs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Try: “What changed recently?”, “What are the blockers?”, “Make a checklist for today.”
            </div>
          ) : (
            msgs.slice(-8).map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "rounded-lg border bg-muted/20 p-3 text-sm"
                    : "rounded-lg border bg-background p-3 text-sm"
                }
              >
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {m.role === "user" ? "You" : "Cache"}
                </div>
                {m.role === "assistant" ? (
                  <Markdown>{m.text}</Markdown>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                )}
              </div>
            ))
          )}

          {loading && shown ? (
            <div className="rounded-lg border bg-background p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                Cache (streaming)
              </div>
              <Markdown>{shown}</Markdown>
            </div>
          ) : loading ? (
            <div className="rounded-lg border bg-background p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                Cache (starting…)
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
                <div className="h-3 w-10/12 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ) : null}
        </div>
    </div>
  );

  if (embedded) return Inner;

  return (
    <Card className="group animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:30ms]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Ask Cache
            </CardTitle>
            <CardDescription>
              Streaming, transcript-aware team assistant.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Button variant="outline" className="h-9" onClick={stop}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-9"
              onClick={() => void send()}
              disabled={!canSend}
              title="Send"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{Inner}</CardContent>
    </Card>
  );
}

