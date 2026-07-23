# Phase 8 — Longitudinal (Home + Progress) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Feed each grounded report into the persistent `SpeakerProfile`, then surface it — Home shows the one thing to work on next; Progress shows per-dimension growth, recurring weaknesses, and session history.

**Architecture:** Reuse the Phase-1 coaching engine (`applyOutcomeToProfile`/`recordSessionOutcome`, already tested). New pure modules map grounded `CoachingMetrics` → 0–100 dimensions and build the Progress view model. The report route records the outcome once (idempotent via a new `Session.outcomeRecorded` flag). Read side: `GET /api/profile` + `dimensions` on `/api/sessions`; Home gets a next-focus card; the `/review` page (the "Progress" nav) is rebuilt into `ProgressWorkspace` with inline-SVG sparklines.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Zod, Prisma/SQLite, Vitest (`environment: 'node'`, `renderToStaticMarkup` + injected-fake unit tests — NO jsdom), Tailwind v4 soft-depth tokens.

**Spec:** `docs/superpowers/specs/2026-07-23-longitudinal-home-progress-design.md`

## Global Constraints

- Branch: `simulator-coaching`. Never stage unrelated dirty worktree files (`fetch_intro.js`, `src/lib/store.ts`, `src/components/*-section.tsx`, `src/components/scoring-dashboard.tsx`, `src/app/api/multi-chat|score|transcribe/*`, etc.). Stage only each task's named files.
- Existing full suite (263) stays green. The ONLY prior test updated is `src/app/review/page.test.ts` (its contract is superseded by Progress) and `src/features/coaching/prisma-schema.test.ts` (additive field) — never edit a prior test to force unrelated code green.
- **Grounded, not model opinion:** dimensions are deterministic functions of `CoachingMetrics`; a dimension whose source metric is null/absent is **omitted**, never faked. Higher = better, 0–100.
- **Idempotent, evidence-gated recording:** record a session's outcome at most once (guard on `Session.outcomeRecorded`); only when there's real evidence (≥1 dimension or ≥1 weakness); non-fatal to returning the report.
- **Streak is NOT surfaced** this phase.
- Vitest node env; components via `renderToStaticMarkup` + substrings; encoding gotcha `'`→`&#x27;`, `&`→`&amp;` — keep asserted substrings free of those.
- Reuse, don't rebuild: the whole Phase-1 coaching engine, `buildReviewRows`, `useDefenseSessions`, `authenticateRequest`/`isAuthenticationFailure`, soft-depth recipes.
- Run tests with `npm.cmd run test` (Git Bash; do NOT pipe through `tail`). Build with `npm.cmd run build` (exit 0; the Office trace-copy ENOENT warning at the very end is a known non-fatal environment warning). Prisma commands may need the dev server stopped to release the Windows file lock on the query engine.

---

### Task 1: Grounded metric → dimension model (`session-outcome.ts`)

**Files:**
- Create: `src/features/coaching/session-outcome.ts`
- Test: `src/features/coaching/session-outcome.test.ts`

**Interfaces:**
- Consumes: `CoachingMetrics` from `@/features/defense/types`; `SessionOutcome` from `./speaker-profile`.
- Produces: `dimensionsFromMetrics(metrics): Record<string, number>`, `paceScore(wpm): number`, `buildSessionOutcome(input): SessionOutcome`, `hasEvidence(outcome): boolean`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { buildSessionOutcome, dimensionsFromMetrics, hasEvidence, paceScore } from './session-outcome';
import type { CoachingMetrics } from '@/features/defense/types';

const full: CoachingMetrics = { paceWpm: 135, fillerPerMin: 3, verbatimSlides: 1, slideTimes: [{ slideIndex: 1, ms: 1000, atMs: 0 }, { slideIndex: 2, ms: 1000, atMs: 2000 }], questionsHandled: { handled: 3, total: 4 } };

describe('paceScore', () => {
  it('scores the ideal band at 100 and falls off outside it', () => {
    expect(paceScore(135)).toBe(100);
    expect(paceScore(110)).toBe(100);
    expect(paceScore(160)).toBe(100);
    expect(paceScore(60)).toBe(0);
    expect(paceScore(220)).toBe(0);
    expect(paceScore(85)).toBe(50);
  });
});

describe('dimensionsFromMetrics', () => {
  it('derives 0-100 grounded dimensions from capture', () => {
    const d = dimensionsFromMetrics(full);
    expect(d.pace).toBe(100);
    expect(d.fluency).toBe(82); // 100 - 3*6 = 82
    expect(d.ownWords).toBe(50); // 100 - (1/2)*100
    expect(d.questionHandling).toBe(75); // 3/4
  });

  it('omits dimensions whose source metric is unavailable', () => {
    const d = dimensionsFromMetrics({ paceWpm: null, fillerPerMin: null, verbatimSlides: 0, slideTimes: [], questionsHandled: { handled: 0, total: 0 } });
    expect(d).toEqual({});
  });
});

