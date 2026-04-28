"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, ArrowRight, Home } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../components/ui/card";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const msg = (error?.message ?? "").toUpperCase();
  const isUnauthed = msg.includes("UNAUTHENTICATED");
  const isForbidden = msg.includes("FORBIDDEN");
  const isNotFound = msg.includes("NOT_FOUND");

  const title = isUnauthed
    ? "You’re signed out"
    : isForbidden
      ? "Not allowed"
      : isNotFound
        ? "Not found"
        : "Something went wrong";

  const desc = isUnauthed
    ? "Sign in with Discord to continue."
    : isForbidden
      ? "Your account doesn’t have access to this resource."
      : isNotFound
        ? "That page or resource doesn’t exist (or you don’t have access)."
        : "Try again. If this keeps happening, check server logs and env configuration.";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center px-5 py-10">
      <Card className="w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {isUnauthed ? (
            <Button asChild>
              <a href="/api/auth/discord/start">
                Continue with Discord <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <Button type="button" onClick={() => reset()}>
              Try again
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
