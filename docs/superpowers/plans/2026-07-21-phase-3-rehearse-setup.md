# Phase 3 — Rehearse Setup (Unified Configure Screen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-page `/decks/new` → `/practice/[id]?view=setup` split with a single, guided "Rehearse setup" screen that uploads the deck, sets a title, picks the room conditions (mode + stance), creates a fully-configured session in one request, and drops the user straight into the rehearsal room.

**Architecture:** A new client component `RehearseSetup` composes the on-ramp as two soft-depth cards — **Step 01 "What are you rehearsing?"** (deck upload + editable title + slide-thumbnail strip) and **Step 02 "Who's in the room?"** (practice-mode + examiner-stance pickers). It owns the upload (reusing the already-tested `parseUploadedDeck`) and emits a `RehearseConfig` to the route. The `/decks/new` route is slimmed to: auth gate → render `RehearseSetup` → on start, `POST /api/session` with the full config (via pure `buildRehearseSessionPayload`) → `router.push('/practice/<id>?view=room')`. The existing `PracticeSetup` component and the `?view=setup` branch are **left untouched** — they remain the "Continue setup" path for resuming a session that was created but never configured (routed there by `studio-session-model.ts`, which this phase does not touch).

**Tech Stack:** Next.js App Router (client components), TypeScript, Tailwind v4 semantic tokens, Vitest + `react-dom/server` `renderToStaticMarkup`, existing `authenticatedFetch` + `/api/upload-presentation` + `/api/session`.

## Global Constraints

- **Soft-depth visual system only** (established in the prior redesign): cards `rounded-xl border border-border bg-card p-6 shadow-e1`; buttons via `buttonVariants` from `@/components/ui/button` (never hand-rolled `bg-foreground`/ink or underline links); radio cards `rounded-lg border border-border bg-surface`, selected `border-primary bg-accent shadow-e1`; display headings `font-display text-3xl sm:text-4xl font-medium tracking-tight`; eyebrows `text-xs font-medium text-muted-foreground` (no uppercase tracking). Copy `cn` from `@/lib/utils`.
- **Honesty over theater:** deck is the ONLY source (no screen-share, no topic-prompt — not even disabled/"coming soon" tiles; the user explicitly excluded them). Every control on the screen must map to a capability the session actually honors today (deck, `mode`, `stance`). No inert controls.
- **Do not touch** `studio-session-model.ts`, `practice-hub.tsx`, `review-workspace.tsx`, `studio-desk.tsx`, `practice-setup.tsx`, or any of their tests — the `?view=setup` "Continue setup" resume path stays exactly as-is.
- **Reuse, don't rebuild:** import `parseUploadedDeck` from `./deck-intake` (keep `deck-intake.tsx` in place); reuse `authenticatedFetch`, `AuthenticatedSlideImage`, `buttonVariants`. No backend changes — `POST /api/session` already accepts `{ title, mode, stance, deck }` (today's flow sends exactly that).
- **Test style:** pure functions unit-tested; components via `renderToStaticMarkup` substring assertions; network via an injected fetcher. **Apostrophe gotcha:** `renderToStaticMarkup` encodes `'` as `&#x27;`, so test only substrings that contain **no apostrophe** (e.g. assert `'in the room?'`, never `"Who's in the room?"`).
- After each task: `npm.cmd run test` green, and stage only that task's named files.

---

### Task 1: `RehearseSetup` component + pure payload builder

**Files:**
- Create: `src/features/defense/components/rehearse-setup.tsx`
- Test: `src/features/defense/components/rehearse-setup.test.tsx`

