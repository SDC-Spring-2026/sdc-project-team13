import Link from "next/link";
import { loadEnvConfig } from "@next/env";
import { MessagesSquare } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../../components/ui/card";
import { Separator } from "../../../../components/ui/separator";
import { AppShell } from "../../../../components/app-shell";
import { requireWebAdmin } from "../../../../lib/adminAuth";
import { getTeamRecentMessages } from "../../../../lib/appData";
import { maskId } from "../../../../lib/redact";

export default async function TeamMessagesPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  loadEnvConfig(process.cwd());
  const { slug } = await params;
  const teamSlug = decodeURIComponent(slug);

  const { userId } = await requireWebAdmin();
  const messages = await getTeamRecentMessages(userId, teamSlug, 120);

  return (
    <AppShell
      title="Messages"
      subtitle={teamSlug}
      backHref={`/teams/${encodeURIComponent(teamSlug)}`}
      backLabel="Team"
      rightLinks={[
        {
          kind: "node",
          node: (
            <Button variant="ghost" className="h-9 px-2.5" asChild>
              <Link
                href={`/teams/${encodeURIComponent(teamSlug)}`}
                prefetch={false}
              >
                Team
              </Link>
            </Button>
          )
        }
      ]}
    >
      <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-primary" />
            Saved chat
          </CardTitle>
          <CardDescription>
            Newest first. This is the same data used for AI context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No messages yet.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">
                    {m.userId ? maskId(m.userId) : "—"}
                  </span>
                  <span className="font-mono">#{m.id}</span>
                  <span>{m.scope ?? "msg"}</span>
                  <span>{m.timestamp ?? "—"}</span>
                </div>
                <Separator className="my-2" />
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {m.content ?? "—"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
