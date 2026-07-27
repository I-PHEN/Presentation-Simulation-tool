'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { Home, LineChart, Menu, Mic } from 'lucide-react';
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

// The rail collapses to exactly the icon column: px-3 + a 36px cell + px-3.
// Every row shares that geometry, so collapsing changes widths and nothing
// else - no element ever moves sideways or re-centres mid-animation.
const RAIL_LABEL = 'w-42';
const NAV_LABEL = 'w-45';

function SquadMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground"
    >
      SP
    </span>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn('flex h-14 min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight text-sidebar-foreground', className)}
    >
      <SquadMark />
      <span className="truncate">Sparring Partner</span>
    </Link>
  );
}

/** The logo is the toggle: one control at the top of the panel it opens and
 * closes, carrying the resize cursor so the affordance reads before the click. */
function RailHeader({ collapsed, animate, onToggle }: { collapsed: boolean; animate: boolean; onToggle: () => void }) {
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  return (
    <div className="flex h-14 shrink-0 items-center px-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        title={label}
        className="flex size-9 shrink-0 cursor-ew-resize items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent/50"
      >
        <SquadMark />
      </button>
      <span
        aria-hidden={collapsed}
        className={cn(
          'ml-2.5 truncate text-sm font-semibold tracking-tight text-sidebar-foreground',
          animate && 'transition-[width,opacity] duration-200 ease-in-out',
          collapsed ? 'w-0 opacity-0' : `${RAIL_LABEL} opacity-100`,
        )}
      >
        Sparring Partner
      </span>
    </div>
  );
}

function NavLink({
  item,
  isActive,
  collapsed,
  animate = false,
  onNavigate,
}: {
  item: (typeof navigation)[number];
  isActive: boolean;
  collapsed: boolean;
  animate?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = navIcons[item.value];
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className="relative flex items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground"
    >
      {/* Fixed-width cell: the icon sits on the same axis open or closed. */}
      <span className="flex size-9 shrink-0 items-center justify-center">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span
        className={cn(
          'truncate pr-3',
          animate && 'transition-[width,opacity] duration-200 ease-in-out',
          collapsed ? 'w-0 opacity-0' : `${NAV_LABEL} opacity-100`,
        )}
      >
        {item.label}
      </span>
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

  // Clicking the closed rail's empty space reopens it, but a click that landed
  // on a destination or the toggle itself is that control's, not the rail's.
  const expandFromRail = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('a,button')) return;
    toggleCollapsed();
  };

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside
        suppressHydrationWarning
        data-collapsed={collapsed}
        // Closed, the whole rail reads as a handle: hovering anywhere on it
        // shows the resize cursor, and a click on its empty space reopens it.
        onClick={collapsed ? expandFromRail : undefined}
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex',
          animateWidth && 'transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-15 cursor-ew-resize' : 'w-60',
        )}
      >
        <RailHeader collapsed={collapsed} animate={animateWidth} onToggle={toggleCollapsed} />
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink key={item.value} item={item} isActive={active === item.value} collapsed={collapsed} animate={animateWidth} />
          ))}
        </nav>
        {/* Drag-handle-style strip along the full edge of the panel. */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={toggleCollapsed}
          className="absolute inset-y-0 right-0 w-2 cursor-ew-resize transition-colors hover:bg-sidebar-accent/40"
        />
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
                <BrandMark className="px-5" />
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
            <span className="text-sm font-semibold tracking-tight">{navTitles[active]}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