**Interfaces:**
- Consumes: `parseUploadedDeck` from `src/features/defense/components/deck-intake.tsx` (exists: `(response: unknown) => DeckContext | null`); `DeckContext`, `DefenseMode`, `ExaminerStance` from `src/features/defense/types.ts`; `authenticatedFetch` from `src/lib/authenticated-fetch.tsx`; `AuthenticatedSlideImage` from `src/lib/authenticated-asset.tsx`; `buttonVariants` from `src/components/ui/button.tsx`; `cn` from `src/lib/utils.ts`.
- Produces (Task 2 relies on these exact names/types):
  - `interface RehearseConfig { deck: DeckContext; title: string; mode: DefenseMode; stance: ExaminerStance }`
  - `buildRehearseSessionPayload(config: RehearseConfig): { title: string; mode: DefenseMode; stance: ExaminerStance; deck: DeckContext }` — trims `title`, falling back to `deck.sourceName` when blank.
  - `RehearseSetup(props: { creating?: boolean; startError?: string; onStart: (config: RehearseConfig) => void; uploadFetcher?: typeof fetch }): React.ReactElement`

- [ ] **Step 1: Write the failing test**

Create `src/features/defense/components/rehearse-setup.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RehearseSetup, buildRehearseSessionPayload } from './rehearse-setup';

const deck = {
  sourceName: 'Thesis.pdf',
  slides: [{ index: 1, text: 'Opening argument', imageUrl: '/slides/1.png' }],
};

describe('buildRehearseSessionPayload', () => {
  it('passes the chosen title, mode, stance, and deck straight through', () => {
    expect(
      buildRehearseSessionPayload({ deck, title: 'Final defense', mode: 'mock', stance: 'supportive' }),
    ).toEqual({ title: 'Final defense', mode: 'mock', stance: 'supportive', deck });
  });

  it('falls back to the deck source name when the title is blank', () => {
    expect(
      buildRehearseSessionPayload({ deck, title: '   ', mode: 'diagnostic', stance: 'rigorous' }),
    ).toEqual({ title: 'Thesis.pdf', mode: 'diagnostic', stance: 'rigorous', deck });
  });
});

describe('RehearseSetup', () => {
  it('renders both guided steps with deck-only source and the room conditions', () => {
    const html = renderToStaticMarkup(<RehearseSetup onStart={() => undefined} />);

    // Two-step framing
    expect(html).toContain('What are you rehearsing?');
    expect(html).toContain('in the room?');
    // Step 1 = deck upload only
    expect(html).toContain('Presentation deck (PPTX, PPT, or PDF)');
    // Deck-only honesty: no other sources, not even placeholders
    expect(html).not.toContain('Share screen');
    expect(html).not.toContain('Screen share');
    expect(html).not.toContain('Topic prompt');
    expect(html).not.toContain('Coming soon');
    // Step 2 = the real conditions we support today
    expect(html).toContain('Diagnostic practice');
    expect(html).toContain('Mock defense');
    expect(html).toContain('Rigorous');
    expect(html).toContain('Supportive');
    expect(html.match(/name="rehearse-mode"/g)).toHaveLength(2);
    expect(html.match(/name="rehearse-stance"/g)).toHaveLength(2);
    // No fabricated audience controls
    expect(html).not.toContain('Audience type');
    expect(html).not.toContain('AI Panel');
    expect(html).not.toContain('audience size');
  });

  it('disables the start action until a deck is uploaded', () => {
    const html = renderToStaticMarkup(<RehearseSetup onStart={() => undefined} />);

    expect(html).toContain('Start rehearsal');
    // The primary action is disabled in the initial (no-deck) state.
    expect(html).toMatch(/Start rehearsal<\/button>/);
    expect(html).toContain('disabled=""');
  });

  it('shows the creating label and the start error when provided', () => {
    const html = renderToStaticMarkup(
      <RehearseSetup onStart={() => undefined} creating startError="The service is busy." />,
    );

    expect(html).toContain('Starting rehearsal...');
    expect(html).toContain('The service is busy.');
    expect(html).toContain('role="alert"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/features/defense/components/rehearse-setup.test.tsx`
Expected: FAIL — cannot resolve `./rehearse-setup` (module does not exist yet).

