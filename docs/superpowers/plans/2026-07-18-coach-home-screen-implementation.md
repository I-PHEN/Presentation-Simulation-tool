# Coach Home Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the skeletal dashboard with a calm, defense-first personal speaking-coach home screen and make deck continuation fail visibly rather than silently.

**Architecture:** Keep the dashboard data-driven but deterministic. A pure home-model function converts the existing `/api/sessions` response into the copy and links used by a focused `CoachHome` component; no LLM call or new dashboard API is needed. The dashboard page supplies authenticated session data, while the deck intake route owns its own continuation status and recovery feedback.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS semantic tokens, Vitest, existing Firebase/mock auth, existing `/api/sessions` and `/api/session` routes.

## Global Constraints

- Build only the main/front screen and the deck-to-practice continuation failure path.
- Keep Sparring Partner as the broad product identity and Thesis defense as the active programme.
- Use only the existing true light/dark semantic tokens; no gradients, coloured modes, AI or chat motifs, KPI grids, scoreboards, or card-island layouts.
- Make one next-practice action primary; progress is explanatory supporting context.
- Do not call an LLM to render the home screen.
- Daily speaking challenge is a non-deceptive preview in this scope; do not create a non-existent challenge flow or route.
- Preserve unrelated legacy interview/configuration files and do not commit unless the user explicitly requests it.

---

### Task 1: Create the deterministic coach-home model

**Files:**
- Create: `src/features/defense/coach-home-model.ts`
- Create: `src/features/defense/coach-home-model.test.ts`

**Interfaces:**
- Consumes: the UI-safe session shape from `GET /api/sessions`: `id`, `title`, `status`, `mode`, `stance`, optional `deck`, optional `finding`, and optional `report`.
- Produces: `buildCoachHomeModel(sessions: CoachHomeSession[]): CoachHomeModel` for `CoachHome` in Task 2.

- [ ] **Step 1: Write failing model tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildCoachHomeModel } from './coach-home-model';

describe('buildCoachHomeModel', () => {
  it('gives a new student a first-plan action and a non-interactive challenge preview', () => {
    expect(buildCoachHomeModel([])).toMatchObject({
      nextPractice: {
        title: 'Build your first defense practice plan',
        actionLabel: 'Import your defense deck',
        href: '/decks/new',
      },
      programme: undefined,
      dailyChallenge: { title: 'Explain a difficult decision in 60 seconds', available: false },
    });
  });

  it('turns the newest active defense into a single practice recommendation', () => {
    const model = buildCoachHomeModel([{
      id: 'defense-1', title: 'Final thesis defense', status: 'practicing', mode: 'diagnostic', stance: 'rigorous',
      deck: { sourceName: 'Final-defense.pptx', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide-1.jpg' }] },
      finding: { title: 'Make the opening claim defendable', evidence: 'The claim needs an explicit basis.', drill: 'State the evidence before the conclusion.' },
    }]);

    expect(model.nextPractice).toMatchObject({
      title: 'Make the opening claim defendable',
      actionLabel: 'Resume guided rehearsal',
      href: '/practice/defense-1?view=room',
    });
    expect(model.programme).toMatchObject({ title: 'Final thesis defense', slideCount: 1 });
  });

  it('uses a setup link for a defense that has not started and avoids score language', () => {
    const model = buildCoachHomeModel([{
      id: 'defense-2', title: 'Dissertation', status: 'upload', mode: 'diagnostic', stance: 'rigorous',
      deck: { sourceName: 'Dissertation.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide-1.jpg' }] },
    }]);

    expect(model.nextPractice.href).toBe('/practice/defense-2?view=setup');
    expect(JSON.stringify(model)).not.toMatch(/score|readiness/i);
  });
});
```

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npm.cmd run test -- src/features/defense/coach-home-model.test.ts`

Expected: FAIL because `./coach-home-model` does not exist.

- [ ] **Step 3: Implement the explicit model contract**

