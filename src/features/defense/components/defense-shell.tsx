import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

interface DefenseShellProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: { label: string; href: string };
}

export function DefenseShell({ eyebrow, title, children, action }: DefenseShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b defense-rule">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-5 px-5 sm:px-8">
          <div>
            <p className="defense-kicker">{eyebrow}</p>
            <h1 className="defense-title mt-1 text-2xl leading-none sm:text-3xl">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {action && (
              <Link
                href={action.href}
                className="inline-flex min-h-10 items-center justify-center rounded-sm bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--signal)]"
              >
                {action.label}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">{children}</main>
      <footer className="mx-auto max-w-6xl border-t defense-rule px-5 py-4 sm:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Defense Studio · evidence-led rehearsal</p>
      </footer>
    </div>
  );
}
