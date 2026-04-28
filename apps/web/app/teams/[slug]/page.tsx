import Link from "next/link";
import { loadEnvConfig } from "@next/env";
import { ArrowLeft, ArrowUpRight, MessagesSquare, Shield } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";
import { ThemeToggle } from "../../../components/theme-toggle";
import { AiSummaryCard } from "../../../components/ai-summary-card";
import { requireWebUser } from "../../../lib/webAuth";
import { getTeamOverview, getTeamRecentMessages } from "../../../lib/appData";

export default async function TeamPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  loadEnvConfig(process.cwd());
  const { slug } = await params;
  const teamSlug = decodeURIComponent(slug);

  const { userId } = await requireWebUser();
  const [team, recent] = await Promise.all([
    getTeamOverview(userId, teamSlug),
    getTeamRecentMessages(userId, teamSlug, 8)
  ]);

  const leaderCount = team.members.filter((m) => m.permLevel === 1).length;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-9 px-2" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <div className="ml-1">
              <div className="text-sm font-semibold">{team.slug}</div>
              <div className="text-xs text-muted-foreground">
                {team.projectName ?? "No active project"} •{" "}
                {team.isActive ? "Active" : "Inactive"}
              </div>
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
        <div className="flex flex-col gap-6 lg:flex-row">
          <section className="flex-1 space-y-4">
            <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Team overview
                      {leaderCount > 0 ? (
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {leaderCount} leader{leaderCount === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      The essentials—roster, repo, and recent context.
                    </CardDescription>
                  </div>

                  <Button variant="outline" className="h-9" asChild>
                    <Link href={`/teams/${encodeURIComponent(team.slug)}/messages`}>
                      Messages <MessagesSquare className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Members</div>
                    <div className="mt-1 text-lg font-semibold">
                      {team.members.length}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Project</div>
                    <div className="mt-1 text-sm font-semibold">
                      {team.projectName ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="mt-1 text-sm font-semibold">
                      {team.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>

                {team.githubRepo ? (
                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="text-xs text-muted-foreground">GitHub repo</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{team.githubRepo}</span>
                      <Button
                        variant="ghost"
                        className="h-8 px-2"
                        asChild
                        title="Open repository in GitHub"
                      >
                        <a
                          href={`https://github.com/${process.env.GITHUB_ORG ?? ""}/${team.githubRepo}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                    No GitHub repo linked yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:90ms]">
              <CardHeader>
                <CardTitle>Roster</CardTitle>
                <CardDescription>Discord ids + linked GitHub (if any)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {team.members.map((m) => (
                  <div
                    key={m.discordId}
                    className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs">
                        {m.discordId}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.github ? `GitHub: ${m.github}` : "GitHub: —"}
                      </div>
                    </div>
                    <div className="ml-3">
                      {m.permLevel === 1 ? (
                        <Badge className="gap-1">
                          <Shield className="h-3 w-3" />
                          Leader
                        </Badge>
                      ) : (
                        <Badge variant="outline">Member</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <aside className="w-full space-y-4 lg:w-[360px]">
            <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:140ms]">
              <CardHeader>
                <CardTitle>Recent saved chat</CardTitle>
                <CardDescription>
                  Latest messages stored in <span className="font-mono">MessageHistory</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recent.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No saved messages yet.
                  </div>
                ) : (
                  recent.map((msg) => (
                    <div key={msg.id} className="rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="truncate font-mono">
                          {msg.userId ?? "—"}
                        </span>
                        <span className="shrink-0">{msg.scope ?? "msg"}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="line-clamp-4 text-sm">
                        {msg.content ?? "—"}
                      </div>
                    </div>
                  ))
                )}

                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/teams/${encodeURIComponent(team.slug)}/messages`}>
                    Browse messages <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <AiSummaryCard teamSlug={team.slug} />
          </aside>
        </div>
      </main>
    </div>
  );
}

