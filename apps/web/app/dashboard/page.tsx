import Link from "next/link";
import { loadEnvConfig } from "@next/env";
import { ArrowUpRight, Shield } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { AppShell } from "../../components/app-shell";
import { requireWebUser } from "../../lib/webAuth";
import { getClubTeams, getMyTeams } from "../../lib/appData";
import { getDiscordDisplayName, getWebAdminFlags } from "../../lib/discordBotApi";

export default async function DashboardPage() {
  loadEnvConfig(process.cwd());
  const { userId } = await requireWebUser();
  const flags = await getWebAdminFlags(userId).catch(() => ({ isAdmin: false, isPresident: false }));
  const canSeeAdmin = flags.isAdmin || flags.isPresident;
  const displayName = await getDiscordDisplayName(userId).catch(() => null);
  const [teams, clubTeams] = await Promise.all([
    getMyTeams(userId),
    getClubTeams(userId, { includeAdminFields: canSeeAdmin })
  ]);

  const leaderTeams = teams.filter((t) => t.permLevel === 1).length;
  const totalMembers = teams.reduce((acc, t) => acc + t.memberCount, 0);
  const totalMessages = teams.reduce((acc, t) => acc + t.messageCount, 0);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Your teams, activity, and quick links"
      rightLinks={[
        ...(canSeeAdmin
          ? [{ kind: "link" as const, href: "/db-inspector", label: "DB inspector", icon: "arrowUpRight" as const }]
          : []),
        ...(canSeeAdmin
          ? [{ kind: "link" as const, href: "/admin", label: "Admin", icon: "arrowUpRight" as const }]
          : []),
        { kind: "link", href: "/account", label: "Account", icon: "user" }
      ]}
    >
        <div className="relative overflow-hidden rounded-2xl border bg-muted/20 p-6">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
          <div className="relative animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <h1 className="text-balance text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {displayName ? (
                <>
                  You’re signed in as{" "}
                  <span className="font-medium text-foreground">{displayName}</span>.
                </>
              ) : (
                <>You’re signed in.</>
              )}
            </p>
          </div>
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

        <section className="mt-10">
          <div className="mb-3">
            <h2 className="text-sm font-semibold tracking-tight">
              SDC teams
            </h2>
            <p className="text-xs text-muted-foreground">
              Everyone can browse teams. Admins see extra stats.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {clubTeams.map((t, idx) => (
              <Card
                key={t.slug}
                className="group animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{t.slug}</CardTitle>
                      <CardDescription className="mt-1">
                        {t.projectName ? `Project: ${t.projectName}` : "No active project"}
                      </CardDescription>
                    </div>
                    <Button variant="outline" className="h-9" asChild>
                      <Link href={`/teams/${encodeURIComponent(t.slug)}`}>
                        Open <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Members</div>
                    <div className="mt-1 text-lg font-semibold">{t.memberCount}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="mt-1 text-lg font-semibold">
                      {t.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>

                  {t.viewerPermLevel !== null ? (
                    <div className="col-span-2 rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                      You’re on this team ({t.viewerPermLevel === 1 ? "Leader" : "Member"}).
                    </div>
                  ) : null}

                  {canSeeAdmin && (t.githubRepo || t.messageCount !== null) ? (
                    <div className="col-span-2 rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                      {t.githubRepo ? (
                        <div>
                          GitHub repo: <span className="font-mono">{t.githubRepo}</span>
                        </div>
                      ) : null}
                      {t.messageCount !== null ? (
                        <div className="mt-1">Saved messages: {t.messageCount}</div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
    </AppShell>
  );
}

