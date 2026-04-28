"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";

type ThemePref = "light" | "dark" | "system";

function readCookieTheme(): ThemePref {
  const m = document.cookie.match(/(?:^|; )cache_theme=([^;]+)/);
  const raw = m ? decodeURIComponent(m[1] ?? "") : "";
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function writeCookieTheme(theme: ThemePref) {
  document.cookie = `cache_theme=${encodeURIComponent(theme)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function applyTheme(theme: ThemePref) {
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemePref>("system");

  useEffect(() => {
    setMounted(true);
    const t = readCookieTheme();
    setTheme(t);
    applyTheme(t);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => {
      if (readCookieTheme() === "system") applyTheme("system");
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const next =
    theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

  const label =
    theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  const clickLabel = useMemo(() => {
    if (!mounted) return "Theme toggle (loading)";
    return `Theme: ${label} (click to change)`;
  }, [label, mounted]);

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-9 px-2.5"
      onClick={() => {
        setTheme(next);
        writeCookieTheme(next);
        applyTheme(next);
      }}
      aria-label={clickLabel}
    >
      {/* Render a stable icon to avoid hydration mismatch */}
      {!mounted ? (
        <Monitor className="h-4 w-4" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {mounted ? label : "Theme"}
      </span>
    </Button>
  );
}
