import { loadEnvConfig } from "@next/env";
import Link from "next/link";
import { ArrowUpRight, Shield } from "lucide-react";
import { AppShell } from "../../../components/app-shell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../components/ui/card";
import { Metric } from "../../../components/ui/metric";
import { requireWebUser } from "../../../lib/webAuth";
import { getUserProfile } from "../../../lib/appData";
import { userProfilePath } from "../../../lib/routes";
import {
  getDiscordDisplayName,
  getWebAdminFlags
} from "../../../lib/discordBotApi";

function roleLabel(perm: number) {
  if (perm === 1) return "Leader";
  return "Member";
}

export default async function UserProfilePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  loadEnvConfig(process.cwd());
  const { userId: viewerId } = await requireWebUser();
  const { id } = await params;
  const idOrHandle = decodeURIComponent(id);

  const flags = await getWebAdminFlags(viewerId).catch(() => ({
    isAdmin: false,
    isPresident: false
  }));
  const canSeeAdmin = flags.isAdmin || flags.isPresident;

  let profile: Awaited<ReturnType<typeof getUserProfile>> | null = null;
  let profileError: "NOT_FOUND" | "FORBIDDEN" | null = null;

  try {
    profile = await getUserProfile(viewerId, idOrHandle, {
      allowAdminView: canSeeAdmin
    });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (msg.includes("NOT_FOUND")) profileError = "NOT_FOUND";
    else if (msg.includes("FORBIDDEN")) profileError = "FORBIDDEN";
    else throw e;
  }

  if (!profile) {
    const label = idOrHandle.startsWith("@") ? idOrHandle : `@${idOrHandle}`;
    return (
      <AppShell
        title="User profile"
        subtitle={
          profileError === "FORBIDDEN"
            ? "You don’t have access to this profile."
            : "We couldn’t find a matching user."
        }
        backHref="/dashboard"
        backLabel="Dashboard"
        rightLinks={[
          {
            kind: "link",
            href: userProfilePath(viewerId),
            label: "Account",
            icon: "user"
          }
        ]}
      >
        <Card>
          <CardHeader>
            <CardTitle>
              {profileError === "FORBIDDEN" ? "Forbidden" : "Not found"}
            </CardTitle>
            <CardDescription>
              {profileError === "FORBIDDEN"
                ? "Profiles are only available for you, admins/presidents, or people who share a team with you."
                : `No profile data was found for ${label}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="rounded-lg border bg-muted/20 p-3">
              If this came from an AI mention, it may be a nickname that doesn’t
              match a stored GitHub handle. Roster links (Discord IDs) will
              always resolve.
            </div>
            <div>
              <Button variant="outline" asChild className="h-9">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const displayName = await getDiscordDisplayName(profile.userId).catch(
    () => null
  );
  const leaderCount = profile.teams.filter((t) => t.permLevel === 1).length;
  const activeCount = profile.teams.filter((t) => t.isActive).length;
  const projects = Array.from(
    new Set(profile.teams.map((t) => t.projectName).filter(Boolean))
  ) as string[];

  return (
    <AppShell
      title={displayName ?? profile.github ?? "Profile"}
      subtitle={
        profile.github
          ? `@${profile.github} • ${profile.teams.length} team${profile.teams.length === 1 ? "" : "s"}`
          : `${profile.teams.length} team${profile.teams.length === 1 ? "" : "s"}`
      }
      backHref="/dashboard"
      backLabel="Dashboard"
      rightLinks={[
        {
          kind: "link",
          href: userProfilePath(viewerId),
          label: "Account",
          icon: "user"
        }
      ]}
    >
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="truncate">
                    {displayName ?? profile.github ?? profile.userId}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {profile.github ? (
                      <>
                        GitHub:{" "}
                        <span className="font-mono">@{profile.github}</span>
                      </>
                    ) : (
                      "No GitHub handle on file."
                    )}
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="font-mono">
                      Discord ID: {profile.userId}
                    </span>
                  </CardDescription>
                </div>
                {leaderCount > 0 ? (
                  <Badge className="gap-1">
                    <Shield className="h-3 w-3" />
                    {leaderCount} leader role{leaderCount === 1 ? "" : "s"}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Member</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Metric label="Teams" value={profile.teams.length} />
              <Metric label="Active" value={activeCount} />
              <Metric label="Leads" value={leaderCount} />
              {projects.length ? (
                <div className="sm:col-span-3 rounded-xl border bg-background/40 p-3">
                  <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    Active projects
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {projects.slice(0, 8).map((p) => (
                      <Badge key={p} variant="outline">
                        {p}
                      </Badge>
                    ))}
                    {projects.length > 8 ? (
                      <Badge variant="secondary">+{projects.length - 8}</Badge>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Quick summary</CardTitle>
              <CardDescription>At-a-glance involvement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-muted/20 p-3">
                {leaderCount > 0 ? (
                  <>
                    Leads{" "}
                    <span className="font-medium text-foreground">
                      {leaderCount}
                    </span>{" "}
                    team{leaderCount === 1 ? "" : "s"} and is active in{" "}
                    <span className="font-medium text-foreground">
                      {activeCount}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Member of{" "}
                    <span className="font-medium text-foreground">
                      {profile.teams.length}
                    </span>{" "}
                    team{profile.teams.length === 1 ? "" : "s"}, with{" "}
                    <span className="font-medium text-foreground">
                      {activeCount}
                    </span>{" "}
                    active.
                  </>
                )}
              </div>
              <div className="rounded-lg border bg-background p-3">
                Tip: Click a team below to jump to its AI summary and chat.
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Where this user is involved.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {profile.teams.map((t) => (
                <div
                  key={t.teamSlug}
                  className="flex items-start justify-between gap-3 rounded-xl border bg-background px-3 py-2 hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {t.teamSlug}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.projectName
                        ? `Project: ${t.projectName}`
                        : "No active project"}{" "}
                      • {t.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.permLevel === 1 ? "default" : "outline"}>
                      {roleLabel(t.permLevel)}
                    </Badge>
                    <Button variant="outline" className="h-9" asChild>
                      <Link
                        href={`/teams/${encodeURIComponent(t.teamSlug)}`}
                        prefetch={false}
                      >
                        Open <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
