import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LayoutGrid, User } from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  rightLinks?: Array<
    | {
        kind: "link";
        href: string;
        label: string;
        icon?: "arrowUpRight" | "user";
      }
    | { kind: "node"; node: ReactNode }
  >;
  children: ReactNode;
};

function Icon({ icon }: { icon: "arrowUpRight" | "user" }) {
  if (icon === "arrowUpRight") return <ArrowUpRight className="h-4 w-4" />;
  return <User className="h-4 w-4" />;
}

export function AppShell({
  title,
  subtitle,
  backHref,
  backLabel,
  rightLinks,
  children
}: Props) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-3">
            {backHref ? (
              <Button variant="ghost" className="h-9 px-2" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {backLabel ?? "Back"}
                  </span>
                </Link>
              </Button>
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <LayoutGrid className="h-4 w-4" />
              </div>
            )}

            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">{title}</div>
              {subtitle ? (
                <div className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {rightLinks?.map((l, idx) => {
              if (l.kind === "node") return <div key={idx}>{l.node}</div>;
              return (
                <Button
                  key={idx}
                  variant="ghost"
                  className="h-9 px-2.5"
                  asChild
                >
                  <Link href={l.href} prefetch={false}>
                    {l.label}
                    {l.icon ? <Icon icon={l.icon} /> : null}
                  </Link>
                </Button>
              );
            })}

            <ThemeToggle />
            <form method="post" action="/api/auth/logout" className="ml-1">
              <Button variant="outline" className="h-9">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