```ts
import type { DeckContext } from './types';

export type CoachHomeSession = {
  id: string;
  title: string;
  status: string;
  mode: 'diagnostic' | 'mock';
  stance: 'supportive' | 'rigorous';
  deck?: DeckContext;
  finding?: { title: string; evidence: string; drill: string };
  report?: { nextDrill: string; highestLeverage: { title: string; slideIndex: number } };
};

export type CoachHomeModel = {
  nextPractice: { eyebrow: string; title: string; summary: string; actionLabel: string; href: string; duration: string };
  trajectory: { label: string; detail: string; milestone: string };
  programme?: { title: string; sourceName: string; slideCount: number; href: string };
  dailyChallenge: { title: string; target: string; duration: string; available: false };
};

export function buildCoachHomeModel(sessions: CoachHomeSession[]): CoachHomeModel {
  const session = sessions[0];
  const dailyChallenge = { title: 'Explain a difficult decision in 60 seconds', target: 'Clarity and structure', duration: '3 min', available: false as const };
  if (!session?.deck) {
    return {
      nextPractice: { eyebrow: 'Your first programme', title: 'Build your first defense practice plan', summary: 'Import the deck you will defend, then practise against the evidence on every slide.', actionLabel: 'Import your defense deck', href: '/decks/new', duration: '5 min setup' },
      trajectory: { label: 'Your trajectory', detail: 'Your first rehearsal creates a personal baseline for future coaching.', milestone: 'Start with one focused practice.' },
      dailyChallenge,
    };
  }
  const resumeRoom = session.status === 'practicing';
  const focus = session.finding?.title ?? session.report?.nextDrill ?? 'Strengthen your defense explanation';
  return {
    nextPractice: { eyebrow: `Thesis defense · ${resumeRoom ? 'resume' : 'next session'}`, title: focus, summary: session.finding?.drill ?? 'Give a concise explanation before the examiner presses for evidence.', actionLabel: resumeRoom ? 'Resume guided rehearsal' : 'Prepare guided rehearsal', href: `/practice/${session.id}?view=${resumeRoom ? 'room' : 'setup'}`, duration: '12 min' },
    trajectory: { label: 'Your trajectory', detail: sessions.length === 1 ? 'Your first defense programme is ready. One rehearsal will give your coach a useful baseline.' : `${sessions.length} defense sessions are recorded. Consistent repetition makes your explanation more precise.`, milestone: session.report?.nextDrill ?? 'Practise the claim, evidence, and conclusion in order.' },
    programme: { title: session.title, sourceName: session.deck.sourceName, slideCount: session.deck.slides.length, href: `/practice/${session.id}?view=setup` },
    dailyChallenge,
  };
}
```

- [ ] **Step 4: Run the focused test to verify the model**

Run: `npm.cmd run test -- src/features/defense/coach-home-model.test.ts`

Expected: PASS with 3 tests.

- [ ] **Step 5: Check the new model has no forbidden display language**

Run: `rg -n -i "overall score|readiness|kpi|leaderboard" src/features/defense/coach-home-model.ts`

Expected: exit code 1 with no matches.

### Task 2: Build the calm CoachHome composition

**Files:**
- Create: `src/features/defense/components/coach-home.tsx`
- Create: `src/features/defense/components/coach-home.test.tsx`

**Interfaces:**
- Consumes: `CoachHomeModel` from `src/features/defense/coach-home-model.ts`.
- Produces: `CoachHome({ name, model })`, rendered by the dashboard in Task 3.

- [ ] **Step 1: Write a failing static-render test for the home hierarchy**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CoachHome } from './coach-home';

const model = {
  nextPractice: { eyebrow: 'Thesis defense · next session', title: 'Make the opening claim defendable', summary: 'State the evidence before the conclusion.', actionLabel: 'Start guided rehearsal', href: '/practice/s1?view=setup', duration: '12 min' },
  trajectory: { label: 'Your trajectory', detail: 'Two defense sessions are recorded.', milestone: 'Practise the claim, evidence, and conclusion in order.' },
  programme: { title: 'Final thesis defense', sourceName: 'Final-defense.pptx', slideCount: 12, href: '/practice/s1?view=setup' },
  dailyChallenge: { title: 'Explain a difficult decision in 60 seconds', target: 'Clarity and structure', duration: '3 min', available: false as const },
};

