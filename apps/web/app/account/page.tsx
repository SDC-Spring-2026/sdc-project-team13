import { loadEnvConfig } from "@next/env";
import { Shield, User } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../components/ui/card";
import { requireWebUser } from "../../lib/webAuth";
import { openWebDb } from "../../lib/webDb";
import { tbl } from "../../lib/physicalTables";
import {
  getDiscordDisplayName,
  getWebAdminFlags
} from "../../lib/discordBotApi";

export default async function AccountPage() {
  loadEnvConfig(process.cwd());
  const { userId } = await requireWebUser();
  const flags = await getWebAdminFlags(userId).catch(() => ({
    isAdmin: false,
    isPresident: false
  }));
  const displayName = await getDiscordDisplayName(userId).catch(() => null);

  const conn = openWebDb();
  try {
    let github: string | null = null;
    let registered = false;
    if (conn.driver === "postgres") {
      const r = await conn.pool.query(
        `SELECT github FROM ${tbl("members")} WHERE discord = $1 LIMIT 1`,
        [userId]
      );
      const row = r.rows[0] as { github: string | null } | undefined;
      github = row?.github ?? null;
      registered = Boolean(row);
    } else {
      const row = conn.db
        .prepare(
          `SELECT github FROM ${tbl("members")} WHERE discord = ? LIMIT 1`
        )
        .get(userId) as { github: string | null } | undefined;
      github = row?.github ?? null;
      registered = Boolean(row);
    }

    return (
      <AppShell
        title="Account"
        subtitle="Profile + access"
        backHref="/dashboard"
        backLabel="Dashboard"
      >
        <div className="space-y-4">
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Signed in
              </CardTitle>
              <CardDescription>
                Discord:{" "}
                <span className="font-medium text-foreground">
                  {displayName ?? "Signed in"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={registered ? "secondary" : "outline"}>
                  {registered ? "Registered" : "Not registered"}
                </Badge>
                {flags.isAdmin ? (
                  <Badge className="gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                ) : null}
                {flags.isPresident ? (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    President
                  </Badge>
                ) : null}
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">
                  Linked GitHub
                </div>
                <div className="mt-1 font-medium text-foreground">
                  {github ?? "—"}
                </div>
              </div>

              <div className="text-xs">
                This page intentionally avoids showing raw IDs or any private
                credentials.
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  } finally {
    if (conn.driver === "postgres") await conn.close();
    else conn.close();
  }
}
