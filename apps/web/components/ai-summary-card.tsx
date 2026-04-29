"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Loader2, Sparkles, Square } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Separator } from "./ui/separator";
import { Markdown } from "./markdown";
import { StreamingBar } from "./ui/streaming-bar";

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

function parseRetryAfterSeconds(txt: string): number | null {
  // Common shapes we see from Gemini errors:
  // - `Please retry in 37.6s.`
  // - `"retryDelay":"37s"`
  const m1 = txt.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (m1) return Math.max(1, Math.ceil(Number(m1[1])));
  const m2 = txt.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (m2) return Math.max(1, Number(m2[1]));
  return null;
}

export function AiSummaryCard({
  teamSlug,
  auto = true,
  embedded = false,
  compactHeader = true
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResp | null>(null);
  const [streamText, setStreamText] = useState<string>("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cooldownUntilMs, setCooldownUntilMs] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoRanRef = useRef(false);

  const canShow = useMemo(() => {
    if (data && "summary" in data && data.summary) return true;
    return Boolean(streamText.trim());
  }, [data, streamText]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    // New team => allow auto-run again.
    autoRanRef.current = false;
    setCooldownUntilMs(null);
  }, [teamSlug]);

  const run = useCallback(async () => {
    const now = Date.now();
    if (cooldownUntilMs && now < cooldownUntilMs) {
      const secs = Math.max(1, Math.ceil((cooldownUntilMs - now) / 1000));
      setData({ error: `Rate limited. Please retry in ~${secs}s.` });
      return;
    }

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
        if (r.status === 429) {
          const retryAfterHeader = r.headers.get("retry-after");
          const retryAfter =
            (retryAfterHeader ? Number(retryAfterHeader) : NaN) ||
            parseRetryAfterSeconds(txt) ||
            30;
          setCooldownUntilMs(Date.now() + retryAfter * 1000);
          setData({
            error: `Rate limited (429). Please retry in ~${retryAfter}s.`
          });
          return;
        }
        setData({
          error: `AI summary failed (${r.status}): ${txt.slice(0, 500)}`
        });
        return;
      }

      const ct = r.headers.get("content-type") ?? "";
      if (!ct.includes("text/event-stream") || !r.body) {
        // Fallback: JSON
        const j = (await r.json()) as {
          summary?: string;
          generatedAt?: string;
          model?: string;
          teamSlug?: string;
          error?: string;
        };
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
              generatedAt: String(
                payload.generatedAt ?? new Date().toISOString()
              ),
              model: String(payload.model ?? "unknown"),
              teamSlug: String(payload.teamSlug ?? teamSlug)
            };
            setMeta(localMeta);
          } else if (ev === "delta") {
            const delta =
              isRecord(payload) && typeof payload.delta === "string"
                ? payload.delta
                : "";
            if (delta) {
              full += delta;
              setStreamText(full);
            }
          } else if (ev === "error") {
            const err =
              isRecord(payload) && payload.error !== undefined
                ? String(payload.error)
                : "Unknown error";
            const retryAfter = parseRetryAfterSeconds(err);
            if (retryAfter) setCooldownUntilMs(Date.now() + retryAfter * 1000);
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
    if (loading) return;
    // Only auto-run once when empty; otherwise this can loop because run() clears state.
    if (autoRanRef.current) return;
    if (data || streamText) return;
    if (cooldownUntilMs && Date.now() < cooldownUntilMs) return;
    autoRanRef.current = true;
    void run();
  }, [auto, cooldownUntilMs, data, loading, run, streamText]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const shownSummary =
    (data && "summary" in data ? data.summary : "") || streamText;
  const shownMeta = data && "summary" in data ? data.meta : meta;
  const cooldownLeftSeconds = useMemo(() => {
    if (!cooldownUntilMs) return 0;
    return Math.max(0, Math.ceil((cooldownUntilMs - Date.now()) / 1000));
  }, [cooldownUntilMs, data, streamText, loading]);

  const TopRow = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          {compactHeader ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {loading ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground ring-1 ring-inset ring-border">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  Generating
                </span>
              ) : null}
              <span className="truncate">
                {shownMeta
                  ? `${new Date(shownMeta.generatedAt).toLocaleString()} • ${shownMeta.model}`
                  : loading
                    ? "Connecting…"
                    : "Ready"}
              </span>
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
          <Button
            variant="outline"
            className="h-9"
            onClick={() => void run()}
            disabled={loading || cooldownLeftSeconds > 0}
            title={
              cooldownLeftSeconds > 0
                ? `Rate limited. Try again in ~${cooldownLeftSeconds}s.`
                : "Generate"
            }
          >
            {loading
              ? "Generating…"
              : cooldownLeftSeconds > 0
                ? `Retry in ${cooldownLeftSeconds}s`
                : "Refresh"}
          </Button>
        </div>
      </div>

      <Separator className="my-4" />
    </>
  );

  const Inner = (
    <>
      {embedded ? TopRow : null}

      {loading && (
        <div className="rounded-lg border bg-background/50 p-2">
          <StreamingBar
            active
            label={streamText ? "Streaming summary…" : "Preparing response…"}
          />
        </div>
      )}

      {loading && !streamText ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-10/12 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-3 w-9/12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ) : null}

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
                  onClick={() =>
                    void navigator.clipboard.writeText(shownSummary)
                  }
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
          <div className="relative rounded-xl border bg-background/40 p-3">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <StreamingBar
              active={loading && Boolean(streamText)}
              className="mb-3"
            />
            <Markdown streaming={loading && Boolean(streamText)}>
              {shownSummary}
            </Markdown>
          </div>
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
