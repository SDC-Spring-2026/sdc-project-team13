import Link from "next/link";
import { loadEnvConfig } from "@next/env";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Separator } from "../../../../components/ui/separator";
import { ThemeToggle } from "../../../../components/theme-toggle";
import { requireWebUser } from "../../../../lib/webAuth";
import { getTeamRecentMessages } from "../../../../lib/appData";

export default async function TeamMessagesPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  loadEnvConfig(process.cwd());
  const { slug } = await params;
  const teamSlug = decodeURIComponent(slug);

  const { userId } = await requireWebUser();
  const messages = await getTeamRecentMessages(userId, teamSlug, 120);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-9 px-2" asChild>
              <Link href={`/teams/${encodeURIComponent(teamSlug)}`}>
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Team</span>
              </Link>
            </Button>
            <div className="ml-1">
              <div className="text-sm font-semibold">Messages</div>
              <div className="text-xs text-muted-foreground">{teamSlug}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form method="post" action="/api/auth/logout" className="ml-1">
              <Button variant="outline" className="h-9">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8">
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
              <div className="text-sm text-muted-foreground">No messages yet.</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="rounded-lg border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{m.userId ?? "—"}</span>
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
      </main>
    </div>
  );
}

