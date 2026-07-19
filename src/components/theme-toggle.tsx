"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
    >
      {isDark ? <Moon className="size-3.5 shrink-0" aria-hidden="true" /> : <Sun className="size-3.5 shrink-0" aria-hidden="true" />}
      <span>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
