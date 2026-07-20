"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { buttonVariants } from "@/components/ui/button";
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
        buttonVariants({ variant: "ghost", size: "sm" }),
        collapsed && "w-9 px-0 justify-center",
      )}
    >
      {isDark ? <Moon className="size-3.5 shrink-0" aria-hidden="true" /> : <Sun className="size-3.5 shrink-0" aria-hidden="true" />}
      <span className={collapsed ? "sr-only" : undefined}>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
