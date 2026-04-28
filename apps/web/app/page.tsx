import { ArrowRight, Database, Shield } from "lucide-react";
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
              C
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Cache</div>
              <div className="text-xs text-muted-foreground">
                A modern dashboard for your bot’s data
              </div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="mt-12 grid gap-8 lg:grid-cols-5 lg:gap-10">
          <div className="lg:col-span-3">
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Everything your bot knows,
                <span className="text-primary"> in a fast dashboard.</span>
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground">
                Sign in with Discord to browse your teams, roster, project info, and
                saved context—cleanly organized and permission-aware.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:70ms]">
              <Button size="lg" asChild>
                <a href="/api/auth/discord/start">
                  Continue with Discord <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/db-inspector">DB inspector</a>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:130ms]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Auth + permissions
                  </CardTitle>
                  <CardDescription>
                    Web access mirrors bot membership: only see teams you’re on.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Leader-only actions can be enforced from the same{" "}
                  <span className="font-medium text-foreground">
                    teamAssociations.perm_level
                  </span>{" "}
                  your bot uses.
                </CardContent>
              </Card>

              <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:180ms]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    DB-backed UI
                  </CardTitle>
                  <CardDescription>
                    Teams, projects, members, roster, and message history.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  This frontend reads from SQLite locally or Postgres in prod,
                  using the same table naming rules as the bot.
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:120ms]">
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>
                  Uses Discord OAuth (<code className="rounded bg-muted px-1.5 py-0.5">identify</code>)
                  and stores a server session cookie.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">What you’ll get</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>My teams (from team roster)</li>
                    <li>Project info (from projects)</li>
                    <li>Saved chat context (message history)</li>
                  </ul>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  If you hit an env error, your web server isn’t loading the repo
                  root <code className="rounded bg-muted px-1.5 py-0.5">.env</code>.
                  This branch fixes that by loading env inside auth routes.
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

        <footer className="mt-auto pt-10 text-xs text-muted-foreground">
          Tip: In production, keep <code className="rounded bg-muted px-1.5 py-0.5">ALLOW_DB_INSPECTOR</code>{" "}
          off unless you explicitly need it.
        </footer>
      </div>
    </main>
  );
}

