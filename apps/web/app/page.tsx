import { ArrowRight, MessageSquareText, Shield, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "../components/ui/card";
import { ThemeToggle } from "../components/theme-toggle";

export default function HomePage() {
  return (
    <main className="relative">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              S
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">SDC Cache</div>
              <div className="text-xs text-muted-foreground">
                Software Development Club • UW–Madison
              </div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="mt-12 grid gap-8 lg:grid-cols-5 lg:gap-10">
          <div className="lg:col-span-3">
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Your SDC teams,
                <span className="text-primary"> organized.</span>
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground">
                Sign in with Discord to see your team dashboards, AI summaries,
                and project activity—all permission-aware and built for SDC
                workflows.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:70ms]">
              <Button size="lg" asChild>
                <a href="/api/auth/discord/start">
                  Continue with Discord <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:130ms]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Permission-aware
                  </CardTitle>
                  <CardDescription>
                    See the teams you’re on and what’s relevant to you.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Your dashboard is built from your Discord membership so you
                  can jump in fast.
                </CardContent>
              </Card>

              <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:180ms]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI summaries
                  </CardTitle>
                  <CardDescription>
                    Get a quick, structured recap of what’s going on.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Status, decisions, action items, blockers, and open questions
                  in an easy-to-skim format.
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:120ms]">
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>
                  Continue with Discord to view your teams.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">
                    What you’ll get
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li className="flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4 text-primary" />
                      Team dashboards
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Auto summaries (status • action items • blockers)
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Ask Cache: a streaming team assistant
                    </li>
                  </ul>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  Tip: After signing in, open a team to see an auto summary and
                  use Ask Cache for next steps.
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" asChild>
                  <a href="/api/auth/discord/start">Continue with Discord</a>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
