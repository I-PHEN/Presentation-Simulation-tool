# Studio Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the framework-like defense dashboard with a dark-default, action-first Studio Desk whose Today, Practice, and Review destinations all perform real work against the existing session APIs.

**Architecture:** A small shared session model turns the UI-safe `/api/sessions` payload into route-specific action models. A client-side `AppShell` owns the collapsible rail and mobile drawer, while focused presentational workspaces render Today, Practice, and Review without inventing scores, coach content, or fake routes. Existing deck intake, rehearsal room, report generation, session APIs, and voice behaviour are preserved.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4 semantic tokens, `next-themes`, Vitest, existing Firebase auth and Prisma-backed defense APIs.

## Global Constraints

- Dark is the default: `defaultTheme="dark"`, `enableSystem={false}`, with a real light-mode toggle.
- Primary navigation is exactly Today (`/dashboard`), Practice (`/practice`), and Review (`/review`); do not render `Progress` or `/dashboard#trajectory`.
- Every first viewport contains a real, data-backed action. Copy is one-sentence decision support, not a landing-page or chat-style block.
- Do not add APIs, Prisma schema changes, LLM calls, synthetic scores, streaks, quotes, or non-functional challenge flows.
- Keep PDF and PowerPoint deck intake and the existing deck-continuation/auth-recovery behaviour unchanged and tested.
- Use one restrained cobalt action accent through semantic CSS tokens; no gradients, generic KPI tiles, chat bubbles, or floating card-island layout.
- Preserve unrelated dirty worktree changes. Stage only files named in each task.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/features/defense/studio-session-model.ts` | Pure mapping from safe defense sessions to Today, Practice, and Review models. |
| `src/features/defense/studio-session-model.test.ts` | Deterministic routing/action tests for all session states. |
| `src/features/defense/use-defense-sessions.ts` | Authenticated client fetch hook with loading, visible error, and retry state. |
| `src/features/defense/use-defense-sessions.test.ts` | Tests the exported session loader used by the hook. |
| `src/features/defense/components/app-shell.tsx` | Dark Studio Desk rail, collapse persistence, mobile drawer, and route navigation. |
| `src/features/defense/components/studio-desk.tsx` | Today workspace: next rehearsal, deck cue, only real coach finding/report information. |
| `src/features/defense/components/practice-hub.tsx` | Practice workspace: active programme, real setup/resume action, recent sessions. |
| `src/features/defense/components/review-workspace.tsx` | Review workspace: actual session history and valid report/resume actions. |
| `src/app/dashboard/page.tsx` | Authenticated Today route integration. |
| `src/app/practice/page.tsx` | Replaces deck-intake redirect with the real Practice route. |
| `src/app/review/page.tsx` | New collection-level Review route. |
| `src/app/layout.tsx`, `src/app/globals.css` | Dark-default theme provider and Studio Desk semantic theme tokens. |

## Task 1: Establish the dark Studio Desk shell

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/theme-toggle.tsx`
- Modify: `src/features/defense/components/app-shell.tsx`
- Modify: `src/features/defense/components/app-shell.test.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/decks/new/page.tsx`
- Modify: `src/app/practice/[sessionId]/page.tsx`
- Modify: `src/app/reports/[sessionId]/page.tsx`
- Create: `src/features/defense/shell-preference.ts`
- Create: `src/features/defense/shell-preference.test.ts`

**Interfaces:**
- Consumes: `ThemeToggle`, `next-themes`, `DefenseNavItem` callers on dashboard, deck intake, practice, and report pages.
- Produces: `StudioNavItem = 'today' | 'practice' | 'review'` and `readShellCollapsed(storage): boolean`, `writeShellCollapsed(storage, collapsed): void`.

- [ ] **Step 1: Write failing preference and shell-contract tests**

```ts
import { describe, expect, it } from 'vitest';
import { readShellCollapsed, writeShellCollapsed } from './shell-preference';

const storage = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
};

it('starts expanded and persists a collapsed rail preference', () => {
  expect(readShellCollapsed(fakeStorage)).toBe(false);
  writeShellCollapsed(fakeStorage, true);
  expect(readShellCollapsed(fakeStorage)).toBe(true);
});
```

Update `app-shell.test.tsx` so its static markup assertion requires `Today`, `Practice`, `Review`, `/dashboard`, `/practice`, `/review`, an accessible `Collapse sidebar` button, and explicitly rejects `Progress` and `/dashboard#trajectory`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm.cmd run test -- src/features/defense/shell-preference.test.ts src/features/defense/components/app-shell.test.tsx`

Expected: FAIL because the preference module, Review navigation, and collapse control do not exist.

- [ ] **Step 3: Implement pure preference storage and shell state**

Create `shell-preference.ts`:

```ts
export const SHELL_COLLAPSED_KEY = 'sparring-shell-collapsed';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function readShellCollapsed(storage: StorageLike): boolean {
  return storage.getItem(SHELL_COLLAPSED_KEY) === 'true';
}