- [ ] **Step 3: Write the component + pure builder**

Create `src/features/defense/components/rehearse-setup.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';
import type { DeckContext, DefenseMode, ExaminerStance } from '@/features/defense/types';
import { parseUploadedDeck } from './deck-intake';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RehearseConfig {
  deck: DeckContext;
  title: string;
  mode: DefenseMode;
  stance: ExaminerStance;
}

export function buildRehearseSessionPayload({ deck, title, mode, stance }: RehearseConfig) {
  const trimmed = title.trim();
  return { title: trimmed.length > 0 ? trimmed : deck.sourceName, mode, stance, deck };
}

const MODES: ReadonlyArray<readonly [DefenseMode, string, string]> = [
  ['diagnostic', 'Diagnostic practice', 'Pauses on weak reasoning so you can repair it before moving on.'],
  ['mock', 'Mock defense', 'Keeps the examination moving under realistic pressure, start to finish.'],
];

const STANCES: ReadonlyArray<readonly [ExaminerStance, string, string]> = [
  ['rigorous', 'Rigorous', 'Probes your assumptions and evidence hard.'],
  ['supportive', 'Supportive', 'Asks clear questions while still testing your understanding.'],
];

const ACCEPT =
  '.pptx,.ppt,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf';

const RADIO_CARD =
  'cursor-pointer rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-popover has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary';

export function RehearseSetup({
  creating = false,
  startError,
  onStart,
  uploadFetcher = authenticatedFetch,
}: {
  creating?: boolean;
  startError?: string;
  onStart: (config: RehearseConfig) => void;
  uploadFetcher?: typeof fetch;
}): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deck, setDeck] = useState<DeckContext | null>(null);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<DefenseMode>('diagnostic');
  const [stance, setStance] = useState<ExaminerStance>('rigorous');
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<{ message: string; retryable: boolean } | null>(null);

  const upload = async (selectedFile: File) => {
    setProcessing(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await uploadFetcher('/api/upload-presentation', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        setUploadError({ message: data.error || 'The deck could not be processed.', retryable: Boolean(data.retryable) });
        return;
      }
      const readyDeck = parseUploadedDeck(data);
      if (!readyDeck) {
        setUploadError({ message: 'The upload response did not contain a valid deck. Please choose a different file.', retryable: false });
        return;
      }
      setDeck(readyDeck);
      setTitle((current) => (current.trim().length > 0 ? current : readyDeck.sourceName));
    } catch {
      setUploadError({ message: 'The upload could not reach the server. Please try again.', retryable: true });
    } finally {
      setProcessing(false);
    }
  };

  const chooseFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setDeck(null);
    void upload(selectedFile);
  };

  const start = () => {
    if (!deck) return;
    onStart({ deck, title, mode, stance });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <header>
        <p className="text-xs font-medium text-muted-foreground">New rehearsal</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-medium tracking-tight">Set up your rehearsal</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Two quick decisions: what are you rehearsing, and who is in the room.
        </p>
      </header>

      <section aria-labelledby="rehearse-step-source" className="rounded-xl border border-border bg-card p-6 shadow-e1 sm:p-8">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground">01</span>
          <h2 id="rehearse-step-source" className="text-base font-medium">What are you rehearsing?</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Upload the deck you will present. We render every slide and keep its text as defense evidence.
        </p>

        {!deck ? (
          <div className="mt-5 rounded-lg border border-border bg-surface/60 p-6">
            <label htmlFor="rehearse-deck" className="text-sm font-medium">Presentation deck (PPTX, PPT, or PDF)</label>
            <input
              id="rehearse-deck"
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={(event) => chooseFile(event.target.files?.[0])}
              className="mt-3 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground file:shadow-e1 hover:file:bg-primary/90"
            />
            {processing && <p className="mt-4 text-sm text-muted-foreground" role="status">Processing your deck. Rendering slides and extracting text...</p>}
            {uploadError && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
                <p>{uploadError.message}</p>
                {uploadError.retryable && file && (
                  <button type="button" onClick={() => void upload(file)} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-2')}>
                    Retry upload
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label htmlFor="rehearse-title" className="text-sm font-medium">Title</label>
                <input
                  id="rehearse-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
                />
                <p className="mt-2 text-xs text-muted-foreground">{deck.slides.length} slides ready.</p>
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} className={cn(buttonVariants({ variant: 'secondary' }), 'w-fit')}>Replace deck</button>
            </div>
            <input ref={inputRef} className="sr-only" type="file" accept={ACCEPT} onChange={(event) => chooseFile(event.target.files?.[0])} />
            <ol className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {deck.slides.map((slide) => (
                <li key={slide.index} className="shrink-0">
                  <AuthenticatedSlideImage source={slide.imageUrl} alt={`Slide ${slide.index}`} className="h-20 w-32 rounded-lg border border-border object-cover" />
                  <span className="mt-1 block text-center font-mono text-[11px] text-muted-foreground">{String(slide.index).padStart(2, '0')}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section
        aria-labelledby="rehearse-step-room"
        aria-disabled={!deck}
        className={cn('rounded-xl border border-border bg-card p-6 shadow-e1 transition-opacity sm:p-8', !deck && 'opacity-60')}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground">02</span>
          <h2 id="rehearse-step-room" className="text-base font-medium">Who is in the room?</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Set how the examiner should challenge you. You can change this next time.</p>

        <fieldset className="mt-5" disabled={!deck}>
          <legend className="text-sm font-medium">Practice mode</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MODES.map(([value, label, help]) => (
              <label key={value} className={cn(RADIO_CARD, mode === value && 'border-primary bg-accent shadow-e1')}>
                <input type="radio" name="rehearse-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{help}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6" disabled={!deck}>
          <legend className="text-sm font-medium">Examiner stance</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {STANCES.map(([value, label, help]) => (
              <label key={value} className={cn(RADIO_CARD, stance === value && 'border-primary bg-accent shadow-e1')}>
                <input type="radio" name="rehearse-stance" value={value} checked={stance === value} onChange={() => setStance(value)} className="sr-only" />
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{help}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {startError && <p role="alert" className="text-sm text-destructive">{startError}</p>}
      <button type="button" disabled={!deck || creating} onClick={start} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
        {creating ? 'Starting rehearsal...' : 'Start rehearsal'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- src/features/defense/components/rehearse-setup.test.tsx`
