import { Sparkles } from "lucide-react";
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
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              S
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">
                Loading team…
              </div>
              <div className="truncate text-xs text-muted-foreground">
                Preparing overview • loading AI
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            Loading
          </Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
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

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Team overview</CardTitle>
                <CardDescription>Essentials + links.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
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

            <Card className="lg:col-span-3">
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
      </main>
    </div>
  );
}

