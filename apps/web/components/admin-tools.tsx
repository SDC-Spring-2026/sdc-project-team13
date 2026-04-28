"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";

type Diagnostics = {
  ok: boolean;
  missing: string[];
  userId: string;
  isAdmin: boolean;
  isPresident: boolean;
  error?: string;
};

type Repair = {
  scannedTeams: number;
  fixedLeaderTeams: number;
  fixedActiveFlagTeams: number;
  notes: string[];
  error?: string;
};

export function AdminTools() {
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const [repair, setRepair] = useState<Repair | null>(null);
  const [repairLoading, setRepairLoading] = useState(false);

  const [auditChannelId, setAuditChannelId] = useState<string>("");
  const [auditLoading, setAuditLoading] = useState(false);

  const loadDiag = useCallback(async () => {
    setDiagLoading(true);
    try {
      const r = await fetch("/api/admin/diagnostics", { cache: "no-store" });
      const j = (await r.json()) as Diagnostics;
      setDiag(j);
    } finally {
      setDiagLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const r = await fetch("/api/admin/audit-log", { cache: "no-store" });
      const j = (await r.json()) as { channelId: string | null };
      setAuditChannelId(j.channelId ?? "");
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDiag();
    void loadAudit();
  }, [loadAudit, loadDiag]);

  const runRepair = useCallback(async () => {
    setRepairLoading(true);
    setRepair(null);
    try {
      const r = await fetch("/api/admin/db-repair", { method: "POST" });
      const j = (await r.json()) as Repair;
      setRepair(j);
    } finally {
      setRepairLoading(false);
    }
  }, []);

  const saveAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      await fetch("/api/admin/audit-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelId: auditChannelId || null })
      });
      await loadAudit();
    } finally {
      setAuditLoading(false);
    }
  }, [auditChannelId, loadAudit]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Diagnostics</CardTitle>
          <CardDescription>Server-side checks for env + DB connectivity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-9" onClick={() => void loadDiag()} disabled={diagLoading}>
              {diagLoading ? "Checking…" : "Re-run"}
            </Button>
          </div>
          {diag ? (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {diag.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-primary" />
                )}
                {diag.ok ? "OK" : "Needs attention"}
              </div>
              <div className="mt-2 text-muted-foreground">
                Signed in: <span className="font-mono">{diag.userId}</span>
              </div>
              <div className="mt-1 text-muted-foreground">
                Admin flags: {diag.isAdmin ? "admin" : "—"} {diag.isPresident ? "president" : "—"}
              </div>
              {diag.missing?.length ? (
                <div className="mt-2 text-muted-foreground">
                  Missing: {diag.missing.map((m) => <code key={m} className="ml-1">{m}</code>)}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            DB repair (safe)
          </CardTitle>
          <CardDescription>
            Fixes a few consistency issues in the database only (no Discord/GitHub side-effects).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="h-9" onClick={() => void runRepair()} disabled={repairLoading}>
            {repairLoading ? "Repairing…" : "Run repair"}
          </Button>
          {repair ? (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              <div>
                Scanned teams: <span className="font-medium text-foreground">{repair.scannedTeams}</span>
              </div>
              <div>
                Fixed missing leaders: <span className="font-medium text-foreground">{repair.fixedLeaderTeams}</span>
              </div>
              <div>
                Fixed inactive-but-mapped teams: <span className="font-medium text-foreground">{repair.fixedActiveFlagTeams}</span>
              </div>
              {repair.notes?.length ? (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-1">
                    {repair.notes.slice(0, 8).map((n, i) => (
                      <div key={i} className="font-mono text-xs">{n}</div>
                    ))}
                    {repair.notes.length > 8 ? (
                      <div className="text-xs">…and {repair.notes.length - 8} more</div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit log channel</CardTitle>
          <CardDescription>
            Stored in DB (`botConfig`). The bot will post admin actions here when configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="audit">Channel ID</Label>
            <Input
              id="audit"
              placeholder="123456789012345678"
              value={auditChannelId}
              onChange={(e) => setAuditChannelId(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-9" onClick={() => void loadAudit()} disabled={auditLoading}>
              Refresh
            </Button>
            <Button className="h-9" onClick={() => void saveAudit()} disabled={auditLoading}>
              Save
            </Button>
            <Button
              variant="ghost"
              className="h-9"
              onClick={() => setAuditChannelId("")}
              disabled={auditLoading}
            >
              Clear
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Tip: easiest is to run `/admin audit_log set` in Discord; this UI is a fallback.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