Expected: PASS (all four cases).

- [ ] **Step 5: Run the full suite**

Run: `npm.cmd run test`
Expected: PASS — 190 prior tests plus the new file, zero failures (no other file imports this component yet).

- [ ] **Step 6: Commit**

```bash
git add src/features/defense/components/rehearse-setup.tsx src/features/defense/components/rehearse-setup.test.tsx
git commit -m "feat: add unified RehearseSetup configure component"
```

---

### Task 2: Wire `/decks/new` to the unified screen and one-shot create → room

**Files:**
- Modify (rewrite): `src/app/decks/new/page.tsx`
- Modify (rewrite): `src/app/decks/new/page.test.tsx`

**Interfaces:**
- Consumes: `RehearseSetup`, `buildRehearseSessionPayload`, `RehearseConfig` from `src/features/defense/components/rehearse-setup.tsx` (Task 1); `AppShell` from `src/features/defense/components/app-shell.tsx`; `useAuth` from `src/hooks/use-auth.tsx`; `authenticatedFetch` from `src/lib/authenticated-fetch.tsx`; `useRouter` from `next/navigation`.
- Produces: default `NewDeckPage`; exported pure helpers `isAuthenticationRejected(status: number): boolean` and `sessionCreateFailureMessage(response: { status: number }, data: unknown): string | null`; exported `SignInRecovery(): React.ReactElement`.
- Behavior change: this route no longer navigates to `?view=setup`; it POSTs a fully-configured session and navigates to `?view=room`. The `?view=setup` "Continue setup" resume path is produced elsewhere (`studio-session-model.ts`) and is intentionally left intact.