describe('CoachHome', () => {
  it('renders one dominant next-practice action with quiet coaching context', () => {
    const html = renderToStaticMarkup(<CoachHome name="Michael" model={model} />);
    expect(html).toContain('Good to see you, Michael.');
    expect(html).toContain('Your next best practice');
    expect(html).toContain('Start guided rehearsal');
    expect(html).toContain('Your trajectory');
    expect(html).toContain('Daily speaking challenge');
    expect(html).not.toMatch(/Overall Score|Practice History|AI Panel Members/);
  });

  it('uses a first-plan action when there is no active programme', () => {
    const html = renderToStaticMarkup(<CoachHome name="Michael" model={{ ...model, programme: undefined, nextPractice: { ...model.nextPractice, actionLabel: 'Import your defense deck', href: '/decks/new' } }} />);
    expect(html).toContain('Import your defense deck');
    expect(html).not.toContain('Final thesis defense');
  });
});
```

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npm.cmd run test -- src/features/defense/components/coach-home.test.tsx`

Expected: FAIL because `./coach-home` does not exist.

- [ ] **Step 3: Implement a single editorial flow using semantic theme tokens**

```tsx
import Link from 'next/link';
import type { CoachHomeModel } from '@/features/defense/coach-home-model';

export function CoachHome({ name, model }: { name: string; model: CoachHomeModel }) {
  return (
    <div className="border-y border-border">
      <section className="py-10 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Today</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you, {name}.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">A short, focused voice practice will make your explanation stronger today.</p>
      </section>
      <section className="border-t border-border py-7 sm:py-9" aria-labelledby="next-practice-heading">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Your next best practice · {model.nextPractice.duration}</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl"><h2 id="next-practice-heading" className="text-2xl font-semibold tracking-tight">{model.nextPractice.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{model.nextPractice.summary}</p></div>
          <Link href={model.nextPractice.href} className="inline-flex w-fit items-center justify-center bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85">{model.nextPractice.actionLabel}</Link>
        </div>
      </section>
      <section id="trajectory" className="grid border-t border-border md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" aria-labelledby="trajectory-heading">
        <div className="py-7 md:border-r md:border-border md:pr-8"><p id="trajectory-heading" className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{model.trajectory.label}</p><p className="mt-4 max-w-sm text-sm leading-6">{model.trajectory.detail}</p></div>
        <div className="border-t border-border py-7 md:border-t-0 md:pl-8"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Next milestone</p><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{model.trajectory.milestone}</p></div>
      </section>
      {model.programme && <section id="programme" className="flex flex-col gap-3 border-t border-border py-7 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Current programme</p><p className="mt-2 text-sm font-medium">{model.programme.title}</p><p className="mt-1 text-sm text-muted-foreground">{model.programme.sourceName} · {model.programme.slideCount} slides</p></div><Link href={model.programme.href} className="text-sm font-medium underline underline-offset-4">View defense plan</Link></section>}
      <section className="border-t border-border py-7" aria-labelledby="daily-challenge-heading"><p id="daily-challenge-heading" className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Daily speaking challenge · coming next</p><p className="mt-3 text-base font-medium tracking-tight">{model.dailyChallenge.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{model.dailyChallenge.target} · {model.dailyChallenge.duration} voice drill</p></section>
    </div>
  );
}
```

- [ ] **Step 4: Run the focused component test**

Run: `npm.cmd run test -- src/features/defense/components/coach-home.test.tsx`

Expected: PASS with 2 tests.

- [ ] **Step 5: Review the component’s visual constraints**

Run: `rg -n -i "gradient|score|kpi|rounded-\[|shadow" src/features/defense/components/coach-home.tsx`

Expected: exit code 1 with no matches.

