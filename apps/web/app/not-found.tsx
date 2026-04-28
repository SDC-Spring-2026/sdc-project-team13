import Link from "next/link";
import { ArrowRight, Home, SearchX } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center px-5 py-10">
      <Card className="w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchX className="h-4 w-4 text-primary" />
            Page not found
          </CardTitle>
          <CardDescription>
            That page doesn’t exist, or you don’t have access.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="/api/auth/discord/start">
              Sign in <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

