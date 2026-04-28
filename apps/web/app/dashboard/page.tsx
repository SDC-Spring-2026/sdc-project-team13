import Link from "next/link";
import { loadEnvConfig } from "@next/env";
import { ArrowUpRight, LayoutGrid, Shield, User } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { ThemeToggle } from "../../components/theme-toggle";
import { requireWebUser } from "../../lib/webAuth";
import { getMyTeams } from "../../lib/appData";

export default async function DashboardPage() {
  loadEnvConfig(process.cwd());
  const { userId } = await requireWebUser();
  const teams = await getMyTeams(userId);

  const leaderTeams = teams.filter((t) => t.permLevel === 1).length;
  const totalMembers = teams.reduce((acc, t) => acc + t.memberCount, 0);
  const totalMessages = teams.reduce((acc, t) => acc + t.messageCount, 0);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Dashboard</div>
              <div className="text-xs text-muted-foreground">
                Your teams, activity, and quick links
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" className="h-9 px-2.5" asChild>
              <Link href="/db-inspector" prefetch={false}>
                DB inspector <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" className="h-9 px-2.5" asChild>
              <Link href="/api/me" prefetch={false}>
                <User className="h-4 w-4" />
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Account
                </span>
              </Link>
            </Button>
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
        <div className="animate-in fade-in-0 duration-500">
          <h1 className="text-balance text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You’re signed in as <span className="font-mono">{userId}</span>.
          </p>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Groups you belong to</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {teams.length}
            </CardContent>
          </Card>
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:70ms]">
            <CardHeader>
              <CardTitle>Leader roles</CardTitle>
              <CardDescription>Teams you lead</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{leaderTeams}</CardContent>
          </Card>
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:140ms]">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Roster + message totals</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-baseline justify-between">
                <span>Members</span>
                <span className="text-lg font-semibold text-foreground">
                  {totalMembers}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span>Saved messages</span>
                <span className="text-lg font-semibold text-foreground">
                  {totalMessages}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">My teams</h2>
              <p className="text-xs text-muted-foreground">
                Clean overview—no extra noise.
              </p>
            </div>
          </div>

          {teams.length === 0 ? (
            <Card className="animate-in fade-in-0 duration-500">
              <CardHeader>
                <CardTitle>No teams yet</CardTitle>
                <CardDescription>
                  Once you join or create a team in Discord, it’ll show up here.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                If you expected to see teams, make sure your Discord account is in{" "}
                <span className="font-medium text-foreground">TeamAssociations</span>{" "}
                (DB inspector → Team roster).
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teams.map((t, idx) => (
                <Card
                  key={t.slug}
                  className="group animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
                  style={{ animationDelay: `${idx * 45}ms` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {t.slug}
                          {t.permLevel === 1 && (
                            <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <Shield className="h-3 w-3" />
                              Leader
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {t.projectName ? (
                            <>
                              Project:{" "}
                              <span className="font-medium text-foreground">
                                {t.projectName}
                              </span>
                            </>
                          ) : (
                            "No active project row"
                          )}
                        </CardDescription>
                      </div>
                      <Button variant="outline" className="h-9" asChild>
                        <Link href={`/teams/${encodeURIComponent(t.slug)}`}>
                          Open <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Members</div>
                      <div className="mt-1 text-lg font-semibold">{t.memberCount}</div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Messages</div>
                      <div className="mt-1 text-lg font-semibold">{t.messageCount}</div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="mt-1 text-lg font-semibold">
                        {t.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>
                    {t.githubRepo ? (
                      <div className="col-span-3 mt-1 flex items-center justify-between rounded-lg border bg-background p-3">
                        <div className="text-xs text-muted-foreground">
                          GitHub repo
                        </div>
                        <div className="font-mono text-xs text-foreground">
                          {t.githubRepo}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

