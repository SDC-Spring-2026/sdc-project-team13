import { loadEnvConfig } from "@next/env";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../components/ui/card";
import { Metric } from "../../components/ui/metric";
import { AppShell } from "../../components/app-shell";
import { DashboardTeams } from "../../components/dashboard-teams";
import { userProfilePath } from "../../lib/routes";
import { requireWebUser } from "../../lib/webAuth";
import { getClubTeams, getMyTeams } from "../../lib/appData";
import {
  getDiscordDisplayName,
  getWebAdminFlags
} from "../../lib/discordBotApi";

export default async function DashboardPage() {
  loadEnvConfig(process.cwd());
  const { userId } = await requireWebUser();
  const flags = await getWebAdminFlags(userId).catch(() => ({
    isAdmin: false,
    isPresident: false
  }));
  const canSeeAdmin = flags.isAdmin || flags.isPresident;
  const displayName = await getDiscordDisplayName(userId).catch(() => null);
  const teams = await getMyTeams(userId);
  const clubTeams = canSeeAdmin
    ? await getClubTeams(userId, { includeAdminFields: true })
    : [];

  const leaderTeams = teams.filter((t) => t.permLevel === 1).length;
  const totalMembers = teams.reduce((acc, t) => acc + t.memberCount, 0);
  const totalMessages = teams.reduce((acc, t) => acc + t.messageCount, 0);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Your teams, activity, and quick links"
      rightLinks={[
        ...(canSeeAdmin
          ? [
              {
                kind: "link" as const,
                href: "/db-inspector",
                label: "DB inspector",
                icon: "arrowUpRight" as const
              }
            ]
          : []),
        ...(canSeeAdmin
          ? [
              {
                kind: "link" as const,
                href: "/admin",
                label: "Admin",
                icon: "arrowUpRight" as const
              }
            ]
          : []),
        {
          kind: "link",
          href: userProfilePath(userId),
          label: "Account",
          icon: "user"
        }
      ]}
    >
      <div className="relative overflow-hidden rounded-2xl border bg-muted/15 p-6">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <h1 className="text-balance text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayName ? (
              <>
                You’re signed in as{" "}
                <span className="font-medium text-foreground">
                  {displayName}
                </span>
                .
              </>
            ) : (
              <>You’re signed in.</>
            )}
          </p>
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 transition-shadow hover:shadow-sm">
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Groups you belong to</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {teams.length}
          </CardContent>
        </Card>
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:70ms] transition-shadow hover:shadow-sm">
          <CardHeader>
            <CardTitle>Leader roles</CardTitle>
            <CardDescription>Teams you lead</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {leaderTeams}
          </CardContent>
        </Card>
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:140ms] transition-shadow hover:shadow-sm">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Roster + message totals</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Metric label="Members" value={totalMembers} />
            <Metric label="Saved messages" value={totalMessages} />
          </CardContent>
        </Card>
      </section>

      <DashboardTeams
        myTeams={teams}
        clubTeams={clubTeams}
        canSeeAdmin={canSeeAdmin}
      />
    </AppShell>
  );
}
