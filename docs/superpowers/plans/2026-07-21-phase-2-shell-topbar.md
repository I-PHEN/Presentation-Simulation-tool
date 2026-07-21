# Phase 2: Shell + Global Top Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the primary navigation to Home / Rehearse / Progress and introduce a global top bar (hamburger, relocated theme toggle, account menu) so the shell matches the new product IA and gives every page a consistent top chrome.

**Architecture:** Two tasks. Task 1 renames the `StudioNavItem` values and nav labels across `AppShell` and its six route call-sites (route *paths* stay `/dashboard`, `/practice`, `/review` — they get rebuilt with real content in later phases; only labels/`active` values change now). Task 2 removes the theme toggle and collapse control from the sidebar footer and the old mobile-only header, replacing them with one universal top bar `<header>` shown on all shelled pages, containing a hamburger (mobile: opens the existing drawer; desktop: toggles rail collapse), the page title, the relocated `ThemeToggle`, and a new `AccountMenu` (avatar → sign out).

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind, Radix (`Sheet`, `DropdownMenu`), `next-themes`, Firebase auth via `useAuth`, Vitest (`renderToStaticMarkup` + source-substring tests).

## Global Constraints

- **Primary navigation is exactly Home (`/dashboard`), Rehearse (`/practice`), Progress (`/review`)** — three destinations, no more. Route paths are unchanged in this phase.
- **The theme toggle lives in the top bar, not the sidebar footer.** The sidebar rail keeps only BrandMark + nav + the New-programme action.
- **The account menu uses the existing `useAuth().logout`** — do not add a new auth mechanism.
- **Preserve the collapsible rail** with persisted state (`readShellCollapsed`/`writeShellCollapsed`) and the `aria-label="Collapse sidebar"`/`"Expand sidebar"` control; it just moves to the top bar.
- **Do not touch the unrelated dirty worktree files** (`fetch_intro.js`, `src/lib/store.ts`, `src/components/*-section.tsx`, `src/app/api/multi-chat|score|transcribe/*`, untracked `defense-shell.*`/`readiness-desk.*`). Never `git add -A`; stage only the exact paths in each task's commit step (quote bracket paths like `'src/app/practice/[sessionId]/page.tsx'`).
- **Keep the soft-depth visual system** — semantic tokens, `buttonVariants`, `shadow-e*`; no new colors or idioms.
- **Preserve the existing suite green** (187 tests before this phase) and keep `npm.cmd run build` at exit 0.
- **Environment:** Windows; run `npm.cmd run test -- <files>` and `npm.cmd run build`.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/features/defense/components/app-shell.tsx` | Nav rename (Task 1); top-bar restructure + footer removal (Task 2). |
| `src/features/defense/components/app-shell.test.tsx` | Update nav-label locks (Task 1); add top-bar/theme-toggle-location/account-menu locks (Task 2). |
| `src/app/dashboard/page.tsx` · `.test.ts` | `active="today"` → `active="home"`. |
| `src/app/practice/page.tsx` · `.test.tsx` | `active="practice"` → `active="rehearse"`. |
| `src/app/review/page.tsx` · `.test.ts` | `active="review"` → `active="progress"`. |
| `src/app/decks/new/page.tsx` · `.test.tsx` | `active="practice"` → `active="rehearse"` (two call-sites in page). |
| `src/app/practice/[sessionId]/page.tsx` | `active="practice"` → `active="rehearse"`. |
| `src/app/reports/[sessionId]/page.tsx` | `active="review"` → `active="progress"`. |
| `src/features/defense/components/account-menu.tsx` · `.test.tsx` | New account menu (avatar trigger + sign-out), Task 2. |

---

## Task 1: Rename primary navigation to Home / Rehearse / Progress

**Files:**
- Modify: `src/features/defense/components/app-shell.tsx`
- Modify: `src/features/defense/components/app-shell.test.tsx`
- Modify: `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.ts`
- Modify: `src/app/practice/page.tsx`, `src/app/practice/page.test.tsx`
- Modify: `src/app/review/page.tsx`, `src/app/review/page.test.ts`
- Modify: `src/app/decks/new/page.tsx`, `src/app/decks/new/page.test.tsx`
- Modify: `src/app/practice/[sessionId]/page.tsx`
- Modify: `src/app/reports/[sessionId]/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `StudioNavItem = 'home' | 'rehearse' | 'progress'`; nav labels `Home`/`Rehearse`/`Progress` at hrefs `/dashboard`/`/practice`/`/review`. Task 2 consumes these `active` values for the page-title map.

