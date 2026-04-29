import { Sparkles, Shield } from "lucide-react";
import { AppShell } from "../../../components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

function SkeletonLine({ w }: { w: string }) {
  return <div className={`h-3 ${w} animate-pulse rounded bg-muted`} />;
}

export default function LoadingTeamPage() {
  return (
    <AppShell
      title="Loading team…"
      subtitle="Fetching overview • preparing AI"
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
                Generating from recent saved context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-2 w-40 animate-pulse rounded bg-muted" />
              <div className="space-y-2">
                <SkeletonLine w="w-10/12" />
                <SkeletonLine w="w-full" />
                <SkeletonLine w="w-11/12" />
                <SkeletonLine w="w-9/12" />
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:80ms] lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Team overview
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="h-3 w-3" />…
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Essentials + links.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-background/40 p-3">
                  <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    Members
                  </div>
                  <div className="mt-1 h-5 w-10 animate-pulse rounded bg-muted" />
                </div>
                <div className="rounded-xl border bg-background/40 p-3">
                  <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    Project
                  </div>
                  <div className="mt-1 h-5 w-24 animate-pulse rounded bg-muted" />
                </div>
                <div className="rounded-xl border bg-background/40 p-3">
                  <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    Status
                  </div>
                  <div className="mt-1 h-5 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:140ms] lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Ask Cache
              </CardTitle>
              <CardDescription>Warming up the assistant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
              <div className="rounded-lg border bg-background p-3">
                <div className="space-y-2">
                  <SkeletonLine w="w-10/12" />
                  <SkeletonLine w="w-full" />
                  <SkeletonLine w="w-9/12" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