### Task 3: Integrate CoachHome and make the shell product-led

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/page.test.ts`
- Modify: `src/features/defense/components/app-shell.tsx`
- Modify: `src/features/defense/components/app-shell.test.tsx`
- Modify: `src/features/defense/components/overview-workspace.tsx`
- Modify: `src/features/defense/components/overview-workspace.test.tsx`

**Interfaces:**
- Consumes: `CoachHomeSession` and `buildCoachHomeModel` from Task 1 and `CoachHome` from Task 2.
- Produces: `/dashboard` as the front screen; `AppShell` labels the selected dashboard route as Today.

- [ ] **Step 1: Update route and shell tests before the integration**

```ts
it('renders the coach home rather than the retired overview workspace', () => {
  const source = readRoute('src/app/dashboard/page.tsx');
  expect(source).toContain('CoachHome');
  expect(source).toContain('buildCoachHomeModel');
  expect(source).not.toContain('OverviewWorkspace');
});
```

```tsx
it('names the product and the dashboard route in student-facing language', () => {
  const html = renderToStaticMarkup(<AppShell active="overview"><p>Today</p></AppShell>);
  expect(html).toContain('Sparring Partner');
  expect(html).toContain('>Today<');
  expect(html).toContain('href="/dashboard#trajectory"');
});
```

- [ ] **Step 2: Run the focused integration tests to verify failure**

Run: `npm.cmd run test -- src/app/dashboard/page.test.ts src/features/defense/components/app-shell.test.tsx`

Expected: FAIL because the route still imports `OverviewWorkspace` and the shell still labels the product `Defense`.

- [ ] **Step 3: Integrate the home model without adding a new backend endpoint**

```tsx
// src/app/dashboard/page.tsx
import { AppShell } from '@/features/defense/components/app-shell';
import { CoachHome } from '@/features/defense/components/coach-home';
import { buildCoachHomeModel, type CoachHomeSession } from '@/features/defense/coach-home-model';

type SessionsResponse = { sessions?: CoachHomeSession[] };

// Keep the existing auth redirect and authenticatedFetch lifecycle.
// Replace latestSession state with CoachHomeSession[] state.
// Render the stable empty model while the session request is pending or fails.
return (
  <AppShell active="overview">
    <CoachHome name={user.displayName?.split(' ')[0] || 'there'} model={buildCoachHomeModel(sessions)} />
  </AppShell>
);
```

```tsx
// src/features/defense/components/app-shell.tsx
const navigation = [
  { href: '/dashboard', label: 'Today', value: 'overview' },
  { href: '/practice', label: 'Practice', value: 'practice' },
  { href: '/dashboard#trajectory', label: 'Progress', value: 'reports' },
];

// Use "Sparring Partner" as the `/dashboard` brand link.
// Keep the theme toggle and account link; do not add a faux progress route.
```

Remove `OverviewWorkspace` and its obsolete test only after dashboard tests no longer import it. Do not alter the deck intake, room, report, or legacy interview components in this task.

- [ ] **Step 4: Run focused route and shell tests**

Run: `npm.cmd run test -- src/app/dashboard/page.test.ts src/features/defense/components/app-shell.test.tsx src/features/defense/coach-home-model.test.ts src/features/defense/components/coach-home.test.tsx`

Expected: PASS with all focused tests green.

- [ ] **Step 5: Manually verify the home in both themes**

Run: `npm.cmd run dev -- -p 3001`

Check at `http://localhost:3001/dashboard`:

- Light and dark themes retain readable body text and borders.
- The next-practice action is the only filled primary action.
- The current programme and daily challenge do not read as isolated dashboard cards.
- At a 390px width, all home content remains in one vertical flow and no primary copy is cut off.

### Task 4: Make deck continuation recoverable and test it

**Files:**
- Modify: `src/app/decks/new/page.tsx`
- Modify: `src/app/decks/new/page.test.tsx`
- Modify: `src/features/defense/components/deck-intake.tsx`
- Modify: `src/features/defense/components/deck-intake.test.tsx`