- [ ] **Step 1: Update the AppShell nav test to the new labels and values**

In `src/features/defense/components/app-shell.test.tsx`, replace the first test (`renders exactly the three studio destinations with their routes`) body and the sixth test's nav-section assertions so they expect the new labels. Replace the first test with:

```tsx
  it('renders exactly the three studio destinations with their routes', () => {
    const html = renderToStaticMarkup(
      <AppShell active="home"><p>Home</p></AppShell>,
    );

    expect(html).toContain('>Home<');
    expect(html).toContain('>Rehearse<');
    expect(html).toContain('>Progress<');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/practice"');
    expect(html).toContain('href="/review"');
    expect(html).not.toContain('>Today<');
    expect(html).not.toContain('/dashboard#trajectory');
  });
```

In the same file, in the test `keeps a persistent New programme action outside primary navigation while still reachable from the rail`, change the three `navSection` label assertions and the `active` prop:

```tsx
    const html = renderToStaticMarkup(
      <AppShell active="home"><p>Home</p></AppShell>,
    );
```
```tsx
    expect(navSection).toContain('>Home<');
    expect(navSection).toContain('>Rehearse<');
    expect(navSection).toContain('>Progress<');
    expect(navSection).not.toContain('/decks/new');
```

Leave the other `active="practice"`/`active="review"` usages in that file's remaining tests as `active="rehearse"`/`active="progress"` respectively: in the test `exposes an accessible control to collapse the sidebar rail` change `active="practice"` to `active="rehearse"`, and in `renders a labelled navigation landmark and marks the active destination` change `active="review"` to `active="progress"`.

- [ ] **Step 2: Run the AppShell test and verify it fails**

Run: `npm.cmd run test -- src/features/defense/components/app-shell.test.tsx`
Expected: FAIL — the shell still renders Today/Practice/Review and rejects the `home`/`rehearse`/`progress` values.

- [ ] **Step 3: Rename the nav in AppShell**

In `src/features/defense/components/app-shell.tsx`, change the type, nav array, and icon map. Replace lines 5, 12-24 with:

```tsx
import { ClipboardCheck, Home, LineChart, Menu, Mic, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
```
```tsx
export type StudioNavItem = 'home' | 'rehearse' | 'progress';

const navigation = [
  { href: '/dashboard', label: 'Home', value: 'home' },
  { href: '/practice', label: 'Rehearse', value: 'rehearse' },
  { href: '/review', label: 'Progress', value: 'progress' },
] as const;

const navIcons: Record<StudioNavItem, typeof Home> = {
  home: Home,
  rehearse: Mic,
  progress: LineChart,
};
```

(`ClipboardCheck` is no longer referenced after this change — remove it from the import if your linter flags it; the replacement import line above already drops `LayoutDashboard`, `Swords`, and `ClipboardCheck`.)

- [ ] **Step 4: Run the AppShell test and verify it passes**

