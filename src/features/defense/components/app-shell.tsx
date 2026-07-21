'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ClipboardCheck, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Plus, Swords } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { readShellCollapsed, writeShellCollapsed } from '../shell-preference';

export type StudioNavItem = 'today' | 'practice' | 'review';

const navigation = [
  { href: '/dashboard', label: 'Today', value: 'today' },
  { href: '/practice', label: 'Practice', value: 'practice' },
  { href: '/review', label: 'Review', value: 'review' },
] as const;

const navIcons: Record<StudioNavItem, typeof LayoutDashboard> = {
  today: LayoutDashboard,
  practice: Swords,
  review: ClipboardCheck,
};

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        'flex h-14 shrink-0 items-center gap-2.5 px-4 text-sm font-semibold tracking-tight text-sidebar-foreground',
        collapsed && 'justify-center px-0',
      )}
    >
      <span className="relative flex size-7 shrink-0 items-center justify-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-lg bg-primary/40 blur-md" />
        <span
          aria-hidden="true"
          className="relative flex size-7 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground shadow-e1"
        >
          SP
        </span>
      </span>
      <span className={collapsed ? 'sr-only' : undefined}>Sparring Partner</span>
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
      className={cn(
        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-0',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0',
        )}
      />
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={collapsed ? 'sr-only' : undefined}>{item.label}</span>
    </Link>
  );
}

function NewProgrammeAction({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href="/decks/new"
      title={collapsed ? 'New programme' : undefined}
      onClick={onNavigate}
      className={cn(
        buttonVariants({ variant: 'secondary', size: collapsed ? 'icon' : 'sm' }),
        collapsed ? 'shrink-0' : 'w-full',
      )}
    >
      <Plus className="size-4 shrink-0" aria-hidden="true" />
      <span className={collapsed ? 'sr-only' : undefined}>New programme</span>
    </Link>
  );
}

export function AppShell({ active, children }: {
  active: StudioNavItem;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(readShellCollapsed(window.localStorage));
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
        data-collapsed={collapsed}
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar text-sidebar-foreground transition-[width] duration-150 ease-in-out md:flex',
          collapsed ? 'w-20' : 'w-60',
        )}
      >
        <BrandMark collapsed={collapsed} />
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink key={item.value} item={item} isActive={active === item.value} collapsed={collapsed} />
          ))}
        </nav>
        <div className={cn('px-3 pb-3', collapsed && 'flex justify-center')}>
          <NewProgrammeAction collapsed={collapsed} />
        </div>
        <div className="mx-3 h-px bg-sidebar-border/50" />
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-3',
            collapsed ? 'flex-col' : 'flex-row justify-between',
          )}
        >
          <ThemeToggle collapsed={collapsed} />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          >
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                >
                  <Menu className="size-4" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-sidebar-border/60 bg-sidebar p-0 text-sidebar-foreground">
                <SheetTitle className="sr-only">Primary navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Jump to Today, Practice, or Review.
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
                <div className="px-3 pb-4">
                  <NewProgrammeAction collapsed={false} onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold tracking-tight">Sparring Partner</span>
          </div>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">{children}</div>
        </main>
      </div>
    </div>
  );
}