export function writeShellCollapsed(storage: StorageLike, collapsed: boolean): void {
  storage.setItem(SHELL_COLLAPSED_KEY, String(collapsed));
}
```

Convert `AppShell` to a client component. Replace the header-only navigation with a semantic desktop `<aside>` and mobile `<header>`/drawer. Keep route entries in one array:

```ts
const navigation = [
  { href: '/dashboard', label: 'Today', value: 'today' },
  { href: '/practice', label: 'Practice', value: 'practice' },
  { href: '/review', label: 'Review', value: 'review' },
] as const;
```

Initialize `collapsed` as `false`, hydrate from `readShellCollapsed(window.localStorage)` in an effect, and write on every user-triggered toggle. The collapsed control must carry `aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}`. Use semantic `sidebar-*`, `background`, `foreground`, `border`, `primary`, and `muted-*` tokens; use visible labels in the mobile drawer even when desktop is collapsed.

Change the provider in `layout.tsx` to:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
```

Update theme tokens in `globals.css` so dark surfaces are charcoal, text contrast is high, and `--primary` is a restrained cobalt rather than a monochrome swap. Keep `.dark` and `:root` as complete real theme systems. Update `ThemeToggle` to use a compact rounded-rectangle control with an explicit label, not a floating circular icon.

Update every existing shell call site in this task so the type contract remains valid while later tasks replace the route content:

```tsx
// dashboard
<AppShell active="today">...</AppShell>
// deck intake and all practice-session setup pages
<AppShell active="practice">...</AppShell>
// individual report page
<AppShell active="review">...</AppShell>
```

- [ ] **Step 4: Run focused tests and type/build smoke check**

Run: `npm.cmd run test -- src/features/defense/shell-preference.test.ts src/features/defense/components/app-shell.test.tsx`

Expected: PASS.

Run: `npm.cmd run build`

Expected: exit code 0; the known Microsoft Office trace-copy warning is non-fatal only if route compilation succeeds.

- [ ] **Step 5: Commit the shell task**

```powershell
git add -- src/app/layout.tsx src/app/globals.css src/components/theme-toggle.tsx src/features/defense/shell-preference.ts src/features/defense/shell-preference.test.ts src/features/defense/components/app-shell.tsx src/features/defense/components/app-shell.test.tsx src/app/dashboard/page.tsx src/app/decks/new/page.tsx src/app/practice/[sessionId]/page.tsx src/app/reports/[sessionId]/page.tsx
git commit -m "feat: add dark studio desk shell"
```

## Task 2: Build a data-backed Studio session model

**Files:**
- Create: `src/features/defense/studio-session-model.ts`
- Create: `src/features/defense/studio-session-model.test.ts`
- Create: `src/features/defense/use-defense-sessions.ts`
- Create: `src/features/defense/use-defense-sessions.test.ts`

**Interfaces:**
- Consumes: the UI-safe `/api/sessions` response.
- Produces: `StudioSession`, `loadDefenseSessions(fetcher)`, `useDefenseSessions()`, `buildTodayModel(sessions)`, `buildPracticeModel(sessions)`, and `buildReviewRows(sessions)`.

- [ ] **Step 1: Write failing model tests for real actions**

```ts
it('routes a practicing deck session to the voice room', () => {
  expect(buildTodayModel([practicingDeckSession]).primaryAction).toEqual({
    label: 'Resume rehearsal',
    href: '/practice/session-1?view=room',
  });
});

it('routes a completed session to its existing report', () => {
  expect(buildReviewRows([completedSession])[0].action).toEqual({
    label: 'Open review', href: '/reports/session-1',
  });
});

it('does not manufacture a coach note when the API supplied no finding or report', () => {
  expect(buildTodayModel([deckOnlySession]).coachNote).toBeUndefined();
});
```

Include test cases for no sessions, deck-less sessions, setup sessions, practicing sessions, completed/reportable sessions, and multiple sessions ordered newest-first.

Add a loader test that accepts an injected fetcher and proves that a non-OK response throws a visible retryable error instead of silently returning an empty collection:

```ts
it('throws when the authenticated session request fails', async () => {
  await expect(loadDefenseSessions(async () => new Response('{}', { status: 500 }))).rejects.toThrow('Unable to load your sessions.');
});
```

