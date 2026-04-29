import { loadEnvConfig } from "@next/env";
import Link from "next/link";
import { ArrowUpRight, Shield, Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Metric } from "../../../components/ui/metric";
import { AppShell } from "../../../components/app-shell";
import { AiSummaryCard } from "../../../components/ai-summary-card";
import { AiChatCard } from "../../../components/ai-chat-card";
import { requireWebUser } from "../../../lib/webAuth";
import { getTeamOverview } from "../../../lib/appData";
import {
  getDiscordDisplayName,
  getWebAdminFlags
} from "../../../lib/discordBotApi";

export default async function TeamPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  loadEnvConfig(process.cwd());
  const { slug } = await params;
  const teamSlug = decodeURIComponent(slug);

  const { userId } = await requireWebUser();
  const flags = await getWebAdminFlags(userId).catch(() => ({
    isAdmin: false,
    isPresident: false
  }));
  const canSeeAdmin = flags.isAdmin || flags.isPresident;

  const team = await getTeamOverview(userId, teamSlug, {
    allowAdminView: canSeeAdmin
  });
  const nameById = new Map(
    await Promise.all(
      team.members.map(
        async (m) =>
          [
            m.discordId,
            await getDiscordDisplayName(m.discordId).catch(() => null)
          ] as const
      )
    )
  );

  const leaderCount = team.members.filter((m) => m.permLevel === 1).length;

  return (
    <AppShell
      title={team.slug}
      subtitle={`${team.projectName ?? "No active project"} • ${team.isActive ? "Active" : "Inactive"}`}
      backHref="/dashboard"
      backLabel="Dashboard"
      rightLinks={[]}
    >
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Auto summary
              </CardTitle>
              <CardDescription>
                Generated automatically from recent saved context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AiSummaryCard teamSlug={team.slug} auto embedded compactHeader />
            </CardContent>
          </Card>

          <Card className="group animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:80ms] lg:col-span-1">
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
                    Essentials + links.
                  </CardDescription>
                </div>

                {team.githubRepo ? (
                  <Button variant="outline" className="h-9" asChild>
                    <a
                      href={`https://github.com/${process.env.GITHUB_ORG ?? ""}/${team.githubRepo}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Repo <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-1">
                <Metric label="Members" value={team.members.length} />
                <Metric
                  label="Project"
                  value={team.projectName ?? "—"}
                  className="col-span-2 sm:col-span-1 lg:col-span-1"
                />
                <Metric
                  label="Status"
                  value={team.isActive ? "Active" : "Inactive"}
                  className="lg:col-span-1"
                />
              </div>

              {team.githubRepo ? (
                <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <div className="text-xs text-muted-foreground">
                    GitHub repo
                  </div>
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

          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:140ms] lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Ask Cache
              </CardTitle>
              <CardDescription>
                Transcript-aware assistant for this team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiChatCard teamSlug={team.slug} embedded />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:120ms]">
            <CardHeader>
              <CardTitle>Roster</CardTitle>
              <CardDescription>
                Discord display names when available (no raw IDs).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {team.members.map((m) => (
                <div
                  key={m.discordId}
                  className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 transition-colors hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/users/${encodeURIComponent(m.discordId)}`}
                      className="block truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                      prefetch={false}
                    >
                      {nameById.get(m.discordId) ?? m.github ?? "Member"}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.github ? "GitHub linked" : "GitHub not linked"}
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

          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:160ms]">
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
              <CardDescription>
                Message history and raw IDs are intentionally hidden from the
                dashboard UI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-muted/20 p-3">
                AI features still use saved messages server-side for context,
                but we don’t render them here.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
