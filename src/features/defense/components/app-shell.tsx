'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Home, LineChart, Menu, Mic, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { readShellCollapsed, writeShellCollapsed } from '../shell-preference';
import { AccountMenu } from './account-menu';

export type StudioNavItem = 'home' | 'rehearse' | 'progress';

const navigation = [
  { href: '/dashboard', label: 'Home', value: 'home' },
  { href: '/decks/new', label: 'Rehearse', value: 'rehearse' },
  { href: '/review', label: 'Progress', value: 'progress' },
] as const;

const navIcons: Record<StudioNavItem, typeof Home> = {
  home: Home,
  rehearse: Mic,
  progress: LineChart,
};

const navTitles: Record<StudioNavItem, string> = {
  home: 'Home',
  rehearse: 'Rehearse',
  progress: 'Progress',
};

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex h-14 shrink-0 items-center gap-2.5 px-5 text-sm font-semibold tracking-tight text-sidebar-foreground"
    >
      <span className="relative flex size-7 shrink-0 items-center justify-center">
        <span
          aria-hidden="true"
          className="relative flex size-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground"
        >
          SP
        </span>
      </span>
      <span className={cn('truncate transition-opacity duration-200', collapsed ? 'opacity-0' : 'opacity-100')}>
        Sparring Partner
      </span>
    </Link>
  );
}

function NavLink({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: (typeof navigation)[number];
  isActive: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = navIcons[item.value];
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground"
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn('truncate transition-opacity duration-200', collapsed ? 'opacity-0' : 'opacity-100')}>{item.label}</span>
    </Link>
  );
}

export function AppShell({ active, children }: {
  active: StudioNavItem;
  children: ReactNode;
}) {
  // Read the persisted rail state synchronously so client-side navigation
  // renders the correct width on the first paint - no expand-then-collapse
  // flash when moving between pages. (SSR has no localStorage, so the server
  // renders expanded and the client reconciles; suppressHydrationWarning keeps
  // that first-load correction quiet.)
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? readShellCollapsed(window.localStorage) : false,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  // Only animate the rail width for real user toggles, never for the initial
  // mount/reconcile - that is what turned navigation into a visible shrink.
  const [animateWidth, setAnimateWidth] = useState(false);

  useEffect(() => {
    setCollapsed(readShellCollapsed(window.localStorage));
    setAnimateWidth(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((previous) => {
      const next = !previous;
      writeShellCollapsed(window.localStorage, next);
      return next;
    });
  };

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside
        suppressHydrationWarning
        data-collapsed={collapsed}
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex',
          animateWidth && 'transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-20' : 'w-60',
        )}
      >
        <BrandMark collapsed={collapsed} />
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink key={item.value} item={item} isActive={active === item.value} collapsed={collapsed} />
          ))}
        </nav>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'md:hidden')}
                >
                  <Menu className="size-4" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-sidebar-border/60 bg-sidebar p-0 text-sidebar-foreground">
                <SheetTitle className="sr-only">Primary navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Jump to Home, Rehearse, or Progress.
                </SheetDescription>
                <BrandMark collapsed={false} />
                <nav aria-label="Primary navigation" className="flex flex-col gap-1 p-3">
                  {navigation.map((item) => (
                    <NavLink
                      key={item.value}
                      item={item}
                      isActive={active === item.value}
                      collapsed={false}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'hidden md:inline-flex')}
            >
              {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
            </button>
            <span className="text-sm font-semibold tracking-tight">{navTitles[active]}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">{children}</div>
        </main>
      </div>
    </div>
  );
}