- [ ] **Step 2: Run the model test and verify failure**

Run: `npm.cmd run test -- src/features/defense/studio-session-model.test.ts`

Expected: FAIL because the model module and exported functions do not exist.

- [ ] **Step 3: Implement the small pure model**

Define the safe session shape once:

```ts
export type StudioSession = {
  id: string;
  title: string;
  createdAt?: string;
  status: string;
  mode: 'diagnostic' | 'mock';
  stance: 'supportive' | 'rigorous';
  deck?: DeckContext;
  finding?: { title: string; evidence: string; drill: string };
  report?: { nextDrill: string; highestLeverage: { title: string; slideIndex: number } };
};
export type StudioAction = { label: string; href: string };
export type TodayModel = {
  empty: boolean;
  primaryAction: StudioAction;
  active?: { id: string; title: string; status: string; deck: DeckContext; cue?: string; coachNote?: string; reportHref?: string };
};
```

Use the newest API session (`sessions[0]`) as the active programme. Map status exactly:

```ts
const href = session.status === 'practicing'
  ? `/practice/${session.id}?view=room`
  : `/practice/${session.id}?view=setup`;
const label = session.status === 'practicing' ? 'Resume rehearsal' : 'Continue setup';
```

For a completed/report-backed row, use `/reports/${session.id}` and `Open review`. For a deck-less row, use `/decks/new` and `Import deck`. `coachNote` is only `finding.drill`, `finding.evidence`, or `report.nextDrill` when one exists; omit it otherwise. Remove the retired daily-challenge and trajectory fields from `coach-home-model` after route consumers migrate in later tasks, and delete their now-invalid tests.

Implement the shared loader and hook beside the model:

```ts
export async function loadDefenseSessions(fetcher: typeof authenticatedFetch = authenticatedFetch): Promise<StudioSession[]> {
  const response = await fetcher('/api/sessions');
  if (!response.ok) throw new Error('Unable to load your sessions.');
  const body = await response.json() as { sessions?: StudioSession[] };
  return body.sessions ?? [];
}
```

`useDefenseSessions()` owns `{ sessions, loading, error }`, calls `loadDefenseSessions()` on mount, and returns `retry()` which repeats the same request. It never converts a failure into an empty successful state.

- [ ] **Step 4: Run focused model tests**

Run: `npm.cmd run test -- src/features/defense/studio-session-model.test.ts`

Expected: PASS with every action resolving to an existing route.

- [ ] **Step 5: Commit the model task**

```powershell
git add -- src/features/defense/studio-session-model.ts src/features/defense/studio-session-model.test.ts src/features/defense/use-defense-sessions.ts src/features/defense/use-defense-sessions.test.ts
git commit -m "feat: add studio session action models"
```

## Task 3: Render the action-first Today Studio Desk

**Files:**
- Create: `src/features/defense/components/studio-desk.tsx`
- Create: `src/features/defense/components/studio-desk.test.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/page.test.ts`
- Delete: `src/features/defense/components/coach-home.tsx`
- Delete: `src/features/defense/components/coach-home.test.tsx`
- Delete: `src/features/defense/coach-home-model.ts`
- Delete: `src/features/defense/coach-home-model.test.ts`

**Interfaces:**
- Consumes: `TodayModel` from `studio-session-model.ts`, `AppShell active="today"`, `useAuth`, and the existing authenticated session endpoint.
- Produces: a Today route whose first visible action is backed by a real session or deck-import route.

- [ ] **Step 1: Write failing Today workspace tests**

```tsx
it('renders an active rehearsal action, deck cue, and only an API-backed coach note', () => {
  const html = renderToStaticMarkup(<StudioDesk model={practicingTodayModel} />);
  expect(html).toContain('Resume rehearsal');
  expect(html).toContain('Slide 4');
  expect(html).toContain('Explain the evidence.');
  expect(html).not.toContain('Daily speaking challenge');
});

it('renders import as the only primary action for an empty workspace', () => {
  const html = renderToStaticMarkup(<StudioDesk model={emptyTodayModel} />);
  expect(html).toContain('Import deck');
  expect(html).not.toContain('Overall score');
});
```