Run: `npm.cmd run test -- src/features/defense/components/app-shell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Update every route call-site and its test lock**

Make these exact string replacements (each is unique in its file):

`src/app/dashboard/page.tsx`: `<AppShell active="today">` → `<AppShell active="home">`
`src/app/dashboard/page.test.ts`: `expect(source).toContain('active="today"');` → `expect(source).toContain('active="home"');`

`src/app/practice/page.tsx`: `<AppShell active="practice">` → `<AppShell active="rehearse">`
`src/app/practice/page.test.tsx`: `expect(source).toContain('active="practice"');` → `expect(source).toContain('active="rehearse"');`

`src/app/review/page.tsx`: `<AppShell active="review">` → `<AppShell active="progress">`
`src/app/review/page.test.ts`: `expect(source).toContain('active="review"');` → `expect(source).toContain('active="progress"');`

`src/app/decks/new/page.tsx`: replace BOTH occurrences of `<AppShell active="practice">` with `<AppShell active="rehearse">` (there are two — the recovery branch and the main branch).
`src/app/decks/new/page.test.tsx`: `expect(source).toContain('<AppShell active="practice">');` → `expect(source).toContain('<AppShell active="rehearse">');`

`src/app/practice/[sessionId]/page.tsx`: `<AppShell active="practice">` → `<AppShell active="rehearse">`

`src/app/reports/[sessionId]/page.tsx`: `<AppShell active="review">` → `<AppShell active="progress">`

- [ ] **Step 6: Run the full suite and build**

Run: `npm.cmd run test`
Expected: PASS — all tests green (the app-shell route-scan test still passes because route files use lowercase `active="progress"`, never the capital `Progress` label).

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 7: Commit**

```powershell
git add -- src/features/defense/components/app-shell.tsx src/features/defense/components/app-shell.test.tsx src/app/dashboard/page.tsx src/app/dashboard/page.test.ts src/app/practice/page.tsx src/app/practice/page.test.tsx src/app/review/page.tsx src/app/review/page.test.ts src/app/decks/new/page.tsx src/app/decks/new/page.test.tsx 'src/app/practice/[sessionId]/page.tsx' 'src/app/reports/[sessionId]/page.tsx'
git commit -m "feat: rename primary nav to home rehearse progress"
```

---

## Task 2: Global top bar with account menu and relocated theme toggle

**Files:**
- Create: `src/features/defense/components/account-menu.tsx`
- Create: `src/features/defense/components/account-menu.test.tsx`
- Modify: `src/features/defense/components/app-shell.tsx`
- Modify: `src/features/defense/components/app-shell.test.tsx`

**Interfaces:**
- Consumes: `StudioNavItem = 'home' | 'rehearse' | 'progress'` and `readShellCollapsed`/`writeShellCollapsed` (Task 1 / existing); `useAuth` from `@/hooks/use-auth`; `DropdownMenu*` from `@/components/ui/dropdown-menu`; `ThemeToggle` from `@/components/theme-toggle`.
- Produces: `AccountMenu` component (no props) rendering an `aria-label="Account menu"` trigger and a sign-out item wired to `logout`.

- [ ] **Step 1: Write the failing account-menu tests**

Create `src/features/defense/components/account-menu.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccountMenu } from './account-menu';

describe('AccountMenu', () => {
  it('renders an accessible account trigger', () => {
    const html = renderToStaticMarkup(<AccountMenu />);
    expect(html).toContain('aria-label="Account menu"');
  });

  it('wires sign-out to the auth logout', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/features/defense/components/account-menu.tsx'), 'utf8');
    expect(source).toContain('useAuth');
    expect(source).toContain('logout');
    expect(source).toContain('Sign out');
  });
});
```

- [ ] **Step 2: Run the account-menu test and verify it fails**

Run: `npm.cmd run test -- src/features/defense/components/account-menu.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Implement the AccountMenu**

Create `src/features/defense/components/account-menu.tsx`:

```tsx
'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function AccountMenu() {
  const { user, logout } = useAuth();
  const name = user?.displayName ?? user?.email ?? 'Guest';
  const initial = name.trim().charAt(0).toUpperCase() || 'G';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >
            {initial}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Run the account-menu test and verify it passes**

Run: `npm.cmd run test -- src/features/defense/components/account-menu.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the top-bar locks to the AppShell test**

In `src/features/defense/components/app-shell.test.tsx`, replace the test `passes the collapse state to the desktop theme toggle so it stays icon-only in the collapsed rail` (it no longer holds — the theme toggle moves to the always-expanded top bar) with these two tests:

