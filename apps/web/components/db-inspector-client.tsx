"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Database, RefreshCcw } from "lucide-react";
import {
  columnHeading,
  sortInspectorTabKeys,
  tabIntro,
  tabTitle
} from "../lib/dbInspectorCopy";
import { AppShell } from "./app-shell";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";

type Snapshot =
  | {
      driver: "postgres";
      tablePrefix?: string;
      tables: Record<string, Record<string, unknown>[]>;
    }
  | {
      driver: "sqlite";
      path: string;
      tablePrefix?: string;
      tables: Record<string, Record<string, unknown>[]>;
    }
  | { error: string; cwd?: string };

export function DbInspectorClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/db/snapshot", { cache: "no-store" });
      const j = (await r.json()) as Snapshot;
      setData(j);
      if ("tables" in j && j.tables) {
        const sorted = sortInspectorTabKeys(Object.keys(j.tables));
        if (sorted[0]) setTab(sorted[0]);
      }
    } catch (e) {
      setData({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tables = data && "tables" in data && data.tables ? data.tables : null;
  const keys = tables ? sortInspectorTabKeys(Object.keys(tables)) : [];
  const rows = tables && tab ? (tables[tab] ?? []) : [];
  const columns =
    rows.length > 0 && typeof rows[0] === "object" && rows[0] !== null
      ? Object.keys(rows[0] as object)
      : [];

  const intro = tab ? tabIntro(tab) : null;

  return (
    <AppShell
      title="DB inspector"
      subtitle="Read-only snapshot (admin only)"
      backHref="/dashboard"
      backLabel="Dashboard"
      rightLinks={[
        {
          kind: "node",
          node: (
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4" />
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          )
        }
      ]}
    >
      <div className="space-y-6">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              What’s in the database
            </CardTitle>
            <CardDescription>
              Read-only snapshot of the same data the Discord bot uses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="font-medium text-foreground">Tip</div>
              <div className="mt-1">
                If{" "}
                <span className="font-medium text-foreground">
                  Club directory (GitHub)
                </span>{" "}
                is empty but{" "}
                <span className="font-medium text-foreground">Team roster</span>{" "}
                has rows, that’s normal—roster is “who is on the team”.
              </div>
            </div>

            {loading ? (
              <div>Loading…</div>
            ) : data && "error" in data ? (
              <div className="rounded-lg border bg-destructive/5 p-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Snapshot error</div>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border bg-background p-3 text-xs">
                  {data.error}
                  {data.cwd ? `\ncwd: ${data.cwd}` : ""}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {!loading && data && "driver" in data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">
                Storage: {data.driver === "postgres" ? "Postgres" : "SQLite"}
              </Badge>
              {"path" in data && data.driver === "sqlite" ? (
                <Badge variant="outline" className="font-mono">
                  {data.path}
                </Badge>
              ) : null}
              {data.tablePrefix ? (
                <Badge variant="outline" className="font-mono">
                  prefix: {data.tablePrefix}_
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {keys.map((k) => {
                const title = tabTitle(k);
                const count = tables?.[k]?.length ?? 0;
                const active = tab === k;
                return (
                  <Button
                    key={k}
                    type="button"
                    variant={active ? "default" : "outline"}
                    className="h-auto items-start px-3 py-2"
                    onClick={() => setTab(k)}
                  >
                    <div className="text-left leading-tight">
                      <div className="text-sm font-medium">{title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {count} row{count === 1 ? "" : "s"}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            {intro ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  {intro}
                </CardContent>
              </Card>
            ) : null}

            <div className="text-xs text-muted-foreground">
              Internal table name: <span className="font-mono">{tab || "—"}</span>
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="max-h-[65dvh] overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-muted/40 backdrop-blur">
                      <tr className="border-b">
                        {columns.map((c) => (
                          <th
                            key={c}
                            className="p-3 text-left align-bottom text-xs font-semibold"
                          >
                            <div className="text-foreground">
                              {columnHeading(tab, c)}
                            </div>
                            <div className="mt-1 font-mono text-[11px] font-normal text-muted-foreground">
                              {c}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className={i % 2 ? "bg-muted/10" : ""}>
                          {columns.map((c) => (
                            <td
                              key={c}
                              className="max-w-[420px] whitespace-pre-wrap break-words border-b p-3 align-top text-sm"
                            >
                              {formatCell((row as Record<string, unknown>)[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Separator />
            <div className="text-sm text-muted-foreground">
              <Link href="/" className="underline underline-offset-4">
                ← Back to home
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

