"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-transparent text-xs font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground",
        collapsed ? "w-8 shrink-0 justify-center px-0" : "px-2.5",
      )}
    >
      {isDark ? <Moon className="size-3.5 shrink-0" aria-hidden="true" /> : <Sun className="size-3.5 shrink-0" aria-hidden="true" />}
      <span className={collapsed ? "sr-only" : undefined}>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