**Interfaces:**
- Consumes: `DeckContext` from the validated upload receipt and `authenticatedFetch` for `POST /api/session`.
- Produces: a clearly disabled creating state or inline recoverable error; success still navigates to `/practice/<id>?view=setup`.

- [ ] **Step 1: Add failing pure-logic tests for blocked continuation**

```ts
import { continuationBlockMessage, createDefenseSessionPayload } from './page';

it('explains why continuation cannot begin without the upload receipt', () => {
  expect(continuationBlockMessage({ hasUser: true, hasDeck: false })).toBe('Your uploaded deck is no longer available. Select it again to continue.');
});

it('explains when authentication has expired', () => {
  expect(continuationBlockMessage({ hasUser: false, hasDeck: true })).toBe('Your session has ended. Sign in again to continue.');
});

it('allows continuation when both prerequisites exist', () => {
  expect(continuationBlockMessage({ hasUser: true, hasDeck: true })).toBeNull();
});
```

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npm.cmd run test -- src/app/decks/new/page.test.tsx`

Expected: FAIL because `continuationBlockMessage` is not exported.

- [ ] **Step 3: Add the explicit continuation guard and visible states**

```tsx
export function continuationBlockMessage({ hasUser, hasDeck }: { hasUser: boolean; hasDeck: boolean }): string | null {
  if (!hasDeck) return 'Your uploaded deck is no longer available. Select it again to continue.';
  if (!hasUser) return 'Your session has ended. Sign in again to continue.';
  return null;
}

const continueToPractice = async () => {
  const blockMessage = continuationBlockMessage({ hasUser: Boolean(user), hasDeck: Boolean(deck) });
  if (blockMessage) { setError(blockMessage); return; }
  // Keep the existing authenticated POST and router.push success path.
};

// Render the control only for a validated receipt, but make it inaccessible while creating.
<button type="button" disabled={creating} aria-describedby={error ? 'deck-continuation-error' : undefined}>
  {creating ? 'Creating your defense session...' : 'Continue to defense setup'}
</button>
{error && <p id="deck-continuation-error" className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
```

In `DeckIntake`, keep the validated receipt rendered during the parent continuation state. The replace control must remain the only way to invalidate a successful receipt; do not reset the receipt after a successful upload merely because the parent re-renders.

- [ ] **Step 4: Run deck continuation and intake tests**

Run: `npm.cmd run test -- src/app/decks/new/page.test.tsx src/features/defense/components/deck-intake.test.tsx`

Expected: PASS with the existing payload test plus the three new guard tests.

- [ ] **Step 5: Browser smoke the actual continuation**

At `http://localhost:3001/decks/new`:

1. Upload a PPTX, PPT, or PDF.
2. Confirm the receipt stays visible with the deck name and slide preview.
3. Click `Continue to defense setup` once.
4. Confirm the button becomes disabled while creating, then the browser reaches `/practice/<sessionId>?view=setup`.
5. If the session API is unavailable, confirm the error is visible and the receipt remains available for retry.

### Task 5: Full verification and handoff

**Files:**
- Modify only if a verification failure identifies a defect within Tasks 1–4.

**Interfaces:**
- Consumes: all focused home and continuation tests.
- Produces: a production-ready dashboard/front screen with verified primary flow.

- [ ] **Step 1: Run the complete test suite**

Run: `npm.cmd run test`

Expected: PASS with all test files and tests green.

- [ ] **Step 2: Run the production build**

Run: `npm.cmd run build`

Expected: exit code 0. Treat the known local Office-path trace warning as non-fatal only if no route fails to compile.

- [ ] **Step 3: Inspect the changed scope**

Run: `git diff --check; git status --short`

Expected: no whitespace errors in files touched by this plan. Do not stage unrelated dirty legacy files.

- [ ] **Step 4: Hand off the running app**

Start or confirm the dev server at `http://localhost:3001/dashboard`, state the test/build evidence, and clearly separate any unrelated pre-existing worktree changes from this scope.
