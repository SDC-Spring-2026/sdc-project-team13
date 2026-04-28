import { loadEnvConfig } from "@next/env";
import { Shield } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { requireWebAdmin } from "../../lib/adminAuth";
import { AdminTools } from "../../components/admin-tools";
import { maskId } from "../../lib/redact";

export default async function AdminPage() {
  loadEnvConfig(process.cwd());
  const { userId, isAdmin, isPresident } = await requireWebAdmin();

  return (
    <AppShell
      title="Admin"
      subtitle="Diagnostics, repair, and bot configuration"
      backHref="/dashboard"
      backLabel="Dashboard"
    >
      <div className="space-y-6">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Admin access
            </CardTitle>
            <CardDescription>
              You’re signed in as <span className="font-mono">{maskId(userId)}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Role flags: {isAdmin ? "admin" : "—"} {isPresident ? "president" : "—"}
          </CardContent>
        </Card>

        <AdminTools />
      </div>
    </AppShell>
  );
}