describe('buildSessionOutcome + hasEvidence', () => {
  it('maps metrics + finding titles into a SessionOutcome', () => {
    const o = buildSessionOutcome({ sessionId: 's1', metrics: full, weaknessLabels: ['Rushing closings'], completedAt: '2026-07-23T00:00:00.000Z' });
    expect(o.sessionId).toBe('s1');
    expect(o.weaknesses).toEqual(['Rushing closings']);
    expect(o.dimensions.pace).toBe(100);
    expect(hasEvidence(o)).toBe(true);
  });

  it('hasEvidence is false when there are no dimensions and no weaknesses', () => {
    const o = buildSessionOutcome({ sessionId: 's1', metrics: { paceWpm: null, fillerPerMin: null, verbatimSlides: 0, slideTimes: [], questionsHandled: { handled: 0, total: 0 } }, weaknessLabels: [], completedAt: '2026-07-23T00:00:00.000Z' });
    expect(hasEvidence(o)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- session-outcome`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import type { CoachingMetrics } from '@/features/defense/types';
import type { SessionOutcome } from './speaker-profile';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function paceScore(wpm: number): number {
  if (wpm >= 110 && wpm <= 160) return 100;
  if (wpm < 110) return Math.round(clamp(((wpm - 60) / (110 - 60)) * 100, 0, 100));
  return Math.round(clamp(((220 - wpm) / (220 - 160)) * 100, 0, 100));
}

export function dimensionsFromMetrics(metrics: CoachingMetrics): Record<string, number> {
  const dimensions: Record<string, number> = {};
  if (metrics.paceWpm !== null) dimensions.pace = paceScore(metrics.paceWpm);
  if (metrics.fillerPerMin !== null) dimensions.fluency = Math.round(clamp(100 - metrics.fillerPerMin * 6, 0, 100));
  const spoken = metrics.slideTimes.length;
  if (spoken > 0) dimensions.ownWords = Math.round(clamp(100 - (metrics.verbatimSlides / spoken) * 100, 0, 100));
  if (metrics.questionsHandled.total > 0) dimensions.questionHandling = Math.round((metrics.questionsHandled.handled / metrics.questionsHandled.total) * 100);
  return dimensions;
}

export function buildSessionOutcome(input: { sessionId: string; metrics: CoachingMetrics; weaknessLabels: string[]; completedAt: string }): SessionOutcome {
  return { sessionId: input.sessionId, dimensions: dimensionsFromMetrics(input.metrics), weaknesses: input.weaknessLabels, completedAt: input.completedAt };
}

export function hasEvidence(outcome: SessionOutcome): boolean {
  return Object.keys(outcome.dimensions).length > 0 || outcome.weaknesses.length > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- session-outcome`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/coaching/session-outcome.ts src/features/coaching/session-outcome.test.ts
git commit -m "feat: grounded metric->dimension model + session outcome mapping"
```

---

### Task 2: Progress view model (`progress-model.ts`)

**Files:**
- Create: `src/features/coaching/progress-model.ts`
- Test: `src/features/coaching/progress-model.test.ts`

**Interfaces:**
- Consumes: `SpeakerProfileData` from `./speaker-profile`.
- Produces: `type ProgressSessionInput = { id: string; title: string; createdAt: string; status: string; dimensions?: Record<string, number> }`; `buildProgressModel(profile, sessions): ProgressModel`.
- `ProgressModel = { totalSessions: number; nextFocus: string; series: { dimension: string; points: { label: string; value: number }[]; delta: 'up'|'down'|'steady' }[]; recurringWeaknesses: { label: string; count: number; lastSeen: string }[]; history: { id: string; title: string; date: string; href: string }[] }`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { buildProgressModel } from './progress-model';
import { emptyProfile, type SpeakerProfileData } from './speaker-profile';

const profile: SpeakerProfileData = {
  recurringWeaknesses: [{ label: 'Rushing closings', count: 3, firstSeen: '2026-07-20T00:00:00.000Z', lastSeen: '2026-07-23T00:00:00.000Z' }],
  dimensionBaselines: { fluency: { average: 70, samples: 3 } },
  totalSessions: 3, streak: 0, nextFocus: 'Rushing closings',
};
// sessions arrive newest-first (as /api/sessions returns them)
const sessions = [
  { id: 'c', title: 'Third', createdAt: '2026-07-23T00:00:00.000Z', status: 'completed', dimensions: { fluency: 84, pace: 90 } },
  { id: 'b', title: 'Second', createdAt: '2026-07-22T00:00:00.000Z', status: 'completed', dimensions: { fluency: 70, pace: 92 } },
  { id: 'a', title: 'First', createdAt: '2026-07-20T00:00:00.000Z', status: 'completed', dimensions: { fluency: 60, pace: 91 } },
];

describe('buildProgressModel', () => {
  it('builds chronological per-dimension series with a delta and history newest-first', () => {
    const model = buildProgressModel(profile, sessions);
    expect(model.totalSessions).toBe(3);
    expect(model.nextFocus).toBe('Rushing closings');
    const fluency = model.series.find((s) => s.dimension === 'fluency')!;
    expect(fluency.points.map((p) => p.value)).toEqual([60, 70, 84]); // oldest -> newest
    expect(fluency.delta).toBe('up');
    const pace = model.series.find((s) => s.dimension === 'pace')!;
    expect(pace.delta).toBe('steady'); // 91 -> 90 within deadband
    expect(model.recurringWeaknesses[0]).toMatchObject({ label: 'Rushing closings', count: 3 });
    expect(model.history.map((h) => h.id)).toEqual(['c', 'b', 'a']);
    expect(model.history[0].href).toBe('/reports/c');
  });

  it('returns an empty model when there are no completed sessions', () => {
    const model = buildProgressModel(emptyProfile, []);
    expect(model.series).toEqual([]);
    expect(model.history).toEqual([]);
    expect(model.totalSessions).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- progress-model`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import type { SpeakerProfileData } from './speaker-profile';

export type ProgressSessionInput = { id: string; title: string; createdAt: string; status: string; dimensions?: Record<string, number> };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

const DEADBAND = 5;
function deltaOf(values: number[]): 'up' | 'down' | 'steady' {
  if (values.length < 2) return 'steady';
  const diff = values[values.length - 1] - values[0];
  if (diff > DEADBAND) return 'up';
  if (diff < -DEADBAND) return 'down';
  return 'steady';
}

export function buildProgressModel(profile: SpeakerProfileData, sessions: ProgressSessionInput[]) {
  const withDims = sessions.filter((s) => s.dimensions && Object.keys(s.dimensions).length > 0);
  const oldestFirst = [...withDims].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const dimensionNames = [...new Set(oldestFirst.flatMap((s) => Object.keys(s.dimensions!)))];

  const series = dimensionNames.map((dimension) => {
    const points = oldestFirst
      .filter((s) => typeof s.dimensions![dimension] === 'number')
      .map((s) => ({ label: dateLabel(s.createdAt), value: s.dimensions![dimension] }));
    return { dimension, points, delta: deltaOf(points.map((p) => p.value)) };
  });

  const history = sessions
    .filter((s) => s.status === 'completed')
    .map((s) => ({ id: s.id, title: s.title, date: dateLabel(s.createdAt), href: `/reports/${s.id}` }));

  return {
    totalSessions: profile.totalSessions,
    nextFocus: profile.nextFocus,
    series,
    recurringWeaknesses: profile.recurringWeaknesses.map((w) => ({ label: w.label, count: w.count, lastSeen: w.lastSeen })),
    history,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- progress-model`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/coaching/progress-model.ts src/features/coaching/progress-model.test.ts
git commit -m "feat: progress view model (per-dimension series, deltas, history)"
```

---

### Task 3: Schema — `Session.outcomeRecorded`

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/features/coaching/prisma-schema.test.ts` (additive assertion)

**Interfaces:**
- Produces: a `Session.outcomeRecorded Boolean @default(false)` column for idempotent recording.

- [ ] **Step 1: Add the failing schema-lock assertion**

Append inside the existing `describe('prisma schema longitudinal models', …)` block in `prisma-schema.test.ts`:

```typescript
  it('adds an idempotency flag for one-time outcome recording', () => {
    expect(schema).toContain('outcomeRecorded');
    expect(schema).toMatch(/outcomeRecorded\s+Boolean\s+@default\(false\)/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- prisma-schema`
Expected: FAIL — `outcomeRecorded` absent.

- [ ] **Step 3: Add the column to `prisma/schema.prisma`**

In `model Session`, add after the `audioPath String?` line:

```prisma
  outcomeRecorded Boolean  @default(false)
```

- [ ] **Step 4: Apply the migration + regenerate the client**

Stop the dev server if running (Windows locks the Prisma query engine). Then:

Run: `npx prisma db push` (dev SQLite; applies the additive column non-destructively)
Then: `npx prisma generate`
Expected: both succeed; the column is additive so existing rows default to `false`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm.cmd run test -- prisma-schema`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/features/coaching/prisma-schema.test.ts
git commit -m "feat: Session.outcomeRecorded idempotency flag for longitudinal recording"
```

(Do NOT commit `prisma/migrations` unless the repo already tracks them — check `git status`; if a migration folder is generated and the repo doesn't track migrations, leave it unstaged.)

---

### Task 4: Record the outcome from the report route (idempotent)

**Files:**
- Modify: `src/app/api/defense/report/route.ts`

**Interfaces:**
- Consumes: `buildSessionOutcome`, `hasEvidence` (Task 1); `recordSessionOutcome` (`@/features/coaching/speaker-profile-repository`).
- Produces: the report route records the session outcome once into the caller's `SpeakerProfile`.

- [ ] **Step 1: Add imports**

At the top of `route.ts`:

```typescript
import { recordSessionOutcome } from '@/features/coaching/speaker-profile-repository';
import { buildSessionOutcome, hasEvidence } from '@/features/coaching/session-outcome';
```

- [ ] **Step 2: Add a helper that records once, after a report is assembled**

Add this near the existing `cache` helper inside the `POST` handler (it closes over `session`, `identity`, `db`):

```typescript
    const recordOutcome = async (report: Awaited<ReturnType<typeof assembleCoachingReport>>, weaknessLabels: string[]) => {
      if (session.outcomeRecorded) return;
      try {
        const outcome = buildSessionOutcome({ sessionId: session.id, metrics: report.metrics, weaknessLabels, completedAt: new Date().toISOString() });
        if (!hasEvidence(outcome)) return;
        await recordSessionOutcome(identity.userId, outcome);
        await db.session.update({ where: { id: session.id }, data: { outcomeRecorded: true } });
      } catch (error) {
        console.error('Failed to record session outcome (non-fatal):', error);
      }
    };
```

- [ ] **Step 3: Call it on every 200 path, before returning**

For the two minimal-report returns (no-speech and unvalidatable-findings), add before `return NextResponse.json({ report });`:

```typescript
      await recordOutcome(report, []);
```

For the full-report success path, add before its `return NextResponse.json({ report });`:

```typescript
    await recordOutcome(report, parsed.data.findings.map((finding) => finding.title));
```

(Leave the assembly/caching logic exactly as-is; `recordOutcome` runs after `cache(...)`.)

- [ ] **Step 4: Run the full suite + build**

Run: `npm.cmd run test`
Expected: full suite green (the route's existing tests still pass; `recordSessionOutcome` hits the real db which the route tests mock at `@/lib/db` — verify the report route test's db mock includes `session.update` and `speakerProfile`; if a test now throws because the mock lacks `speakerProfile`/`user`, the `recordOutcome` try/catch swallows it and logs, so the report still returns — confirm the tests still assert the 200 body).

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/defense/report/route.ts"
git commit -m "feat: record grounded session outcome into SpeakerProfile once per session"
```

---

### Task 5: `GET /api/profile`

**Files:**
- Create: `src/app/api/profile/route.ts`
- Test: `src/app/api/profile/route.test.ts`

**Interfaces:**
- Consumes: `authenticateRequest`/`isAuthenticationFailure` (`@/lib/server-auth`); `getOrCreateProfile` (`@/features/coaching/speaker-profile-repository`).
- Produces: `GET /api/profile` → `{ profile: SpeakerProfileData }` for the caller.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';

const authenticateRequest = vi.fn();
const isAuthenticationFailure = vi.fn();
const getOrCreateProfile = vi.fn();
vi.mock('@/lib/server-auth', () => ({ authenticateRequest: (...a: unknown[]) => authenticateRequest(...a), isAuthenticationFailure: (...a: unknown[]) => isAuthenticationFailure(...a) }));
vi.mock('@/features/coaching/speaker-profile-repository', () => ({ getOrCreateProfile: (...a: unknown[]) => getOrCreateProfile(...a) }));

import { GET } from './route';

describe('GET /api/profile', () => {
  beforeEach(() => { authenticateRequest.mockReset(); isAuthenticationFailure.mockReset(); getOrCreateProfile.mockReset(); });

  it('returns the authenticated user’s profile', async () => {
    authenticateRequest.mockResolvedValue({ userId: 'u1' });
    isAuthenticationFailure.mockReturnValue(false);
    getOrCreateProfile.mockResolvedValue({ recurringWeaknesses: [], dimensionBaselines: {}, totalSessions: 2, streak: 0, nextFocus: 'Rushing closings' });
    const res = await GET(new Request('http://localhost/api/profile'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.nextFocus).toBe('Rushing closings');
    expect(getOrCreateProfile).toHaveBeenCalledWith('u1');
  });

  it('propagates an auth failure response', async () => {
    const failure = new Response('no', { status: 401 });
    authenticateRequest.mockResolvedValue(failure);
    isAuthenticationFailure.mockReturnValue(true);
    const res = await GET(new Request('http://localhost/api/profile'));
    expect(res.status).toBe(401);
    expect(getOrCreateProfile).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- api/profile`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

```typescript
import { NextResponse } from 'next/server';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';
import { getOrCreateProfile } from '@/features/coaching/speaker-profile-repository';

export async function GET(request: Request) {
  const identity = await authenticateRequest(request);
  if (isAuthenticationFailure(identity)) return identity;
  try {
    const profile = await getOrCreateProfile(identity.userId);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Failed to load speaker profile:', error);
    return NextResponse.json({ error: 'Failed to load your profile' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- api/profile`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/profile/route.ts" "src/app/api/profile/route.test.ts"
git commit -m "feat: GET /api/profile returns the caller's speaker profile"
```

---

### Task 6: Add `dimensions` to `/api/sessions`

**Files:**
- Modify: `src/app/api/sessions/route.ts`
- Modify: `src/features/defense/studio-session-model.ts` (add optional `dimensions` to the `StudioSession` type)
- Modify: `src/app/api/sessions/route.test.ts` (assert dimensions present for a completed session)

**Interfaces:**
- Consumes: `dimensionsFromMetrics` (Task 1); the cached `coachingReport.metrics` on each session.
- Produces: each session in the response gains `dimensions?: Record<string, number>` when a cached coaching report exists.

- [ ] **Step 1: Add the failing test assertion**

In `src/app/api/sessions/route.test.ts`, extend the completed-session case (the one whose `summary` holds a `coachingReport` — Phase 7 added it) to assert dimensions are derived. Add, after the existing assertions on that session's output:

```typescript
    const completed = body.sessions.find((s: { id: string }) => s.id === 'new');
    expect(completed.dimensions).toBeDefined();
    expect(typeof completed.dimensions.fluency === 'number' || Object.keys(completed.dimensions).length >= 0).toBe(true);
```

(If the existing fixture's `coachingReport.metrics` has all-null pace/fillers and empty slideTimes/questions, `dimensions` will be `{}` — still defined. To make the assertion meaningful, update that fixture's `metrics` to `{ paceWpm: 130, fillerPerMin: 2, verbatimSlides: 0, slideTimes: [{ slideIndex: 1, ms: 1000, atMs: 0 }], questionsHandled: { handled: 1, total: 1 } }` and assert `expect(completed.dimensions.fluency).toBe(88)`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- api/sessions`
Expected: FAIL — `dimensions` undefined.

- [ ] **Step 3: Add `dimensions` to the type**

In `src/features/defense/studio-session-model.ts`, add an optional field to the `StudioSession` type:

```typescript
  dimensions?: Record<string, number>;
```

- [ ] **Step 4: Derive `dimensions` in the route**

In `src/app/api/sessions/route.ts`:

Add the import:

```typescript
import { dimensionsFromMetrics } from '@/features/coaching/session-outcome';
```

The route already parses `summary` as `{ coachingReport }` (Phase 7 fix). Where it computes `report`, also derive dimensions from `report.metrics` and include them in the mapped output:

```typescript
        const report = parsePersisted(session.summary, summarySchema)?.coachingReport;
        const dimensions = report ? dimensionsFromMetrics(report.metrics) : undefined;
```

Then in the returned object literal add:

```typescript
          ...(dimensions && Object.keys(dimensions).length > 0 ? { dimensions } : {}),
```

- [ ] **Step 5: Run test + full suite**

Run: `npm.cmd run test -- api/sessions`
Expected: PASS.

Run: `npm.cmd run test`
Expected: full suite green.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/sessions/route.ts" src/features/defense/studio-session-model.ts "src/app/api/sessions/route.test.ts"
git commit -m "feat: expose per-session grounded dimensions on /api/sessions"
```

---

### Task 7: `useSpeakerProfile` hook

**Files:**
- Create: `src/hooks/use-speaker-profile.ts`
- Test: `src/hooks/use-speaker-profile.test.ts`

**Interfaces:**
- Consumes: `authenticatedFetch`; `SpeakerProfileData` from `@/features/coaching/speaker-profile`.
- Produces: `loadSpeakerProfile(fetcher?)` (pure-ish, testable) and `useSpeakerProfile()` (mirrors `useDefenseSessions`).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { loadSpeakerProfile } from './use-speaker-profile';

describe('loadSpeakerProfile', () => {
  it('returns the profile from the api', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ profile: { recurringWeaknesses: [], dimensionBaselines: {}, totalSessions: 1, streak: 0, nextFocus: 'Pace' } }), { status: 200 }));
    const profile = await loadSpeakerProfile(fetcher as unknown as typeof fetch);
    expect(profile.nextFocus).toBe('Pace');
  });

  it('throws on a failed response', async () => {
    const fetcher = vi.fn(async () => new Response('no', { status: 500 }));
    await expect(loadSpeakerProfile(fetcher as unknown as typeof fetch)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- use-speaker-profile`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook**

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { emptyProfile, type SpeakerProfileData } from '@/features/coaching/speaker-profile';

export async function loadSpeakerProfile(fetcher: typeof authenticatedFetch = authenticatedFetch): Promise<SpeakerProfileData> {
  const response = await fetcher('/api/profile');
  if (!response.ok) throw new Error('Unable to load your profile.');
  const body = await response.json() as { profile?: SpeakerProfileData };
  return body.profile ?? emptyProfile;
}

export function useSpeakerProfile() {
  const [profile, setProfile] = useState<SpeakerProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(undefined);
    loadSpeakerProfile()
      .then((loaded) => { if (active) setProfile(loaded); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((v) => v + 1), []);
  return { profile, loading, error, retry };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- use-speaker-profile`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-speaker-profile.ts src/hooks/use-speaker-profile.test.ts
git commit -m "feat: useSpeakerProfile hook"
```

---

### Task 8: Home next-focus card

**Files:**
- Create: `src/features/defense/components/next-focus-card.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/features/defense/components/next-focus-card.test.tsx`

**Interfaces:**
- Consumes: `SpeakerProfileData` (Task 1 module), `useSpeakerProfile` (Task 7).
- Produces: `NextFocusCard({ profile })` rendering the "Work on this next" card (with a first-run fallback).

- [ ] **Step 1: Write the failing test**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NextFocusCard } from './next-focus-card';
import { emptyProfile } from '@/features/coaching/speaker-profile';

describe('NextFocusCard', () => {
  it('shows the next focus and a grounded subline when a profile exists', () => {
    const html = renderToStaticMarkup(<NextFocusCard profile={{ recurringWeaknesses: [{ label: 'Rushing closings', count: 3, firstSeen: 'x', lastSeen: 'y' }], dimensionBaselines: {}, totalSessions: 3, streak: 0, nextFocus: 'Rushing closings' }} />);
    expect(html).toContain('Work on this next');
    expect(html).toContain('Rushing closings');
    expect(html).toContain('3');
  });

  it('shows a first-run invitation when there is no profile yet', () => {
    const html = renderToStaticMarkup(<NextFocusCard profile={emptyProfile} />);
    expect(html).toContain('Run your first rehearsal');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- next-focus-card`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `next-focus-card.tsx`**

```tsx
import type { SpeakerProfileData } from '@/features/coaching/speaker-profile';

export function NextFocusCard({ profile }: { profile: SpeakerProfileData }) {
  const top = profile.recurringWeaknesses[0];
  const hasFocus = profile.nextFocus.trim().length > 0;
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <p className="text-xs font-medium text-muted-foreground">Work on this next</p>
      {hasFocus ? (
        <>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-medium tracking-tight">{profile.nextFocus}</h2>
          {top ? <p className="mt-2 text-sm text-muted-foreground">Seen in {top.count} of your {profile.totalSessions} sessions. Target it in your next rehearsal.</p> : null}
        </>
      ) : (
        <h2 className="mt-1 font-display text-2xl sm:text-3xl font-medium tracking-tight">Run your first rehearsal to start building your coach profile</h2>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Wire it into Home**

In `src/app/dashboard/page.tsx`:

Add imports:

```tsx
import { NextFocusCard } from '@/features/defense/components/next-focus-card';
import { useSpeakerProfile } from '@/hooks/use-speaker-profile';
```

Inside `DashboardPage`, add the hook near `useDefenseSessions`:

```tsx
  const { profile } = useSpeakerProfile();
```

In the success branch, render the card above `StudioDesk`. Replace the `<StudioDesk model={buildTodayModel(sessions)} />` line with:

```tsx
        <div className="flex flex-col gap-6">
          <NextFocusCard profile={profile} />
          <StudioDesk model={buildTodayModel(sessions)} />
        </div>
```

- [ ] **Step 5: Run test + full suite**

Run: `npm.cmd run test -- next-focus-card`
Expected: PASS.

Run: `npm.cmd run test`
Expected: full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/features/defense/components/next-focus-card.tsx "src/app/dashboard/page.tsx" src/features/defense/components/next-focus-card.test.tsx
git commit -m "feat: Home surfaces the one thing to work on next"
```

---

### Task 9: Sparkline + Progress workspace components

**Files:**
- Create: `src/features/defense/components/dimension-sparkline.tsx`
- Create: `src/features/defense/components/progress-workspace.tsx`
- Test: `src/features/defense/components/progress-workspace.test.tsx`

**Interfaces:**
- Consumes: the `ProgressModel` shape (Task 2), `formatTimestamp` not needed.
- Produces: `DimensionSparkline({ dimension, points, delta })`, `ProgressWorkspace({ model })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DimensionSparkline } from './dimension-sparkline';
import { ProgressWorkspace } from './progress-workspace';

const model = {
  totalSessions: 3,
  nextFocus: 'Rushing closings',
  series: [{ dimension: 'fluency', points: [{ label: 'Jul 20', value: 60 }, { label: 'Jul 23', value: 84 }], delta: 'up' as const }],
  recurringWeaknesses: [{ label: 'Rushing closings', count: 3, lastSeen: '2026-07-23T00:00:00.000Z' }],
  history: [{ id: 'c', title: 'Third', date: 'Jul 23', href: '/reports/c' }],
};

describe('DimensionSparkline', () => {
  it('renders an accessible svg trend with a delta and current value', () => {
    const html = renderToStaticMarkup(<DimensionSparkline dimension="fluency" points={model.series[0].points} delta="up" />);
    expect(html).toContain('<svg');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label');
    expect(html).toContain('84'); // current value
  });

  it('renders a single-point series as New rather than a line', () => {
    const html = renderToStaticMarkup(<DimensionSparkline dimension="pace" points={[{ label: 'Jul 23', value: 90 }]} delta="steady" />);
    expect(html).toContain('New');
  });
});

describe('ProgressWorkspace', () => {
  it('renders header, growth, recurring weaknesses, and history', () => {
    const html = renderToStaticMarkup(<ProgressWorkspace model={model} />);
    expect(html).toContain('Progress');
    expect(html).toContain('Rushing closings');
    expect(html).toContain('fluency');
    expect(html).toContain('href="/reports/c"');
    expect(html).toContain('Third');
  });

  it('renders an empty state when there is no history', () => {
    const html = renderToStaticMarkup(<ProgressWorkspace model={{ totalSessions: 0, nextFocus: '', series: [], recurringWeaknesses: [], history: [] }} />);
    expect(html).toContain('No rehearsals');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- progress-workspace`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `dimension-sparkline.tsx`**

```tsx
const DELTA_LABEL: Record<'up' | 'down' | 'steady', string> = { up: 'improving', down: 'slipping', steady: 'steady' };

export function DimensionSparkline({ dimension, points, delta }: { dimension: string; points: { label: string; value: number }[]; delta: 'up' | 'down' | 'steady' }) {
  const current = points.length ? points[points.length - 1].value : 0;
  const single = points.length < 2;
  const W = 120, H = 36;
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
    const y = H - (Math.max(0, Math.min(100, p.value)) / 100) * H;
    return { x, y };
  });
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const label = single
    ? `${dimension}: ${current} out of 100, new`
    : `${dimension}: ${points[0].value} to ${current} over ${points.length} sessions, ${DELTA_LABEL[delta]}`;
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 shadow-e1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium capitalize text-muted-foreground">{dimension}</span>
        <span className="font-mono text-sm text-foreground">{current}</span>
      </div>
      <svg role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} className="mt-2 h-9 w-full overflow-visible">
        {single ? (
          <circle cx={W / 2} cy={H - (current / 100) * H} r={3} className="fill-primary" />
        ) : (
          <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <span className="text-xs text-muted-foreground">{single ? 'New' : DELTA_LABEL[delta]}</span>
    </div>
  );
}
```

- [ ] **Step 4: Write `progress-workspace.tsx`**

```tsx
import Link from 'next/link';
import { DimensionSparkline } from './dimension-sparkline';

type ProgressModel = {
  totalSessions: number; nextFocus: string;
  series: { dimension: string; points: { label: string; value: number }[]; delta: 'up' | 'down' | 'steady' }[];
  recurringWeaknesses: { label: string; count: number; lastSeen: string }[];
  history: { id: string; title: string; date: string; href: string }[];
};

export function ProgressWorkspace({ model }: { model: ProgressModel }) {
  if (model.history.length === 0 && model.totalSessions === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 p-10">
        <p className="text-xs font-medium text-muted-foreground">Progress</p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight">No rehearsals to track yet</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Finish a rehearsal and your growth will start building here.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
        <p className="text-xs font-medium text-muted-foreground">Progress</p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight">{model.totalSessions} sessions in</h1>
        {model.nextFocus ? <p className="mt-3 text-sm text-muted-foreground">Next focus: <span className="text-foreground">{model.nextFocus}</span></p> : null}
      </section>

      {model.series.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
          <h2 className="text-lg font-semibold text-foreground">Growth</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {model.series.map((s) => <DimensionSparkline key={s.dimension} dimension={s.dimension} points={s.points} delta={s.delta} />)}
          </div>
        </section>
      ) : null}

      {model.recurringWeaknesses.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
          <h2 className="text-lg font-semibold text-foreground">Recurring weaknesses</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {model.recurringWeaknesses.map((w) => (
              <li key={w.label} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 hover:bg-surface">
                <span className="text-sm text-foreground">{w.label}</span>
                <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">seen {w.count}x</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
        <h2 className="text-lg font-semibold text-foreground">Session history</h2>
        <ol className="mt-4 flex flex-col divide-y divide-border">
          {model.history.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-4 px-1 py-3">
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{h.title}</span>
                <span className="text-xs text-muted-foreground">{h.date}</span>
              </span>
              <Link href={h.href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">Open report</Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm.cmd run test -- progress-workspace`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/defense/components/dimension-sparkline.tsx src/features/defense/components/progress-workspace.tsx src/features/defense/components/progress-workspace.test.tsx
git commit -m "feat: progress workspace + accessible dimension sparklines"
```

---

### Task 10: Progress page cutover + retire `ReviewWorkspace`

**Files:**
- Modify: `src/app/review/page.tsx`
- Modify: `src/app/review/page.test.ts`
- Delete: `src/features/defense/components/review-workspace.tsx`
- Delete: `src/features/defense/components/review-workspace.test.tsx` (if it exists)

**Interfaces:**
- Consumes: `ProgressWorkspace` (Task 9), `buildProgressModel` (Task 2), `useSpeakerProfile` (Task 7), `useDefenseSessions` (now carrying `dimensions`).
- Produces: `/review` renders the longitudinal Progress view.

- [ ] **Step 1: Check for a review-workspace test**

Run: `ls src/features/defense/components/review-workspace.test.tsx 2>/dev/null` and `grep -rn "ReviewWorkspace" src`
Note which files import `ReviewWorkspace` (should be only `review/page.tsx` and possibly its own test).

- [ ] **Step 2: Update the review page**

Rewrite `src/app/review/page.tsx`, keeping the auth/resync/error/status scaffolding and swapping the workspace:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/features/defense/components/app-shell';
import { ProgressWorkspace } from '@/features/defense/components/progress-workspace';
import { buildProgressModel } from '@/features/coaching/progress-model';
import { useDefenseSessions } from '@/features/defense/use-defense-sessions';
import { useSpeakerProfile } from '@/hooks/use-speaker-profile';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function shouldResyncAfterAuth(authLoading: boolean, user: unknown, resyncedAfterAuth: boolean): boolean {
  return !authLoading && Boolean(user) && !resyncedAfterAuth;
}

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { sessions, loading: sessionsLoading, error, retry } = useDefenseSessions();
  const { profile } = useSpeakerProfile();
  const [resyncedAfterAuth, setResyncedAfterAuth] = useState(false);

  useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, router, user]);
  useEffect(() => {
    if (shouldResyncAfterAuth(authLoading, user, resyncedAfterAuth)) { setResyncedAfterAuth(true); retry(); }
  }, [authLoading, user, resyncedAfterAuth, retry]);

  if (authLoading || !user) return <div className="min-h-dvh bg-background" aria-busy="true" />;

  return (
    <AppShell active="progress">
      {error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm text-destructive">{error}</p>
          <button type="button" onClick={retry} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-4')}>Retry</button>
        </div>
      ) : sessionsLoading ? (
        <div role="status" className="rounded-xl border border-border bg-card p-6">
          <span className="sr-only">Loading your progress...</span>
          <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ) : (
        <ProgressWorkspace model={buildProgressModel(profile, sessions)} />
      )}
    </AppShell>
  );
}
```

Note: `buildProgressModel` expects `ProgressSessionInput[]`; `StudioSession[]` now carries `id/title/createdAt/status/dimensions`, which structurally satisfies it. If TS complains about `createdAt` type (Date vs string), coerce in the call: `buildProgressModel(profile, sessions.map((s) => ({ ...s, createdAt: String(s.createdAt) })))` — check the `StudioSession.createdAt` type first and only add the map if needed.

- [ ] **Step 3: Update the review page test**

Replace the first `describe('/review route', …)` block's assertions in `src/app/review/page.test.ts` (keep the `shouldResyncAfterAuth` describe untouched):

```typescript
describe('/progress route', () => {
  it('renders the progress workspace wired to sessions + profile', () => {
    const source = readRoute('src/app/review/page.tsx');
    expect(source).toContain('ProgressWorkspace');
    expect(source).toContain('useDefenseSessions');
    expect(source).toContain('useSpeakerProfile');
    expect(source).toContain('buildProgressModel');
    expect(source).toContain('active="progress"');
  });

  it('renders a visible retry action on a failed session request', () => {
    const source = readRoute('src/app/review/page.tsx');
    expect(source).toContain('role="alert"');
    expect(source).toContain('Retry');
    expect(source).toContain('retry()');
  });
});
```

- [ ] **Step 4: Delete the retired component (+ test if present)**

```bash
git rm src/features/defense/components/review-workspace.tsx
```

If `review-workspace.test.tsx` exists (from Step 1), also `git rm` it. Then confirm no stale importers:

Run: `grep -rn "review-workspace\|ReviewWorkspace" src`
Expected: no matches.

- [ ] **Step 5: Run the full suite + build**

Run: `npm.cmd run test`
Expected: full suite green.

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add "src/app/review/page.tsx" "src/app/review/page.test.ts"
git commit -m "feat: Progress page renders longitudinal growth; retire ReviewWorkspace"
```

(The `git rm` deletions are already staged; they're included in this commit.)

---

### Task 11: In-browser verification + ledger

**Files:**
- Modify: `.superpowers/sdd/progress.md` (git-ignored scratch — update on disk; do not `git add`)

No production code. Proves the longitudinal loop end-to-end.

- [ ] **Step 1: Complete two sessions with speech**

Start the dev server. Guest Mode → run a rehearsal, speak across ≥2 slides, End. Open its report (records the outcome). Repeat for a second rehearsal (vary your delivery so a dimension changes).

- [ ] **Step 2: Confirm Home**

Open `/dashboard`. Confirm the "Work on this next" card shows a real `nextFocus` (a recurring weakness label), with the "seen N of M" subline.

- [ ] **Step 3: Confirm Progress**

Open `/review` (Progress). Confirm: the header sessions count, a **growth sparkline per dimension** (with an improving/steady/slipping delta), the **recurring weaknesses** list with counts, and the **session history** rows linking to each report.

- [ ] **Step 4: Confirm the evidence gate + idempotency**

Confirm a no-speech session does NOT increment the sessions count (open its report — no dimensions/weaknesses recorded). Reload a recorded session's report and confirm the sessions count does not double.

- [ ] **Step 5: Update the progress ledger**

Append a Phase 8 section to `.superpowers/sdd/progress.md`: tasks + commit SHAs, full-suite/build status, the in-browser results (Home next-focus, Progress growth/weaknesses/history, evidence gate + idempotency), and that this closes Slice 1.

- [ ] **Step 6: Final verification**

Run: `npm.cmd run test`
Expected: full suite green.

Run: `npm.cmd run build`
Expected: exit 0.

---

## Self-Review

**Spec coverage:**
- §4 dimension model → Task 1. §7 progress model → Task 2. §5 schema flag → Task 3; route recording → Task 4. §6 `/api/profile` → Task 5; `/api/sessions` dimensions → Task 6. `useSpeakerProfile` → Task 7. §8 Home card → Task 8. §10 sparkline + §9 workspace → Task 9; page cutover + retirement → Task 10. §11 testing → per-task tests + Task 11 live.
- Idempotency + evidence gate (§3) → Task 4 (`outcomeRecorded` guard + `hasEvidence`). Grounded/omit-null (§3) → Task 1. Streak not surfaced → Tasks 8/9 never read `streak`.

**Placeholder scan:** none — every code step is complete; the two "check the type/mock before committing" notes (Task 4 db-mock, Task 10 `createdAt` coercion) are concrete conditional guards with the exact fallback shown.

**Type consistency:** `dimensionsFromMetrics`/`buildSessionOutcome`/`hasEvidence` (Task 1) consumed unchanged in Tasks 4 and 6. `ProgressModel` shape defined in Task 2 and consumed identically by Task 9's components and Task 10's page. `SessionOutcome` is the Phase-1 shape. `useSpeakerProfile` return (`{ profile }`) consumed in Tasks 8 and 10. `StudioSession.dimensions` (Task 6) feeds `ProgressSessionInput` (Task 2) in Task 10.