Update `dashboard/page.test.ts` to require `StudioDesk`, `useDefenseSessions`, `buildTodayModel`, and `active="today"`; reject `CoachHome`, `Progress`, daily challenge copy, and score/KPI vocabulary.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm.cmd run test -- src/features/defense/components/studio-desk.test.tsx src/app/dashboard/page.test.ts`

Expected: FAIL because `StudioDesk` is not implemented and dashboard still renders `CoachHome`.

- [ ] **Step 3: Implement the connected desk, not dashboard cards**

Render `StudioDesk` as a contiguous workspace with named regions:

```tsx
<section aria-labelledby="next-rehearsal-heading">
  <p>Your next rehearsal</p>
  <h1 id="next-rehearsal-heading">{model.active?.title ?? 'Build your first defense programme'}</h1>
  <Link href={model.primaryAction.href}>{model.primaryAction.label}</Link>
</section>
```

When `model.active?.deck` exists, render a real slide preview using the first/current safe slide image, source file name, slide count, and the data-backed cue. Render the coach-note region only when `model.active.coachNote` exists. When `reportHref` exists, render `Open latest review`; otherwise omit the control.

Refactor dashboard to use `useDefenseSessions()` rather than an inline fetch effect. On hook error, render a visible `role="alert"` with a `Retry` button that calls `retry()`. Do not substitute made-up programme detail. Use the Studio shell and structural grid/dividers, compact controls, and semantic tokens; do not create a card grid.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd run test -- src/features/defense/components/studio-desk.test.tsx src/app/dashboard/page.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the Today task**

```powershell
git add -- src/features/defense/components/studio-desk.tsx src/features/defense/components/studio-desk.test.tsx src/app/dashboard/page.tsx src/app/dashboard/page.test.ts src/features/defense/components/coach-home.tsx src/features/defense/components/coach-home.test.tsx src/features/defense/coach-home-model.ts src/features/defense/coach-home-model.test.ts
git commit -m "feat: render action-first studio desk"
```

## Task 4: Make Practice and Review real destinations

**Files:**
- Create: `src/features/defense/components/practice-hub.tsx`
- Create: `src/features/defense/components/practice-hub.test.tsx`
- Create: `src/features/defense/components/review-workspace.tsx`
- Create: `src/features/defense/components/review-workspace.test.tsx`
- Create: `src/app/review/page.tsx`
- Create: `src/app/review/page.test.ts`
- Modify: `src/app/practice/page.tsx`
- Modify: `src/app/practice/page.test.tsx`

**Interfaces:**
- Consumes: `buildPracticeModel`, `buildReviewRows`, authenticated `/api/sessions`, `AppShell`, and existing `/decks/new`, `/practice/:id`, `/reports/:id` routes.
- Produces: first-class Practice and Review pages with no redirect-only route and no fake progress anchor.

- [ ] **Step 1: Write failing Practice and Review tests**

```tsx
it('makes a practicing programme resumable from Practice', () => {
  const html = renderToStaticMarkup(<PracticeHub model={practicingPracticeModel} />);
  expect(html).toContain('Resume rehearsal');
  expect(html).toContain('href="/practice/session-1?view=room"');
});

it('uses deck intake as the real first-programme action', () => {
  const html = renderToStaticMarkup(<PracticeHub model={emptyPracticeModel} />);
  expect(html).toContain('href="/decks/new"');
  expect(html).toContain('Import deck');
});

it('maps completed and unfinished sessions to different Review actions', () => {
  const html = renderToStaticMarkup(<ReviewWorkspace rows={reviewRows} />);
  expect(html).toContain('Open review');
  expect(html).toContain('Resume');
});
```

Replace the current Practice route test’s redirect assertion with assertions for `PracticeHub`, `buildPracticeModel`, and `AppShell active="practice"`. Add Review route assertions for `ReviewWorkspace`, `buildReviewRows`, and `AppShell active="review"`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm.cmd run test -- src/features/defense/components/practice-hub.test.tsx src/features/defense/components/review-workspace.test.tsx src/app/practice/page.test.tsx src/app/review/page.test.ts`

Expected: FAIL because the hubs and `/review` route do not exist, and `/practice` still redirects.

- [ ] **Step 3: Implement Practice hub and route**

`PracticeHub` renders one active-programme row and a compact recent-session list. Its only top-level actions are model-provided real `Link`s. For an empty model, render one import-deck action. It must not include a dead mode selector or generic “practice more” prose.

Implement `/practice` as an authenticated client route following dashboard’s auth redirect and `useDefenseSessions()` pattern. On request error, render a visible retry action. On success, wrap `<PracticeHub model={buildPracticeModel(sessions)} />` in `<AppShell active="practice">`.

- [ ] **Step 4: Implement Review workspace and route**

`ReviewWorkspace` renders a chronological semantic list (`<ol>`) of model rows. Each row has programme title, true session status, optional deck source, and exactly one action link. Use `Open review` only when `row.action.href` is `/reports/:id`; use `Resume`/`Continue setup` for the existing practice route. Its empty state links to `/practice`.