> **Note on removed exports:** the previous page exported `createDefenseSessionPayload`, `continuationBlockMessage`, `continuationRequestFailureMessage`, `DeckContinuationRecovery`, `DeckContinuationError`, `DeckContinuationAction`. The only importer is this route's own test (verified by grep — all other references are in docs). The rewritten test below replaces its coverage, so removing them is safe.

- [ ] **Step 1: Rewrite the test to the new behavior**

Replace the entire contents of `src/app/decks/new/page.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SignInRecovery, isAuthenticationRejected, sessionCreateFailureMessage } from './page';

describe('rehearse setup route', () => {
  it('keeps the unified configure screen inside the Rehearse shell state', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/decks/new/page.tsx'), 'utf8');
    expect(source).toContain('<AppShell active="rehearse">');
    expect(source).toContain('<RehearseSetup');
  });

  it('creates a fully-configured session and enters the room in one step', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/decks/new/page.tsx'), 'utf8');
    // One-shot: straight into the room, never the intermediate setup view.
    expect(source).toContain('?view=room');
    expect(source).not.toContain('?view=setup');
    expect(source).toContain('buildRehearseSessionPayload');
  });
});

describe('sessionCreateFailureMessage', () => {
  it('routes authentication rejections to persistent sign-in recovery', () => {
    expect(sessionCreateFailureMessage({ status: 401 }, { error: 'Token expired' })).toBe('Your session has ended. Sign in again to continue.');
    expect(sessionCreateFailureMessage({ status: 403 }, { error: 'Forbidden' })).toBe('Your session has ended. Sign in again to continue.');
  });

  it('keeps non-auth failures retryable with their server message', () => {
    expect(sessionCreateFailureMessage({ status: 500 }, { error: 'The service is busy.' })).toBe('The service is busy.');
  });

  it('falls back to a generic message when the server gives none', () => {
    expect(sessionCreateFailureMessage({ status: 500 }, {})).toBe('Unable to create the rehearsal session.');
  });

  it('returns null for a successful response', () => {
    expect(sessionCreateFailureMessage({ status: 200 }, { sessionId: 's1' })).toBeNull();
  });
});

describe('isAuthenticationRejected', () => {
  it('treats 401 and 403 as authentication rejections', () => {
    expect(isAuthenticationRejected(401)).toBe(true);
    expect(isAuthenticationRejected(403)).toBe(true);
    expect(isAuthenticationRejected(500)).toBe(false);
  });
});

describe('SignInRecovery', () => {
  it('renders the sign-in recovery alert with a login link', () => {
    const html = renderToStaticMarkup(<SignInRecovery />);
    expect(html).toContain('Your session has ended. Sign in again to continue.');
    expect(html).toContain('href="/login"');
    expect(html).toContain('role="alert"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd run test -- src/app/decks/new/page.test.tsx`
Expected: FAIL — `./page` does not export `SignInRecovery`/`sessionCreateFailureMessage`, and the source still contains `?view=setup` / `createDefenseSessionPayload`.

- [ ] **Step 3: Rewrite the route**