```tsx
  it('renders a global top bar carrying the theme toggle and account menu', () => {
    const html = renderToStaticMarkup(
      <AppShell active="home"><p>Home</p></AppShell>,
    );

    expect(html).toContain('aria-label="Account menu"');
    // The theme toggle renders its accessible switch label.
    expect(html).toMatch(/aria-label="Switch to (light|dark) mode"/);
  });

  it('keeps the theme toggle and account menu out of the sidebar rail', () => {
    const html = renderToStaticMarkup(
      <AppShell active="home"><p>Home</p></AppShell>,
    );
    const asideStart = html.indexOf('<aside');
    const asideEnd = html.indexOf('</aside>', asideStart);
    const aside = html.slice(asideStart, asideEnd);

    expect(aside).not.toContain('aria-label="Account menu"');
    expect(aside).not.toMatch(/aria-label="Switch to (light|dark) mode"/);
  });
```

- [ ] **Step 6: Run the AppShell test and verify the new locks fail**

Run: `npm.cmd run test -- src/features/defense/components/app-shell.test.tsx`
Expected: FAIL — the theme toggle is still in the `<aside>` footer and there is no account menu yet.

- [ ] **Step 7: Restructure AppShell — remove the footer, add the universal top bar**

In `src/features/defense/components/app-shell.tsx`:

1. Add the import near the other component imports:

```tsx
import { AccountMenu } from './account-menu';
```

2. Add a page-title map beside the `navIcons` map:

```tsx
const navTitles: Record<StudioNavItem, string> = {
  home: 'Home',
  rehearse: 'Rehearse',
  progress: 'Progress',
};
```

3. Delete the sidebar footer entirely — remove the divider `<div className="mx-3 h-px bg-sidebar-border/50" />` and the following footer `<div>` block that holds `<ThemeToggle collapsed={collapsed} />` and the collapse `<button>` (the block spanning the `flex items-center gap-2 px-3 py-3` container). After this, the `<aside>` ends right after the `NewProgrammeAction` wrapper `<div>`.

4. Replace the entire mobile-only `<header>` (the `md:hidden` header block) with this universal top bar, placed as the first child of the content column `<div className="flex min-h-dvh flex-1 flex-col">`:

```tsx
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
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
                <div className="px-3 pb-4">
                  <NewProgrammeAction collapsed={false} onNavigate={() => setMobileOpen(false)} />
                </div>
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
```

The `<main>` element stays exactly as it is, immediately after this header.

- [ ] **Step 8: Run the AppShell test and the full suite**

Run: `npm.cmd run test -- src/features/defense/components/app-shell.test.tsx src/features/defense/components/account-menu.test.tsx`
Expected: PASS — the top-bar/account-menu locks pass and the theme toggle is no longer inside `<aside>`.

Run: `npm.cmd run test`
Expected: PASS — full suite green.

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 9: Commit**

```powershell
git add -- src/features/defense/components/account-menu.tsx src/features/defense/components/account-menu.test.tsx src/features/defense/components/app-shell.tsx src/features/defense/components/app-shell.test.tsx
git commit -m "feat: add global top bar with account menu"
```

---

## Plan self-review

- **Spec coverage:** Implements PRD §4 "Global top bar" (hamburger, theme toggle relocated to top-right, account menu → sign out) and the Home/Rehearse/Progress nav from PRD §4's IA table. Route-path renames are intentionally deferred to the phases that rebuild each destination's content (Rehearse in Phase 3; Home/Progress in Phase 8), per the PRD §9 sequencing — noted so a reviewer does not treat the unchanged paths as a gap. The collapsible rail (already built) is preserved and its control relocated.
- **Placeholder scan:** No TBD/TODO; every code and test step has complete content; all commands have expected output.
- **Type consistency:** `StudioNavItem` is redefined once in Task 1 (`'home' | 'rehearse' | 'progress'`) and every `active=` call-site and the `navTitles`/`navIcons` maps in Task 2 use exactly those three values. `AccountMenu` is defined in Task 2 Step 3 with the exact `aria-label="Account menu"` string its tests and the AppShell top-bar lock assert. The `ThemeToggle` import already exists in `app-shell.tsx`; it is reused (now in the top bar) rather than redefined.
