"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Sparkles, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Markdown } from "./markdown";

type Props = {
  teamSlug: string;
  auto?: boolean;
  embedded?: boolean;
  compactHeader?: boolean;
};

type Meta = { generatedAt: string; model: string; teamSlug: string };
type ApiResp = { summary: string; meta: Meta } | { error: string };

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

export function AiSummaryCard({ teamSlug, auto = true, embedded = false, compactHeader = true }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResp | null>(null);
  const [streamText, setStreamText] = useState<string>("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canShow = useMemo(() => {
    if (data && "summary" in data && data.summary) return true;
    return Boolean(streamText.trim());
  }, [data, streamText]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStreamText("");
    setMeta(null);
    setData(null);
    try {
      const r = await fetch(
        `/api/teams/${encodeURIComponent(teamSlug)}/ai-summary`,
        {
          method: "POST",
          headers: { accept: "text/event-stream" },
          signal: ac.signal
        }
      );

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        setData({ error: `AI summary failed (${r.status}): ${txt.slice(0, 500)}` });
        return;
      }

      const ct = r.headers.get("content-type") ?? "";
      if (!ct.includes("text/event-stream") || !r.body) {
        // Fallback: JSON
        const j = (await r.json()) as { summary?: string; generatedAt?: string; model?: string; teamSlug?: string; error?: string };
        if (j?.error) setData({ error: j.error });
        else {
          setData({
            summary: j.summary ?? "",
            meta: {
              generatedAt: j.generatedAt ?? new Date().toISOString(),
              model: j.model ?? "unknown",
              teamSlug: j.teamSlug ?? teamSlug
            }
          });
        }
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

        // Parse SSE frames separated by blank line.
        while (true) {
          const idx = buf.indexOf("\n\n");
          if (idx === -1) break;
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 2);

          const lines = raw.split("\n");
          const ev = lines.find((l) => l.startsWith("event:"))?.slice("event:".length).trim() ?? "message";
          const dataLine = lines.find((l) => l.startsWith("data:"))?.slice("data:".length).trim() ?? "";
          const payload = safeJsonParse(dataLine);

          if (ev === "meta" && isRecord(payload)) {
            localMeta = {
              generatedAt: String(payload.generatedAt ?? new Date().toISOString()),
              model: String(payload.model ?? "unknown"),
              teamSlug: String(payload.teamSlug ?? teamSlug)
            };
            setMeta(localMeta);
          } else if (ev === "delta") {
            const delta = isRecord(payload) && typeof payload.delta === "string" ? payload.delta : "";
            if (delta) {
              full += delta;
              setStreamText(full);
            }
          } else if (ev === "error") {
            const err =
              isRecord(payload) && payload.error !== undefined
                ? String(payload.error)
                : "Unknown error";
            setData({ error: err });
          } else if (ev === "done") {
            // finalize into data so we can keep it if user regenerates
            setData({
              summary: full.trim(),
              meta:
                localMeta ??
                ({
                  generatedAt: new Date().toISOString(),
                  model: "unknown",
                  teamSlug
                } satisfies Meta)
            });
          }
        }
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setData({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => {
    if (!auto) return;
    // Only auto-run once when empty.
    if (data || streamText) return;
    void run();
  }, [auto, data, run, streamText]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const shownSummary =
    (data && "summary" in data ? data.summary : "") || streamText;
  const shownMeta = data && "summary" in data ? data.meta : meta;

  const TopRow = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          {compactHeader ? (
            <div className="text-xs text-muted-foreground">
              {shownMeta
                ? `${new Date(shownMeta.generatedAt).toLocaleString()} • ${shownMeta.model}`
                : loading
                  ? "Generating…"
                  : "Ready"}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                AI summary
              </div>
              <div className="text-xs text-muted-foreground">
                High-signal summary generated from recent saved messages.
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Button variant="outline" className="h-9" onClick={stop}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          ) : null}
          <Button variant="outline" className="h-9" onClick={() => void run()} disabled={loading}>
            {loading ? "Generating…" : "Refresh"}
          </Button>
        </div>
      </div>

      <Separator className="my-4" />
    </>
  );

  const Inner = (
    <>
      {embedded ? TopRow : null}

      {loading && !streamText && (
          <div className="space-y-3">
            <div className="h-2 w-40 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-3 w-10/12 animate-pulse rounded bg-muted" />
            </div>
          </div>
        )}

      {!data && !streamText && !loading && (
          <div className="text-sm text-muted-foreground">
            Click generate to summarize recent saved messages.
          </div>
        )}

      {data && "error" in data && (
          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            {data.error}
          </div>
        )}

      {canShow && (
          <div className="space-y-2">
            {!embedded ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {shownMeta ? (
                      <>
                        {new Date(shownMeta.generatedAt).toLocaleString()} •{" "}
                        {shownMeta.model}
                      </>
                    ) : (
                      "Generating…"
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => void navigator.clipboard.writeText(shownSummary)}
                    disabled={!shownSummary.trim()}
                    title="Copy summary"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                </div>
                <Separator />
              </>
            ) : (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => void navigator.clipboard.writeText(shownSummary)}
                  disabled={!shownSummary.trim()}
                  title="Copy summary"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy</span>
                </Button>
              </div>
            )}
            <Markdown>{shownSummary}</Markdown>
          </div>
        )}
    </>
  );

  if (embedded) return <div className="space-y-3">{Inner}</div>;

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:190ms]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI summary
        </CardTitle>
        <CardDescription>
          High-signal summary generated from recent saved messages.
        </CardDescription>
      </CardHeader>
      <CardContent>{Inner}</CardContent>
    </Card>
  );
}

