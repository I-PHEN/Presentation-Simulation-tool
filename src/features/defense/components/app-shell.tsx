import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export type DefenseNavItem = 'overview' | 'decks' | 'practice' | 'reports';

const navigation: Array<{ href: string; label: string; value: DefenseNavItem }> = [
  { href: '/dashboard', label: 'Overview', value: 'overview' },
  { href: '/decks', label: 'Decks', value: 'decks' },
  { href: '/practice', label: 'Practice', value: 'practice' },
  { href: '/reports', label: 'Reports', value: 'reports' },
];

export function AppShell({ active, children }: {
  active: DefenseNavItem;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <nav aria-label="Primary navigation" className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-5">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">Defense</Link>
          <div className="flex flex-1 items-center gap-4">
            {navigation.map((item) => (
              <Link
                key={item.value}
                href={item.href}
                aria-current={active === item.value ? 'page' : undefined}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <ThemeToggle />
          <Link href="/dashboard" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface">
            Account
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