Implement `/review` with the same authenticated `useDefenseSessions()`/error/retry pattern and `<AppShell active="review">`.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd run test -- src/features/defense/components/practice-hub.test.tsx src/features/defense/components/review-workspace.test.tsx src/app/practice/page.test.tsx src/app/review/page.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the routes task**

```powershell
git add -- src/features/defense/components/practice-hub.tsx src/features/defense/components/practice-hub.test.tsx src/features/defense/components/review-workspace.tsx src/features/defense/components/review-workspace.test.tsx src/app/practice/page.tsx src/app/practice/page.test.tsx src/app/review/page.tsx src/app/review/page.test.ts
git commit -m "feat: add working practice and review workspaces"
```

## Task 5: Integrate intake/report shell states and verify the complete flow

**Files:**
- Modify: `src/app/decks/new/page.test.tsx`
- Modify: `src/app/practice/[sessionId]/page.test.tsx`
- Modify: `src/features/defense/components/app-shell.test.tsx`
- Modify: `docs/superpowers/specs/2026-07-19-studio-desk-product-shell-design.md` only if verification exposes an ambiguity.

**Interfaces:**
- Consumes: new `StudioNavItem` values and existing deck continuation/rehearsal/report contracts.
- Produces: shell-consistent intake/setup/report pages and verified primary user paths.

- [ ] **Step 1: Add cross-route regression coverage**

```ts
it('keeps deck intake inside the Practice shell state', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/decks/new/page.tsx'), 'utf8');
  expect(source).toContain('<AppShell active="practice">');
});

it('keeps rehearsal room completion routed to the existing individual report', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/practice/[sessionId]/page.tsx'), 'utf8');
  expect(source).toContain('router.push(`/reports/${session.id}`)');
});
```

Add an assertion that no primary route source references `dashboard#trajectory`, the `Progress` label, or the retired `CoachHome` component. This locks together the shell, Today, Practice, and Review work completed in Tasks 1–4.

- [ ] **Step 2: Run focused integration tests**

Run: `npm.cmd run test -- src/app/decks/new/page.test.tsx src/app/practice/[sessionId]/page.test.tsx src/features/defense/components/app-shell.test.tsx`

Expected: PASS. A failure identifies a cross-route regression introduced by one of the preceding tasks and must be corrected before full verification.

- [ ] **Step 3: Correct only an observed cross-route compatibility defect**

If the focused contracts fail, correct only the observed issue: deck intake and dynamic practice setup must use the `practice` shell state; the immersive rehearsal room stays unwrapped; all deck receipt, PowerPoint/PDF upload, disabled submit, auth recovery, and retry logic remain untouched. Do not refactor unrelated code in this task.

- [ ] **Step 4: Run complete automated verification**

Run: `npm.cmd run test`

Expected: PASS with all existing and new tests green.

Run: `npm.cmd run build`

Expected: exit code 0 with all routes compiling. Treat only the known Microsoft Office trace-copy warning as non-fatal.

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 5: Perform browser acceptance checks**

Start the merged main checkout on an unused local port, then verify:

1. Dark Today loads by default and its primary action points to deck intake or a real session route.
2. Sidebar collapse persists after reload; 390px mobile shows an accessible drawer, not clipped rail content.
3. Theme toggle switches the full semantic surface system to light mode.
4. Practice has a data-backed action and no redirect loop.
5. Review lists actual sessions and its action links resolve to existing report or practice URLs.
6. Deck intake accepts `.ppt`/`.pptx` and preserves the receipt/recoverable error behaviour established by existing tests.

- [ ] **Step 6: Commit the integration task**

```powershell
git add -- src/app/decks/new/page.test.tsx src/app/practice/[sessionId]/page.test.tsx src/features/defense/components/app-shell.test.tsx
git commit -m "feat: integrate studio desk application flow"
```

## Plan self-review

- **Spec coverage:** Task 1 implements dark default, real light mode, desktop collapse persistence, and mobile drawer. Task 2 prevents invented state. Task 3 implements the action-first Today desk. Task 4 creates the working Practice and Review destinations. Task 5 preserves intake/voice/report behaviour and verifies all acceptance criteria.
- **Placeholder scan:** No task uses deferred work, generic test instructions, or undefined route/action names.
- **Type consistency:** `StudioSession`, `StudioAction`, `TodayModel`, `buildTodayModel`, `buildPracticeModel`, and `buildReviewRows` are defined in Task 2 before Tasks 3 and 4 consume them. `StudioNavItem` is defined in Task 1 before all route shell integrations use it.
