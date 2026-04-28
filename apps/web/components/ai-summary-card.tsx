"use client";

import { useCallback, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type Props = {
  teamSlug: string;
};

type ApiResp =
  | { summary: string; generatedAt: string; model: string; teamSlug: string }
  | { error: string };

export function AiSummaryCard({ teamSlug }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResp | null>(null);

  const canShow = useMemo(() => Boolean(data && "summary" in data && data.summary), [data]);

  const run = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const r = await fetch(`/api/teams/${encodeURIComponent(teamSlug)}/ai-summary`, {
        method: "POST"
      });
      const j = (await r.json()) as ApiResp;
      setData(j);
    } catch (e) {
      setData({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:190ms]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI summary
            </CardTitle>
            <CardDescription>
              High-signal summary generated from recent saved messages.
            </CardDescription>
          </div>
          <Button variant="outline" className="h-9" onClick={() => void run()} disabled={loading}>
            {loading ? "Generating…" : "Generate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!data && (
          <div className="text-sm text-muted-foreground">
            Click generate to summarize the last ~80 saved messages.
          </div>
        )}

        {data && "error" in data && (
          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            {data.error}
          </div>
        )}

        {canShow && data && "summary" in data && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {new Date(data.generatedAt).toLocaleString()} • {data.model}
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap rounded-lg border bg-background p-3 text-sm leading-relaxed">
                {data.summary}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

