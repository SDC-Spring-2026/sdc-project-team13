"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search, Shield, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Metric } from "./ui/metric";

type MyTeam = {
  slug: string;
  permLevel: number;
  projectName: string | null;
  memberCount: number;
  messageCount: number;
  isActive: boolean;
  githubRepo: string | null;
};

type ClubTeam = {
  slug: string;
  projectName: string | null;
  memberCount: number;
  isActive: boolean;
  viewerPermLevel: number | null;
  githubRepo: string | null;
  messageCount: number | null;
};

type SortKey = "name" | "members" | "messages" | "activity";

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function DashboardTeams({
  myTeams,
  clubTeams,
  canSeeAdmin
}: {
  myTeams: MyTeam[];
  clubTeams: ClubTeam[];
  canSeeAdmin: boolean;
}) {
  const [tab, setTab] = useState<"my" | "club">("my");
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [leaderOnly, setLeaderOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("activity");

  const q = normalize(query);

  const filteredMy = useMemo(() => {
    const base = myTeams.filter((t) => {
      if (activeOnly && !t.isActive) return false;
      if (leaderOnly && t.permLevel !== 1) return false;
      if (!q) return true;
      return normalize(`${t.slug} ${t.projectName ?? ""} ${t.githubRepo ?? ""}`).includes(q);
    });

    const sorted = base.slice().sort((a, b) => {
      if (sort === "name") return a.slug.localeCompare(b.slug);
      if (sort === "members") return b.memberCount - a.memberCount;
      if (sort === "messages") return b.messageCount - a.messageCount;
      // activity: prefer active, then messages.
      const act = Number(b.isActive) - Number(a.isActive);
      if (act !== 0) return act;
      return b.messageCount - a.messageCount;
    });
    return sorted;
  }, [activeOnly, leaderOnly, myTeams, q, sort]);

  const filteredClub = useMemo(() => {
    const base = clubTeams.filter((t) => {
      if (activeOnly && !t.isActive) return false;
      if (leaderOnly) return false;
      if (!q) return true;
      return normalize(`${t.slug} ${t.projectName ?? ""} ${t.githubRepo ?? ""}`).includes(q);
    });

    const sorted = base.slice().sort((a, b) => {
      if (sort === "name") return a.slug.localeCompare(b.slug);
      if (sort === "members") return b.memberCount - a.memberCount;
      if (sort === "messages") return (b.messageCount ?? 0) - (a.messageCount ?? 0);
      const act = Number(b.isActive) - Number(a.isActive);
      if (act !== 0) return act;
      return (b.messageCount ?? 0) - (a.messageCount ?? 0);
    });
    return sorted;
  }, [activeOnly, clubTeams, leaderOnly, q, sort]);

  const shown = tab === "my" ? filteredMy : filteredClub;

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Teams</h2>
            <Badge variant="outline" className="gap-2 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Explore
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Search, filter, and jump in fast.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-[260px] pl-9"
              placeholder="Search teams…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <Button
            variant={tab === "my" ? "default" : "outline"}
            className="h-9"
            onClick={() => setTab("my")}
          >
            My teams
          </Button>
          <Button
            variant={tab === "club" ? "default" : "outline"}
            className="h-9"
            onClick={() => setTab("club")}
          >
            SDC teams
          </Button>

          <Button
            variant={activeOnly ? "default" : "outline"}
            className="h-9"
            onClick={() => setActiveOnly((v) => !v)}
            title="Only show active teams"
          >
            Active
          </Button>
          <Button
            variant={leaderOnly ? "default" : "outline"}
            className="h-9"
            onClick={() => setLeaderOnly((v) => !v)}
            disabled={tab !== "my"}
            title={tab !== "my" ? "Leader filter only applies to your teams" : "Only teams you lead"}
          >
            Leader
          </Button>

          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="activity">Sort: Activity</option>
            <option value="name">Sort: Name</option>
            <option value="members">Sort: Members</option>
            <option value="messages">Sort: Messages</option>
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <Card className="animate-in fade-in-0 duration-500">
          <CardHeader>
            <CardTitle>Nothing matched</CardTitle>
            <CardDescription>Try clearing filters or searching a different term.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tab === "my"
            ? (shown as MyTeam[]).map((t, idx) => (
                <Card
                  key={t.slug}
                  className="group animate-in fade-in-0 slide-in-from-bottom-2 duration-500 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                  style={{ animationDelay: `${idx * 35}ms` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <span className="truncate">{t.slug}</span>
                          {t.permLevel === 1 ? (
                            <Badge className="gap-1">
                              <Shield className="h-3 w-3" />
                              Leader
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground">
                              Member
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {t.projectName ? (
                            <>
                              Project: <span className="font-medium text-foreground">{t.projectName}</span>
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
                  <CardContent className="grid grid-cols-3 gap-3">
                    <Metric label="Members" value={t.memberCount} />
                    <Metric label="Messages" value={t.messageCount} />
                    <Metric label="Status" value={t.isActive ? "Active" : "Inactive"} />
                    {t.githubRepo ? (
                      <div className="col-span-3 mt-1 rounded-xl border bg-background/40 p-3">
                        <div className="text-[11px] font-medium tracking-wide text-muted-foreground">GitHub repo</div>
                        <div className="mt-1 truncate font-mono text-xs text-foreground">{t.githubRepo}</div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            : (shown as ClubTeam[]).map((t, idx) => (
                <Card
                  key={t.slug}
                  className="group animate-in fade-in-0 slide-in-from-bottom-2 duration-500 transition-all hover:-translate-y-0.5 hover:shadow-sm"
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
                  <CardContent className="grid grid-cols-2 gap-3">
                    <Metric label="Members" value={t.memberCount} />
                    <Metric label="Status" value={t.isActive ? "Active" : "Inactive"} />

                    {t.viewerPermLevel !== null ? (
                      <div className="col-span-2 rounded-xl border bg-background/40 p-3 text-xs text-muted-foreground">
                        You’re on this team ({t.viewerPermLevel === 1 ? "Leader" : "Member"}).
                      </div>
                    ) : null}

                    {canSeeAdmin && (t.githubRepo || t.messageCount !== null) ? (
                      <div className="col-span-2 rounded-xl border bg-background/40 p-3 text-xs text-muted-foreground">
                        {t.githubRepo ? (
                          <div>
                            GitHub repo: <span className="font-mono">{t.githubRepo}</span>
                          </div>
                        ) : null}
                        {t.messageCount !== null ? (
                          <div className={t.githubRepo ? "mt-1" : ""}>Saved messages: {t.messageCount}</div>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
        </div>
      )}
    </section>
  );
}