Replace the entire contents of `src/app/decks/new/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/features/defense/components/app-shell';
import { RehearseSetup, buildRehearseSessionPayload, type RehearseConfig } from '@/features/defense/components/rehearse-setup';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export function isAuthenticationRejected(status: number): boolean {
  return status === 401 || status === 403;
}

export function sessionCreateFailureMessage(response: { status: number }, data: unknown): string | null {
  if (isAuthenticationRejected(response.status)) return 'Your session has ended. Sign in again to continue.';
  if (response.status < 400) return null;
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error) return data.error;
  return 'Unable to create the rehearsal session.';
}

export function SignInRecovery(): React.ReactElement {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
      Your session has ended. Sign in again to continue.
      <a className="ml-2 font-medium underline underline-offset-4" href="/login">Sign in</a>
    </div>
  );
}

export default function NewDeckPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  const start = async (config: RehearseConfig) => {
    setCreating(true);
    setError(undefined);
    try {
      const response = await authenticatedFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRehearseSessionPayload(config)),
      });
      const data = await response.json();
      const failure = sessionCreateFailureMessage(response, data);
      if (failure) throw new Error(failure);
      if (!data.sessionId) throw new Error('Unable to create the rehearsal session.');
      router.push(`/practice/${data.sessionId}?view=room`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the rehearsal session.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return null;
  if (!user) return <AppShell active="rehearse"><SignInRecovery /></AppShell>;
  return (
    <AppShell active="rehearse">
      <RehearseSetup creating={creating} startError={error} onStart={(config) => void start(config)} />
    </AppShell>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- src/app/decks/new/page.test.tsx`
Expected: PASS (all cases).

- [ ] **Step 5: Run the full suite and build**

Run: `npm.cmd run test`
Expected: PASS — full suite green (the old `createDefenseSessionPayload`/`DeckContinuation*` tests are gone, replaced by the new ones; no other file imports the removed exports).

Run: `npm.cmd run build`
Expected: exit 0 (the Office trace-copy warning, if present, is non-fatal).

- [ ] **Step 6: Commit**

```bash
git add src/app/decks/new/page.tsx src/app/decks/new/page.test.tsx
git commit -m "feat: rebuild /decks/new as one-shot rehearse setup into the room"
```

---

## Manual verification (after both tasks)

Run the dev server (`npm.cmd run dev`, port 3000) and, in **both** themes plus at 390px width:

1. Sign in (Guest Mode) → click **New programme** in the rail → lands on `/decks/new` showing "Set up your rehearsal", Step 01 + Step 02, Step 02 dimmed until a deck is present, **Start rehearsal** disabled.
2. Upload a PPTX/PDF → slide thumbnails appear, title pre-fills with the source name and is editable, Step 02 becomes active.
3. Pick Mock + Supportive, edit the title → **Start rehearsal** → session is created and the browser goes straight to `/practice/<id>?view=room` (no intermediate setup screen).
4. Confirm **no** "Share screen" / "Topic" / "Coming soon" / audience-size controls appear anywhere.
5. Confirm the existing **"Continue setup"** affordance on Home / Rehearse / Progress still routes to `/practice/<id>?view=setup` and renders the untouched `PracticeSetup` (resume path intact).

## Self-review notes (author)

- **Spec coverage (PRD §5.1):** one clean guided screen ✔ (replaces the two-page split for the create flow); Step 1 source = deck + title + thumbnails ✔; Step 2 audience = the real conditions we support (mode + stance) ✔; Start → create → room ✔; screen-share/topic deliberately excluded per the user ✔. Persona/size/interruption are **not** built (no engine support yet — honesty constraint) and arrive with Phase 4–5.
- **No new backend:** `POST /api/session` already accepts `{ title, mode, stance, deck }` — today's flow sends exactly this shape; only the values become user-chosen.
- **Resume path preserved:** `PracticeSetup`, `?view=setup`, and `studio-session-model.ts` are untouched, so the five test files asserting "Continue setup" stay green with zero edits.
- **Type consistency:** `RehearseConfig` / `buildRehearseSessionPayload` / `RehearseSetup` names and signatures match between Task 1 (produced) and Task 2 (consumed).
- **Deferred (note for later phases, do not fix here):** a session created via the new flow starts in the same status the old create used (unchanged), so `studio-session-model` may still label a freshly-created-but-not-yet-rehearsed row "Continue setup" until the room advances its status — pre-existing model behavior, out of Phase 3 scope.
