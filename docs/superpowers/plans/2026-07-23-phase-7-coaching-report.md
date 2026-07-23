# Phase 7 — Comprehensive Coaching Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the end-of-session report into an evidence-grounded coach: a `mm:ss` timeline, grounded delivery metrics, per-panelist verdicts, drills, and audio replay where tapping a moment jumps the tape.

**Architecture:** Enrich the existing evidence-led defense report. Pure, tested modules compute grounded metrics, the timeline, and persona verdicts from captured transcript+events; the existing single `/api/defense/report` completion is extended to also emit per-persona verdict lines (validated against real events, drop-if-unsupported); a pure assembler composes the `CoachingReport`; the report route degrades to a graceful minimal report instead of 502; the UI is rebuilt into focused presentational units with tap-to-seek wired to `SessionAudioPlayer`.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Zod, Vitest (`environment: 'node'`, `renderToStaticMarkup` + injected-fake unit tests — NO jsdom), Tailwind v4 soft-depth tokens, Prisma/SQLite.

**Spec:** `docs/superpowers/specs/2026-07-23-coaching-report-design.md`

## Global Constraints

- Branch: `simulator-coaching`. Never stage unrelated dirty worktree files (`fetch_intro.js`, `src/lib/store.ts`, `src/components/*-section.tsx`, `src/components/scoring-dashboard.tsx`, `src/app/api/multi-chat|score|transcribe/*`, etc.). Stage only each task's named files.
- Existing full suite (240) stays green. The ONLY prior-phase test removed is `src/features/defense/components/defense-report.test.tsx`, and only because its component `DefenseReportView` is retired (Task 10) — never edit a prior test to force new code green.
- **Grounded, not LLM-judged:** metrics are deterministic from capture. No `/api/score`, no new 0–100 model scores.
- **Anti-fabrication:** persona verdict lines are kept only when that `personaId` has ≥1 captured `ExaminerEvent`; unsupported lines are dropped, never shown. Findings keep their existing quote-validation.
- **Graceful minimal report:** no presenter speech OR unvalidatable findings → return a `minimal: true` report (200) with grounded timeline/metrics/persona evidence, NOT a 502. Only a true throw is 500.
- One generation endpoint: `/api/defense/report` (extended). No new endpoint. Keep its auth+ownership guard and `practiceMode === 'defense'` gate.
- Vitest node env; unit logic uses fixtures; components use `renderToStaticMarkup` + source-substring. `renderToStaticMarkup` encodes `'`→`&#x27;`, `&`→`&amp;` — keep asserted substrings free of those characters.
- Reuse, don't reimplement: `computeMetrics` (`src/features/simulator/metrics.ts`), `analyseReading` + `spokenBySlide` (`src/features/defense/`), `buildDefenseReport` fallback, `SessionAudioPlayer` empty state, soft-depth recipes.
- Run tests with `npm.cmd run test` (Git Bash; do NOT pipe through `tail` — it masks the exit code). Build with `npm.cmd run build` (exit 0; the Office trace-copy ENOENT warning at the very end is a known non-fatal environment warning).

---

### Task 1: Coaching report types + schemas

**Files:**
- Modify: `src/features/defense/types.ts` (append; do not alter existing exports)

**Interfaces:**
- Consumes: existing `DefenseFinding`, `defenseFindingSchema`.
- Produces: `CoachingMetrics`, `TimelineMoment`, `PersonaVerdict`, `CoachingReport` types + `coachingReportSchema`.

- [ ] **Step 1: Write the failing test**

Create `src/features/defense/coaching-types.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { coachingReportSchema } from './types';

const valid = {
  highestLeverage: { title: 'Explain the result', risk: 'high', basis: 'response_explanation', presenterQuote: 'the model converged', evidence: 'no reason given', slideIndex: 1, drill: 'Explain why.' },
  drills: ['Explain why.'],
  metrics: { paceWpm: 142, fillerPerMin: 6, verbatimSlides: 2, slideTimes: [{ slideIndex: 1, ms: 60000, atMs: 0 }], questionsHandled: { handled: 3, total: 5 } },
  timeline: [{ atMs: 0, kind: 'presenter', slideIndex: 1, text: 'Hello' }, { atMs: 134000, kind: 'question', slideIndex: 4, text: 'Why?', personaTitle: 'Professor' }],
  personaVerdicts: [{ personaId: 'professor', personaTitle: 'Professor', challenges: [{ atMs: 134000, slideIndex: 4, text: 'Why?', responded: false }], verdictLine: 'You leaned on the slide text.' }],
  strengths: ['Clear scope'],
  minimal: false,
};

describe('coachingReportSchema', () => {
  it('accepts a fully-populated coaching report', () => {
    expect(coachingReportSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a minimal report with null metrics and null verdict lines', () => {
    const minimal = { ...valid, minimal: true, metrics: { ...valid.metrics, paceWpm: null, fillerPerMin: null }, personaVerdicts: [{ ...valid.personaVerdicts[0], verdictLine: null }] };
    expect(coachingReportSchema.safeParse(minimal).success).toBe(true);
  });

  it('rejects a report missing the metrics block', () => {
    const { metrics, ...broken } = valid;
    expect(coachingReportSchema.safeParse(broken).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- coaching-types`
Expected: FAIL — `coachingReportSchema` not exported.

- [ ] **Step 3: Append the types + schemas to `src/features/defense/types.ts`**

Add at the end of the file (after the existing `defenseReportSchema` line):

```typescript
export interface CoachingMetrics {
  paceWpm: number | null;
  fillerPerMin: number | null;
  verbatimSlides: number;
  slideTimes: { slideIndex: number; ms: number; atMs: number }[];
  questionsHandled: { handled: number; total: number };
}

export type TimelineMomentKind = 'presenter' | 'question' | 'interrupt' | 'follow_up';

export interface TimelineMoment {
  atMs: number;
  kind: TimelineMomentKind;
  slideIndex: number;
  text: string;
  personaTitle?: string;
}

export interface PersonaChallenge {
  atMs: number;
  slideIndex: number;
  text: string;
  responded: boolean;
}

export interface PersonaVerdict {
  personaId: string;
  personaTitle: string;
  challenges: PersonaChallenge[];
  verdictLine: string | null;
}

export interface CoachingReport {
  highestLeverage: DefenseFinding;
  drills: string[];
  metrics: CoachingMetrics;
  timeline: TimelineMoment[];
  personaVerdicts: PersonaVerdict[];
  strengths: string[];
  minimal: boolean;
}

const coachingMetricsSchema = z.object({
  paceWpm: z.number().finite().nullable(),
  fillerPerMin: z.number().finite().nonnegative().nullable(),
  verbatimSlides: z.number().int().nonnegative(),
  slideTimes: z.array(z.object({ slideIndex: z.number().int().positive(), ms: z.number().finite().nonnegative(), atMs: z.number().finite().nonnegative() }).strict()),
  questionsHandled: z.object({ handled: z.number().int().nonnegative(), total: z.number().int().nonnegative() }).strict(),
}).strict();

const timelineMomentSchema = z.object({
  atMs: z.number().finite().nonnegative(),
  kind: z.enum(['presenter', 'question', 'interrupt', 'follow_up']),
  slideIndex: z.number().int().positive(),
  text: z.string(),
  personaTitle: z.string().optional(),
}).strict();

const personaVerdictSchema = z.object({
  personaId: z.string(),
  personaTitle: z.string(),
  challenges: z.array(z.object({ atMs: z.number().finite().nonnegative(), slideIndex: z.number().int().positive(), text: z.string(), responded: z.boolean() }).strict()),
  verdictLine: z.string().nullable(),
}).strict();

export const coachingReportSchema = z.object({
  highestLeverage: defenseFindingSchema,
  drills: z.array(z.string()),
  metrics: coachingMetricsSchema,
  timeline: z.array(timelineMomentSchema),
  personaVerdicts: z.array(personaVerdictSchema),
  strengths: z.array(z.string()),
  minimal: z.boolean(),
}).strict();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- coaching-types`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/defense/types.ts src/features/defense/coaching-types.test.ts
git commit -m "feat: CoachingReport types + zod schema"
```

---

### Task 2: Grounded metrics (`coaching-metrics.ts`)

**Files:**
- Create: `src/features/defense/coaching-metrics.ts`
- Test: `src/features/defense/coaching-metrics.test.ts`

**Interfaces:**
- Consumes: `computeMetrics` (`@/features/simulator/metrics`), `analyseReading` + `spokenBySlide` (`@/features/defense/*`), types from Task 1.
- Produces: `computeCoachingMetrics({ deck, transcriptSegments, examinerEvents }): CoachingMetrics`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { computeCoachingMetrics } from './coaching-metrics';
import type { DeckContext, ExaminerEvent, TranscriptSegment } from './types';

const deck: DeckContext = { sourceName: 'deck', slides: [{ index: 1, text: 'Alpha claim', imageUrl: '' }, { index: 2, text: 'Beta claim', imageUrl: '' }] };

const transcript: TranscriptSegment[] = [
  { role: 'presenter', slideIndex: 1, text: 'we explain the alpha result in our own words here', startedAtMs: 0, endedAtMs: 30000 },
  { role: 'presenter', slideIndex: 2, text: 'and then we respond after the question', startedAtMs: 60000, endedAtMs: 90000 },
];
const events: ExaminerEvent[] = [
  { kind: 'question', text: 'Why alpha?', slideIndex: 2, evidence: 'x', occurredAtMs: 45000, persona: { id: 'professor', title: 'Professor' } }, // handled (later seg on slide 2 at 60000)
  { kind: 'question', text: 'Unanswered?', slideIndex: 1, evidence: 'y', occurredAtMs: 50000, persona: { id: 'examiner', title: 'Examiner' } }, // NOT handled (no slide-1 presenter seg after 50000)
];

describe('computeCoachingMetrics', () => {
  it('computes pace, fillers, verbatim, slide times, and questions handled from capture', () => {
    const m = computeCoachingMetrics({ deck, transcriptSegments: transcript, examinerEvents: events });
    expect(m.paceWpm).toBeGreaterThan(0);
    expect(m.fillerPerMin).not.toBeNull();
    expect(m.questionsHandled).toEqual({ handled: 1, total: 2 });
    expect(m.slideTimes.find((s) => s.slideIndex === 1)).toEqual({ slideIndex: 1, ms: 30000, atMs: 0 });
    expect(m.slideTimes.find((s) => s.slideIndex === 2)).toEqual({ slideIndex: 2, ms: 30000, atMs: 60000 });
    expect(m.verbatimSlides).toBeGreaterThanOrEqual(0);
  });

  it('returns null pace and fillers when there is no presenter speech', () => {
    const m = computeCoachingMetrics({ deck, transcriptSegments: [], examinerEvents: [] });
    expect(m.paceWpm).toBeNull();
    expect(m.fillerPerMin).toBeNull();
    expect(m.slideTimes).toEqual([]);
    expect(m.questionsHandled).toEqual({ handled: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- coaching-metrics`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { computeMetrics } from '@/features/simulator/metrics';
import { analyseReading } from './reading-analysis';
import { spokenBySlide } from './transcript';
import type { CoachingMetrics, DeckContext, ExaminerEvent, TranscriptSegment } from './types';

export function computeCoachingMetrics({ deck, transcriptSegments, examinerEvents }: { deck: DeckContext; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[] }): CoachingMetrics {
  const speech = computeMetrics(transcriptSegments);
  const hasSpeech = speech.spokenMs > 0;
  const paceWpm = hasSpeech ? speech.wpm : null;
  const fillerPerMin = hasSpeech ? speech.fillerCount / (speech.spokenMs / 60_000) : null;

  const reading = analyseReading(deck.slides, spokenBySlide(transcriptSegments));
  const verbatimSlides = reading.filter((item) => item.hasSpeech && (item.overlap > 0 || item.copiedPhrases.length > 0)).length;

  const presenter = transcriptSegments.filter((segment) => segment.role === 'presenter');
  const bySlide = new Map<number, { ms: number; atMs: number }>();
  for (const segment of presenter) {
    const existing = bySlide.get(segment.slideIndex);
    const ms = Math.max(0, segment.endedAtMs - segment.startedAtMs);
    if (existing) { existing.ms += ms; existing.atMs = Math.min(existing.atMs, segment.startedAtMs); }
    else bySlide.set(segment.slideIndex, { ms, atMs: segment.startedAtMs });
  }
  const slideTimes = [...bySlide.entries()].map(([slideIndex, v]) => ({ slideIndex, ms: v.ms, atMs: v.atMs })).sort((a, b) => a.atMs - b.atMs);

  const handled = examinerEvents.filter((event) => presenter.some((segment) => segment.slideIndex === event.slideIndex && segment.startedAtMs > event.occurredAtMs)).length;
  const questionsHandled = { handled, total: examinerEvents.length };

  return { paceWpm, fillerPerMin, verbatimSlides, slideTimes, questionsHandled };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- coaching-metrics`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/defense/coaching-metrics.ts src/features/defense/coaching-metrics.test.ts
git commit -m "feat: grounded coaching metrics from capture"
```

---

### Task 3: Evidence timeline + `formatTimestamp` (`coaching-timeline.ts`)

**Files:**
- Create: `src/features/defense/coaching-timeline.ts`
- Test: `src/features/defense/coaching-timeline.test.ts`

**Interfaces:**
- Consumes: `TranscriptSegment`, `ExaminerEvent`, `TimelineMoment` (Task 1).
- Produces: `buildTimeline({ transcriptSegments, examinerEvents }): TimelineMoment[]`; `formatTimestamp(ms: number): string`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { buildTimeline, formatTimestamp } from './coaching-timeline';
import type { ExaminerEvent, TranscriptSegment } from './types';

describe('formatTimestamp', () => {
  it('formats milliseconds as m:ss', () => {
    expect(formatTimestamp(0)).toBe('0:00');
    expect(formatTimestamp(5000)).toBe('0:05');
    expect(formatTimestamp(134000)).toBe('2:14');
    expect(formatTimestamp(605000)).toBe('10:05');
  });
});

describe('buildTimeline', () => {
  it('merges presenter speech and panel events in chronological order with persona tags', () => {
    const segments: TranscriptSegment[] = [
      { role: 'presenter', slideIndex: 1, text: 'Opening line', startedAtMs: 0, endedAtMs: 5000 },
      { role: 'presenter', slideIndex: 4, text: 'Later line', startedAtMs: 140000, endedAtMs: 150000 },
    ];
    const events: ExaminerEvent[] = [
      { kind: 'question', text: 'Why?', slideIndex: 4, evidence: 'x', occurredAtMs: 134000, persona: { id: 'professor', title: 'Professor' } },
    ];
    const timeline = buildTimeline({ transcriptSegments: segments, examinerEvents: events });
    expect(timeline.map((m) => m.atMs)).toEqual([0, 134000, 140000]);
    expect(timeline[0]).toMatchObject({ kind: 'presenter', slideIndex: 1, text: 'Opening line' });
    expect(timeline[1]).toMatchObject({ kind: 'question', slideIndex: 4, text: 'Why?', personaTitle: 'Professor' });
    expect(timeline[1].personaTitle).toBe('Professor');
  });

  it('omits empty presenter segments and keeps persona-less events (no tag)', () => {
    const segments: TranscriptSegment[] = [{ role: 'presenter', slideIndex: 1, text: '   ', startedAtMs: 0, endedAtMs: 1000 }];
    const events: ExaminerEvent[] = [{ kind: 'interrupt', text: 'Hold on', slideIndex: 1, evidence: 'x', occurredAtMs: 2000 }];
    const timeline = buildTimeline({ transcriptSegments: segments, examinerEvents: events });
    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({ kind: 'interrupt', text: 'Hold on' });
    expect(timeline[0].personaTitle).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- coaching-timeline`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import type { ExaminerEvent, TimelineMoment, TranscriptSegment } from './types';

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function buildTimeline({ transcriptSegments, examinerEvents }: { transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[] }): TimelineMoment[] {
  const fromSpeech: TimelineMoment[] = transcriptSegments
    .filter((segment) => segment.role === 'presenter' && segment.text.trim())
    .map((segment) => ({ atMs: segment.startedAtMs, kind: 'presenter' as const, slideIndex: segment.slideIndex, text: segment.text.trim() }));
  const fromEvents: TimelineMoment[] = examinerEvents.map((event) => ({
    atMs: event.occurredAtMs,
    kind: event.kind,
    slideIndex: event.slideIndex,
    text: event.text,
    ...(event.persona ? { personaTitle: event.persona.title } : {}),
  }));
  return [...fromSpeech, ...fromEvents].sort((a, b) => a.atMs - b.atMs);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- coaching-timeline`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/defense/coaching-timeline.ts src/features/defense/coaching-timeline.test.ts
git commit -m "feat: evidence timeline + mm:ss formatter"
```

---

### Task 4: Persona verdict assembly (`persona-verdicts.ts`)

**Files:**
- Create: `src/features/defense/persona-verdicts.ts`
- Test: `src/features/defense/persona-verdicts.test.ts`

**Interfaces:**
- Consumes: `ExaminerEvent`, `TranscriptSegment`, `PersonaVerdict` (Task 1).
- Produces: `buildPersonaVerdicts({ examinerEvents, transcriptSegments, verdictLines }): PersonaVerdict[]`. `verdictLines: Record<string, string>` keyed by `personaId`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { buildPersonaVerdicts } from './persona-verdicts';
import type { ExaminerEvent, TranscriptSegment } from './types';

const segments: TranscriptSegment[] = [
  { role: 'presenter', slideIndex: 4, text: 'my response', startedAtMs: 140000, endedAtMs: 150000 },
];
const events: ExaminerEvent[] = [
  { kind: 'question', text: 'Justify?', slideIndex: 4, evidence: 'x', occurredAtMs: 134000, persona: { id: 'professor', title: 'Professor' } }, // responded (seg after)
  { kind: 'question', text: 'Evidence?', slideIndex: 7, evidence: 'y', occurredAtMs: 200000, persona: { id: 'professor', title: 'Professor' } }, // not responded
  { kind: 'interrupt', text: 'Hold', slideIndex: 1, evidence: 'z', occurredAtMs: 5000 }, // no persona → omitted
];

describe('buildPersonaVerdicts', () => {
  it('groups challenges by persona, marks responded, and attaches validated lines', () => {
    const verdicts = buildPersonaVerdicts({ examinerEvents: events, transcriptSegments: segments, verdictLines: { professor: 'You leaned on the slide.' } });
    expect(verdicts).toHaveLength(1);
    const prof = verdicts[0];
    expect(prof).toMatchObject({ personaId: 'professor', personaTitle: 'Professor', verdictLine: 'You leaned on the slide.' });
    expect(prof.challenges).toHaveLength(2);
    expect(prof.challenges[0]).toMatchObject({ atMs: 134000, slideIndex: 4, text: 'Justify?', responded: true });
    expect(prof.challenges[1]).toMatchObject({ atMs: 200000, slideIndex: 7, text: 'Evidence?', responded: false });
  });

  it('sets verdictLine null when no validated line exists for that persona', () => {
    const verdicts = buildPersonaVerdicts({ examinerEvents: events, transcriptSegments: segments, verdictLines: {} });
    expect(verdicts[0].verdictLine).toBeNull();
  });

  it('omits events that have no persona', () => {
    const verdicts = buildPersonaVerdicts({ examinerEvents: events, transcriptSegments: segments, verdictLines: {} });
    expect(verdicts.every((v) => v.personaId !== undefined && v.personaId !== '')).toBe(true);
    expect(verdicts.flatMap((v) => v.challenges).some((c) => c.text === 'Hold')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- persona-verdicts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import type { ExaminerEvent, PersonaChallenge, PersonaVerdict, TranscriptSegment } from './types';

export function buildPersonaVerdicts({ examinerEvents, transcriptSegments, verdictLines }: { examinerEvents: ExaminerEvent[]; transcriptSegments: TranscriptSegment[]; verdictLines: Record<string, string> }): PersonaVerdict[] {
  const presenter = transcriptSegments.filter((segment) => segment.role === 'presenter');
  const responded = (event: ExaminerEvent) => presenter.some((segment) => segment.slideIndex === event.slideIndex && segment.startedAtMs > event.occurredAtMs);

  const order: string[] = [];
  const groups = new Map<string, { title: string; challenges: PersonaChallenge[] }>();
  for (const event of examinerEvents) {
    if (!event.persona) continue;
    const id = event.persona.id;
    if (!groups.has(id)) { groups.set(id, { title: event.persona.title, challenges: [] }); order.push(id); }
    groups.get(id)!.challenges.push({ atMs: event.occurredAtMs, slideIndex: event.slideIndex, text: event.text, responded: responded(event) });
  }

  return order.map((id) => {
    const group = groups.get(id)!;
    const line = verdictLines[id];
    return { personaId: id, personaTitle: group.title, challenges: group.challenges, verdictLine: typeof line === 'string' && line.trim() ? line.trim() : null };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- persona-verdicts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/defense/persona-verdicts.ts src/features/defense/persona-verdicts.test.ts
git commit -m "feat: persona verdict assembly (grounded + validated line)"
```

---

### Task 5: Pure report assembler + verdict-line validation (`coaching-report.ts`)

**Files:**
- Create: `src/features/defense/coaching-report.ts`
- Test: `src/features/defense/coaching-report.test.ts`

**Interfaces:**
- Consumes: `computeCoachingMetrics` (Task 2), `buildTimeline` (Task 3), `buildPersonaVerdicts` (Task 4), `buildDefenseReport` (existing), types (Task 1).
- Produces:
  - `validatePersonaVerdictLines(examinerEvents: ExaminerEvent[], raw: { personaId: string; line: string }[] | undefined): Record<string, string>` — keeps a line only if that `personaId` has ≥1 event.
  - `assembleCoachingReport({ deck, transcriptSegments, examinerEvents, findings, verdictLines, minimal }): CoachingReport`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { assembleCoachingReport, validatePersonaVerdictLines } from './coaching-report';
import type { DeckContext, DefenseFinding, ExaminerEvent, TranscriptSegment } from './types';

const deck: DeckContext = { sourceName: 'deck', slides: [{ index: 1, text: 'Alpha', imageUrl: '' }] };
const segments: TranscriptSegment[] = [{ role: 'presenter', slideIndex: 1, text: 'we explain alpha here', startedAtMs: 0, endedAtMs: 30000 }];
const events: ExaminerEvent[] = [{ kind: 'question', text: 'Why?', slideIndex: 1, evidence: 'x', occurredAtMs: 10000, persona: { id: 'professor', title: 'Professor' } }];
const findings: DefenseFinding[] = [{ title: 'Explain alpha', risk: 'high', basis: 'response_explanation', presenterQuote: 'we explain alpha here', evidence: 'no reason', slideIndex: 1, drill: 'Explain why.' }];

describe('validatePersonaVerdictLines', () => {
  it('keeps lines for personas with real events and drops the rest', () => {
    const kept = validatePersonaVerdictLines(events, [{ personaId: 'professor', line: 'You leaned on the slide.' }, { personaId: 'ghost', line: 'Never spoke.' }]);
    expect(kept).toEqual({ professor: 'You leaned on the slide.' });
  });
  it('returns an empty map when there are no raw lines', () => {
    expect(validatePersonaVerdictLines(events, undefined)).toEqual({});
  });
});

describe('assembleCoachingReport', () => {
  it('composes findings, metrics, timeline, and persona verdicts', () => {
    const report = assembleCoachingReport({ deck, transcriptSegments: segments, examinerEvents: events, findings, verdictLines: { professor: 'You leaned on the slide.' }, minimal: false });
    expect(report.highestLeverage.title).toBe('Explain alpha');
    expect(report.drills).toContain('Explain why.');
    expect(report.metrics.paceWpm).toBeGreaterThan(0);
    expect(report.timeline.length).toBeGreaterThan(0);
    expect(report.personaVerdicts[0].verdictLine).toBe('You leaned on the slide.');
    expect(report.minimal).toBe(false);
  });

  it('produces a minimal report (no findings) without throwing', () => {
    const report = assembleCoachingReport({ deck, transcriptSegments: [], examinerEvents: [], findings: [], verdictLines: {}, minimal: true });
    expect(report.minimal).toBe(true);
    expect(report.metrics.paceWpm).toBeNull();
    expect(report.timeline).toEqual([]);
    expect(report.personaVerdicts).toEqual([]);
    expect(report.highestLeverage).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- coaching-report`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { buildDefenseReport } from './report';
import { computeCoachingMetrics } from './coaching-metrics';
import { buildTimeline } from './coaching-timeline';
import { buildPersonaVerdicts } from './persona-verdicts';
import type { CoachingReport, DeckContext, DefenseFinding, ExaminerEvent, TranscriptSegment } from './types';

export function validatePersonaVerdictLines(examinerEvents: ExaminerEvent[], raw: { personaId: string; line: string }[] | undefined): Record<string, string> {
  if (!raw) return {};
  const known = new Set(examinerEvents.map((event) => event.persona?.id).filter((id): id is string => Boolean(id)));
  const kept: Record<string, string> = {};
  for (const entry of raw) {
    if (entry && typeof entry.personaId === 'string' && typeof entry.line === 'string' && entry.line.trim() && known.has(entry.personaId)) {
      kept[entry.personaId] = entry.line.trim();
    }
  }
  return kept;
}

export function assembleCoachingReport({ deck, transcriptSegments, examinerEvents, findings, verdictLines, minimal }: { deck: DeckContext; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; findings: DefenseFinding[]; verdictLines: Record<string, string>; minimal: boolean }): CoachingReport {
  // buildDefenseReport already orders findings, fills a grounded fallback, and computes strengths.
  const base = buildDefenseReport({ deck, transcriptSegments, examinerEvents, findings });
  const drills = findings.length ? [...findings].map((finding) => finding.drill) : [base.nextDrill];
  return {
    highestLeverage: base.highestLeverage,
    drills,
    metrics: computeCoachingMetrics({ deck, transcriptSegments, examinerEvents }),
    timeline: buildTimeline({ transcriptSegments, examinerEvents }),
    personaVerdicts: buildPersonaVerdicts({ examinerEvents, transcriptSegments, verdictLines }),
    strengths: base.strengths,
    minimal,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- coaching-report`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/defense/coaching-report.ts src/features/defense/coaching-report.test.ts
git commit -m "feat: pure coaching-report assembler + verdict-line validation"
```

---

### Task 6: Report route — verdict lines, assembly, graceful minimal report

**Files:**
- Modify: `src/features/defense/evaluation.ts` (extend prompt for optional persona verdict lines)
- Modify: `src/app/api/defense/report/route.ts` (assemble CoachingReport; minimal fallback instead of 502; cache `{ coachingReport }`)

**Interfaces:**
- Consumes: `assembleCoachingReport`, `validatePersonaVerdictLines` (Task 5).
- Produces: `POST /api/defense/report` returns `{ report: CoachingReport }` (200 for both full and minimal; 500 only on throw); caches `{ coachingReport }` in `session.summary`.

- [ ] **Step 1: Extend the evaluation prompt**

In `src/features/defense/evaluation.ts`, change the returned JSON structure block and instructions so the model may also return per-persona verdict lines. Replace the `Return only valid JSON with this structure:` block and the trailing instruction paragraph with:

```typescript
  return `You are a rigorous but supportive thesis-defense examiner.

Session title: ${title}
Simulation mode: ${mode === 'diagnostic' ? 'Diagnostic Defense Practice' : 'Mock Defense'}

Slide deck context:
${deckText}

Presenter transcript:
${transcript || 'No transcript was captured.'}

Calculated slide-reading evidence (deterministic, not a model guess):
${JSON.stringify(readingEvidence)}

Examiner events (typed session evidence):
${JSON.stringify(examinerEvents)}

Do not infer verbatim reading without this evidence. Treat a high overlap as copied slide phrasing, but do not penalize a presenter merely for using a necessary technical term. If hasSpeech is false, state that slide-reading evidence is unavailable for that slide.

Return only valid JSON with this structure:
{
  "findings": [
    { "title": "", "risk": "high"|"medium"|"low", "basis": "slide_reliance"|"response_explanation", "presenterQuote": "exact direct quote from that slide's presenter speech", "evidence": "response gap", "slideIndex": 1, "drill": "" }
  ],
  "personaVerdicts": [
    { "personaId": "the persona.id from an examiner event above", "line": "one sentence, in that examiner's voice, grounded in a question they actually asked" }
  ]
}

Provide 1-3 findings. Each finding must name a valid slide, include a quoted presenter source in presenterQuote as an exact direct quote from that slide's presenter speech, identify the response gap, and give one short drill. Use slide_reliance only where deterministic reading evidence for that same slide has actual speech and copied phrases/overlap; otherwise use response_explanation. An examiner event may be linked only when present above. For personaVerdicts, output at most one entry per distinct persona.id that appears in the examiner events above, each a single sentence tied to a question that persona actually raised; omit personaVerdicts entirely if there were no examiner events. Never judge slide reading without the deterministic evidence. Do not output camera, multi-judge, general scores, readiness, or generic coaching.`;
```

(Only the JSON block + final paragraph change; the input interface is unchanged.)

- [ ] **Step 2: Rewrite the route's success/validation flow**

In `src/app/api/defense/report/route.ts`:

Add imports:

```typescript
import { assembleCoachingReport, validatePersonaVerdictLines } from '@/features/defense/coaching-report';
```

Extend the response schema to accept the optional verdict lines. Replace the `findingsSchema` line with:

```typescript
const findingsSchema = z.object({
  findings: z.array(defenseFindingSchema).min(1).max(3),
  personaVerdicts: z.array(z.object({ personaId: z.string(), line: z.string() })).optional(),
}).strict();
```

Replace the block from `const spoken = spokenBySlide(...)` through the `return NextResponse.json({ report });` line with:

```typescript
    const spoken = spokenBySlide(transcriptSegments);
    const noSpeech = Object.keys(spoken).length === 0;

    const readingEvidence = analyseReading(deck.slides, spoken);
    const cache = async (report: Awaited<ReturnType<typeof assembleCoachingReport>>, findings: unknown) => {
      await db.session.update({ where: { id: session.id }, data: { findings: JSON.stringify(findings), summary: JSON.stringify({ coachingReport: report }) } });
    };

    // Graceful minimal report: no presenter speech → still return a usable, grounded report.
    if (noSpeech) {
      const report = assembleCoachingReport({ deck, transcriptSegments, examinerEvents, findings: [], verdictLines: {}, minimal: true });
      await cache(report, []);
      return NextResponse.json({ report });
    }

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({ messages: [{ role: 'system', content: buildDefenseEvaluationPrompt({ title: session.title, mode: session.mode === 'mock' ? 'mock' : 'diagnostic', deckText: deck.slides.map((slide) => `Slide ${slide.index}: ${slide.text}`).join('\n'), transcript: transcriptSegments.filter((segment) => segment.role === 'presenter').map((segment) => `Slide ${segment.slideIndex}: ${segment.text}`).join('\n'), readingEvidence, examinerEvents }) }], thinking: { type: 'disabled' } });
    const text = completion.choices[0]?.message?.content;
    let candidate: unknown;
    try { candidate = text ? JSON.parse(cleanModelJson(text)) : null; } catch { candidate = null; }
    const parsed = findingsSchema.safeParse(candidate);

    const findingsUnsupported = !parsed.success || parsed.data.findings.some((finding) => {
      const speech = normalise(spoken[finding.slideIndex] || '');
      const quote = normalise(finding.presenterQuote);
      const reading = readingEvidence.find((item) => item.slideIndex === finding.slideIndex);
      return !deck.slides.some((slide) => slide.index === finding.slideIndex)
        || !quote || !speech.includes(quote)
        || (finding.basis === 'slide_reliance' && (!reading?.hasSpeech || (reading.overlap <= 0 && reading.copiedPhrases.length === 0)));
    });

    // Unvalidatable findings → minimal report (grounded timeline/metrics/persona evidence still render), not a 502.
    if (findingsUnsupported || !parsed.success) {
      const report = assembleCoachingReport({ deck, transcriptSegments, examinerEvents, findings: [], verdictLines: {}, minimal: true });
      await cache(report, []);
      return NextResponse.json({ report });
    }

    const verdictLines = validatePersonaVerdictLines(examinerEvents, parsed.data.personaVerdicts);
    const report = assembleCoachingReport({ deck, transcriptSegments, examinerEvents, findings: parsed.data.findings, verdictLines, minimal: false });
    await cache(report, parsed.data.findings);
    return NextResponse.json({ report });
```

Remove the now-unused earlier `const readingEvidence = analyseReading(...)` duplicate that sat after the findings parse (there must be exactly one `readingEvidence` declaration — the one added above). Also remove the old `if (Object.keys(spoken).length === 0) return ... 422` and the old `hasUnsupportedFinding` 502 return, since the new flow replaces both. Finally, remove the now-unused `import { buildDefenseReport } from '@/features/defense/report';` line at the top of the route — the assembler (Task 5) owns that call now; leaving the import triggers a no-unused-vars lint error. Keep the `analyseReading` and `spokenBySlide` imports (still used).

- [ ] **Step 3: Run the full suite + build**

Run: `npm.cmd run test`
Expected: full suite green (no route unit test exists; the pure logic is covered by Task 5; this confirms nothing else broke).

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/features/defense/evaluation.ts "src/app/api/defense/report/route.ts"
git commit -m "feat: report route emits coaching report + graceful minimal fallback"
```

---

### Task 7: `SessionAudioPlayer` seek handle

**Files:**
- Modify: `src/features/simulator/SessionAudioPlayer.tsx`
- Modify: `src/features/simulator/SessionAudioPlayer.test.tsx` (append; keep existing assertions)

**Interfaces:**
- Consumes: nothing new.
- Produces: `SessionAudioPlayer` accepts `ref` exposing `{ seekTo(seconds: number): void }` (via `useImperativeHandle`); still renders the same filled/empty states.

- [ ] **Step 1: Write the failing test (render still works with a ref type)**

Append inside the existing `describe('SessionAudioPlayer', …)` block in `SessionAudioPlayer.test.tsx`:

```tsx
  it('still renders the player when given a ref (seek handle attached)', () => {
    const html = renderToStaticMarkup(<SessionAudioPlayer audioPath="/recordings/s.webm" />);
    expect(html).toContain('controls');
    expect(html).toContain('src="/recordings/s.webm"');
  });
```

(The imperative `seekTo` behavior touches the live DOM `<audio>` element and is verified in-browser, not here — jsdom is not used. This case only locks that adding the ref/handle didn't break static rendering.)

- [ ] **Step 2: Run test to verify it passes-as-written after implementation; first confirm current state**

Run: `npm.cmd run test -- SessionAudioPlayer`
Expected: PASS for existing + the new case (the new case passes even pre-change, but Step 3 must not break it).

- [ ] **Step 3: Add the imperative seek handle**

Rewrite `src/features/simulator/SessionAudioPlayer.tsx`:

```tsx
'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';

export interface SessionAudioPlayerHandle {
  seekTo(seconds: number): void;
}

export const SessionAudioPlayer = forwardRef<SessionAudioPlayerHandle, { audioPath?: string | null }>(function SessionAudioPlayer({ audioPath }, ref) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = Math.max(0, seconds);
      void el.play?.();
    },
  }), []);

  if (!audioPath) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-sm text-muted-foreground">
        No recording was captured for this session.
      </div>
    );
  }
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-sm font-medium text-foreground">Session recording</h2>
      <p className="mt-1 text-xs text-muted-foreground">Replay exactly what you said, start to finish.</p>
      <audio ref={audioRef} className="mt-4 w-full" controls preload="metadata">
        <source src={audioPath} type="audio/webm" />
      </audio>
    </section>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- SessionAudioPlayer`
Expected: PASS (all existing + new).

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/SessionAudioPlayer.tsx src/features/simulator/SessionAudioPlayer.test.tsx
git commit -m "feat: SessionAudioPlayer exposes a seekTo handle for tap-to-seek"
```

---

### Task 8: Report presentational units

**Files:**
- Create: `src/features/defense/components/MetricsStrip.tsx`
- Create: `src/features/defense/components/EvidenceTimeline.tsx`
- Create: `src/features/defense/components/PersonaVerdictCards.tsx`
- Create: `src/features/defense/components/DrillsPanel.tsx`
- Test: `src/features/defense/components/coaching-report-units.test.tsx`

**Interfaces:**
- Consumes: types (Task 1), `formatTimestamp` (Task 3).
- Produces: four presentational components, each taking an `onSeek?: (ms: number) => void` where a moment/metric is clickable.
  - `MetricsStrip({ metrics, onSeek })`
  - `EvidenceTimeline({ timeline, onSeek })`
  - `PersonaVerdictCards({ verdicts, onSeek })`
  - `DrillsPanel({ drills, retryHref })`

- [ ] **Step 1: Write the failing test**

Create `src/features/defense/components/coaching-report-units.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MetricsStrip } from './MetricsStrip';
import { EvidenceTimeline } from './EvidenceTimeline';
import { PersonaVerdictCards } from './PersonaVerdictCards';
import { DrillsPanel } from './DrillsPanel';
import type { CoachingMetrics, PersonaVerdict, TimelineMoment } from '@/features/defense/types';

const metrics: CoachingMetrics = { paceWpm: 142, fillerPerMin: 6, verbatimSlides: 2, slideTimes: [{ slideIndex: 4, ms: 190000, atMs: 130000 }], questionsHandled: { handled: 3, total: 5 } };
const timeline: TimelineMoment[] = [
  { atMs: 0, kind: 'presenter', slideIndex: 1, text: 'Opening line' },
  { atMs: 134000, kind: 'question', slideIndex: 4, text: 'Why alpha', personaTitle: 'Professor' },
];
const verdicts: PersonaVerdict[] = [
  { personaId: 'professor', personaTitle: 'Professor', verdictLine: 'You leaned on the slide.', challenges: [{ atMs: 134000, slideIndex: 4, text: 'Why alpha', responded: false }] },
];

describe('MetricsStrip', () => {
  it('shows grounded dimensions with values', () => {
    const html = renderToStaticMarkup(<MetricsStrip metrics={metrics} onSeek={() => undefined} />);
    expect(html).toContain('142');
    expect(html).toContain('Pace');
    expect(html).toContain('Questions handled');
    expect(html).toContain('3 of 5');
  });
  it('renders a dash when a metric is null', () => {
    const html = renderToStaticMarkup(<MetricsStrip metrics={{ ...metrics, paceWpm: null, fillerPerMin: null }} onSeek={() => undefined} />);
    expect(html).toContain('Pace');
  });
});

describe('EvidenceTimeline', () => {
  it('lists moments with mm:ss badges and persona tags', () => {
    const html = renderToStaticMarkup(<EvidenceTimeline timeline={timeline} onSeek={() => undefined} />);
    expect(html).toContain('0:00');
    expect(html).toContain('2:14');
    expect(html).toContain('Professor');
    expect(html).toContain('Opening line');
  });
});

describe('PersonaVerdictCards', () => {
  it('renders a card per persona with its validated line and challenges', () => {
    const html = renderToStaticMarkup(<PersonaVerdictCards verdicts={verdicts} onSeek={() => undefined} />);
    expect(html).toContain('Professor');
    expect(html).toContain('You leaned on the slide.');
    expect(html).toContain('Why alpha');
  });
});

describe('DrillsPanel', () => {
  it('lists drills and a retry link', () => {
    const html = renderToStaticMarkup(<DrillsPanel drills={['Explain why.', 'Rehearse the closing.']} retryHref="/rehearse/s1" />);
    expect(html).toContain('Explain why.');
    expect(html).toContain('Rehearse the closing.');
    expect(html).toContain('href="/rehearse/s1"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- coaching-report-units`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `MetricsStrip.tsx`**

```tsx
import type { CoachingMetrics } from '@/features/defense/types';

function Metric({ label, value, atMs, onSeek }: { label: string; value: string; atMs?: number; onSeek: (ms: number) => void }) {
  const body = (
    <span className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-lg text-foreground">{value}</span>
    </span>
  );
  if (typeof atMs === 'number') {
    return <button type="button" onClick={() => onSeek(atMs)} className="rounded-lg border border-border bg-surface px-4 py-3 text-left shadow-e1 transition-shadow hover:shadow-e2">{body}</button>;
  }
  return <div className="rounded-lg border border-border bg-surface px-4 py-3 shadow-e1">{body}</div>;
}

export function MetricsStrip({ metrics, onSeek }: { metrics: CoachingMetrics; onSeek: (ms: number) => void }) {
  const longest = [...metrics.slideTimes].sort((a, b) => b.ms - a.ms)[0];
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">How you delivered</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Pace (wpm)" value={metrics.paceWpm === null ? '--' : String(metrics.paceWpm)} onSeek={onSeek} />
        <Metric label="Fillers / min" value={metrics.fillerPerMin === null ? '--' : metrics.fillerPerMin.toFixed(1)} onSeek={onSeek} />
        <Metric label="Slides read near-verbatim" value={String(metrics.verbatimSlides)} onSeek={onSeek} />
        <Metric label="Questions handled" value={`${metrics.questionsHandled.handled} of ${metrics.questionsHandled.total}`} onSeek={onSeek} />
        {longest ? <Metric label={`Longest on slide ${longest.slideIndex}`} value={`${Math.round(longest.ms / 1000)}s`} atMs={longest.atMs} onSeek={onSeek} /> : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write `EvidenceTimeline.tsx`**

```tsx
import { formatTimestamp } from '@/features/defense/coaching-timeline';
import type { TimelineMoment } from '@/features/defense/types';

const KIND_LABEL: Record<TimelineMoment['kind'], string> = { presenter: 'You', question: 'Question', interrupt: 'Interruption', follow_up: 'Follow-up' };

export function EvidenceTimeline({ timeline, onSeek }: { timeline: TimelineMoment[]; onSeek: (ms: number) => void }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">Timeline of moments</h2>
      <ol className="mt-4 flex flex-col gap-2">
        {timeline.map((moment, index) => (
          <li key={`${moment.atMs}-${index}`}>
            <button type="button" onClick={() => onSeek(moment.atMs)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface">
              <span className="mt-0.5 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{formatTimestamp(moment.atMs)}</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">{KIND_LABEL[moment.kind]}{moment.personaTitle ? ` - ${moment.personaTitle}` : ''} - Slide {moment.slideIndex}</span>
                <span className="text-sm text-foreground">{moment.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 5: Write `PersonaVerdictCards.tsx`**

```tsx
import { formatTimestamp } from '@/features/defense/coaching-timeline';
import type { PersonaVerdict } from '@/features/defense/types';

export function PersonaVerdictCards({ verdicts, onSeek }: { verdicts: PersonaVerdict[]; onSeek: (ms: number) => void }) {
  if (verdicts.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">What the panel pressed on</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {verdicts.map((verdict) => (
          <article key={verdict.personaId} className="rounded-lg border border-border bg-surface/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">{verdict.personaTitle}</h3>
            {verdict.verdictLine ? <p className="mt-1 text-sm text-muted-foreground">{verdict.verdictLine}</p> : null}
            <ul className="mt-3 flex flex-col gap-2">
              {verdict.challenges.map((challenge, index) => (
                <li key={`${challenge.atMs}-${index}`}>
                  <button type="button" onClick={() => onSeek(challenge.atMs)} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface">
                    <span className="mt-0.5 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{formatTimestamp(challenge.atMs)}</span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm text-foreground">{challenge.text}</span>
                      <span className="text-xs text-muted-foreground">Slide {challenge.slideIndex} - {challenge.responded ? 'you responded' : 'no response captured'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Write `DrillsPanel.tsx`**

```tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DrillsPanel({ drills, retryHref }: { drills: string[]; retryHref: string }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">Your next drills</h2>
      <ol className="mt-4 flex flex-col gap-2 list-decimal pl-5 marker:text-muted-foreground">
        {drills.map((drill, index) => <li key={`${index}-${drill}`} className="text-sm text-foreground">{drill}</li>)}
      </ol>
      <Link href={retryHref} className={cn(buttonVariants({ size: 'lg' }), 'mt-5 w-fit')}>Rehearse again</Link>
    </section>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm.cmd run test -- coaching-report-units`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/defense/components/MetricsStrip.tsx src/features/defense/components/EvidenceTimeline.tsx src/features/defense/components/PersonaVerdictCards.tsx src/features/defense/components/DrillsPanel.tsx src/features/defense/components/coaching-report-units.test.tsx
git commit -m "feat: coaching report presentational units (metrics, timeline, personas, drills)"
```

---

### Task 9: `CoachingReportView` (compose + tap-to-seek wiring)

**Files:**
- Create: `src/features/defense/components/coaching-report.tsx`
- Test: `src/features/defense/components/coaching-report-view.test.tsx`

**Interfaces:**
- Consumes: the four units (Task 8), `SessionAudioPlayer` + `SessionAudioPlayerHandle` (Task 7), `CoachingReport` (Task 1).
- Produces: `CoachingReportView({ report, audioPath, retryHref }): React.ReactElement` — page `<h1>`, sections in order, owns the player ref and passes `onSeek` down.

- [ ] **Step 1: Write the failing test**

Create `src/features/defense/components/coaching-report-view.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CoachingReportView } from './coaching-report';
import type { CoachingReport } from '@/features/defense/types';

const report: CoachingReport = {
  highestLeverage: { title: 'Explain the result', risk: 'high', basis: 'response_explanation', presenterQuote: 'the model converged', evidence: 'no reason given', slideIndex: 1, drill: 'Explain why.' },
  drills: ['Explain why.'],
  metrics: { paceWpm: 142, fillerPerMin: 6, verbatimSlides: 2, slideTimes: [{ slideIndex: 1, ms: 60000, atMs: 0 }], questionsHandled: { handled: 3, total: 5 } },
  timeline: [{ atMs: 0, kind: 'presenter', slideIndex: 1, text: 'Opening' }],
  personaVerdicts: [{ personaId: 'professor', personaTitle: 'Professor', verdictLine: 'You leaned on the slide.', challenges: [{ atMs: 0, slideIndex: 1, text: 'Why?', responded: true }] }],
  strengths: ['Clear scope'],
  minimal: false,
};

describe('CoachingReportView', () => {
  it('renders the headline, the sections, and the audio player', () => {
    const html = renderToStaticMarkup(<CoachingReportView report={report} audioPath="/recordings/s1.webm" retryHref="/rehearse/s1" />);
    expect(html).toContain('Explain the result');
    expect(html).toContain('How you delivered');
    expect(html).toContain('Timeline of moments');
    expect(html).toContain('What the panel pressed on');
    expect(html).toContain('Your next drills');
    expect(html).toContain('Session recording');
    expect(html).toContain('<h1');
  });

  it('renders the empty-recording state when there is no audio', () => {
    const html = renderToStaticMarkup(<CoachingReportView report={report} audioPath={null} retryHref="/rehearse/s1" />);
    expect(html).toContain('No recording was captured for this session.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- coaching-report-view`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `coaching-report.tsx`**

```tsx
'use client';

import { useRef } from 'react';
import { SessionAudioPlayer, type SessionAudioPlayerHandle } from '@/features/simulator/SessionAudioPlayer';
import { MetricsStrip } from './MetricsStrip';
import { EvidenceTimeline } from './EvidenceTimeline';
import { PersonaVerdictCards } from './PersonaVerdictCards';
import { DrillsPanel } from './DrillsPanel';
import type { CoachingReport } from '@/features/defense/types';

export function CoachingReportView({ report, audioPath, retryHref = '/rehearse' }: { report: CoachingReport; audioPath?: string | null; retryHref?: string }) {
  const playerRef = useRef<SessionAudioPlayerHandle>(null);
  const onSeek = (ms: number) => playerRef.current?.seekTo(ms / 1000);
  return (
    <div className="space-y-8 text-sm leading-6">
      <header className="rounded-xl border border-border bg-card p-6 shadow-e1">
        <p className="text-muted-foreground">Highest-leverage issue</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-medium tracking-tight">{report.highestLeverage.title}</h1>
        <p className="mt-2">{report.highestLeverage.evidence}</p>
      </header>
      <SessionAudioPlayer ref={playerRef} audioPath={audioPath} />
      <MetricsStrip metrics={report.metrics} onSeek={onSeek} />
      {report.timeline.length > 0 ? <EvidenceTimeline timeline={report.timeline} onSeek={onSeek} /> : null}
      <PersonaVerdictCards verdicts={report.personaVerdicts} onSeek={onSeek} />
      <DrillsPanel drills={report.drills} retryHref={retryHref} />
      {report.strengths.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
          <h2 className="text-lg font-semibold text-foreground">Strengths</h2>
          <ul className="mt-4 list-disc pl-5 space-y-1 marker:text-muted-foreground">{report.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- coaching-report-view`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/defense/components/coaching-report.tsx src/features/defense/components/coaching-report-view.test.tsx
git commit -m "feat: CoachingReportView composes the report with tap-to-seek"
```

---

### Task 10: Report page cutover + retire `DefenseReportView`

**Files:**
- Modify: `src/app/reports/[sessionId]/page.tsx`
- Modify: `src/app/reports/[sessionId]/page.test.tsx` (update the wiring lock)
- Delete: `src/features/defense/components/defense-report.tsx`
- Delete: `src/features/defense/components/defense-report.test.tsx`

**Interfaces:**
- Consumes: `CoachingReportView` (Task 9), `coachingReportSchema` (Task 1).
- Produces: the report page renders `CoachingReportView` from a cached/generated `{ coachingReport }`.

- [ ] **Step 1: Update the report page**

Rewrite `src/app/reports/[sessionId]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/features/defense/components/app-shell';
import { CoachingReportView } from '@/features/defense/components/coaching-report';
import { coachingReportSchema, type CoachingReport } from '@/features/defense/types';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export function reportFromSummary(value: unknown): CoachingReport | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = (value as Record<string, unknown>).coachingReport;
  const parsed = coachingReportSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export default function DefenseReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>();
  const [report, setReport] = useState<CoachingReport>();
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  useEffect(() => { void params.then(({ sessionId: value }) => setSessionId(value)); }, [params]);
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const load = async () => {
      try {
        const stored = await authenticatedFetch(`/api/session/${sessionId}`).then(async (response) => ({ ok: response.ok, body: await response.json() }));
        const path = stored.ok && typeof stored.body?.defense?.audioPath === 'string' ? stored.body.defense.audioPath : null;
        if (active) setAudioPath(path);
        const summaryText = stored.body?.defense?.summary;
        let parsed: unknown = null;
        try { parsed = typeof summaryText === 'string' ? JSON.parse(summaryText) : null; } catch { parsed = null; }
        const cached = stored.ok ? reportFromSummary(parsed) : null;
        if (cached) { if (active) setReport(cached); return; }
        const generated = await authenticatedFetch('/api/defense/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) });
        const body = await generated.json();
        if (!generated.ok || !reportFromSummary({ coachingReport: body.report })) throw new Error(body.error || 'Unable to create this coaching report.');
        if (active) setReport(body.report);
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load this coaching report.'); }
    };
    void load(); return () => { active = false; };
  }, [sessionId]);
  return (
    <AppShell active="progress">
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
      ) : report ? (
        <CoachingReportView report={report} audioPath={audioPath} retryHref={`/rehearse/${sessionId}`} />
      ) : (
        <p role="status" className="text-sm text-muted-foreground">Preparing your evidence-led report...</p>
      )}
    </AppShell>
  );
}
```

(`router` retained only if used; if `useRouter` becomes unused, drop that import to avoid a lint error. Verify before committing.)

- [ ] **Step 2: Update the report page test**

Open `src/app/reports/[sessionId]/page.test.tsx`. Update the wiring-lock assertions to the new component (do not add unrelated assertions):

```tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('report page coaching wiring', () => {
  it('reads audioPath and renders the coaching report view', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/reports/[sessionId]/page.tsx'), 'utf8');
    expect(source).toContain('CoachingReportView');
    expect(source).toContain('audioPath');
    expect(source).toContain('coachingReport');
  });
});
```

- [ ] **Step 3: Delete the retired component + its test**

```bash
git rm src/features/defense/components/defense-report.tsx src/features/defense/components/defense-report.test.tsx
```

Then grep to confirm no remaining importers:

Run: `grep -rn "defense-report" src` (expect: no matches referencing the deleted module path; `coaching-report` matches are fine).

- [ ] **Step 4: Run the full suite + build**

Run: `npm.cmd run test`
Expected: full suite green (the old `defense-report.test.tsx` is gone; new coaching tests cover the surface).

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add "src/app/reports/[sessionId]/page.tsx" "src/app/reports/[sessionId]/page.test.tsx"
git commit -m "feat: report page renders the coaching report; retire DefenseReportView"
```

(The `git rm` is already staged; it is included in this commit.)

---

### Task 11: Engine honesty-race reorder (Phase-6 #4)

**Files:**
- Modify: `src/features/simulator/use-simulation-engine.ts`

**Interfaces:**
- Consumes: existing `recorder`, `controller`.
- Produces: `end()` finishes the recording upload before flipping to `'ended'`, so the report shows the audio on first load.

- [ ] **Step 1: Reorder `end()` so the recording is saved before `'ended'`**

Currently `end()` sets phase in the `try` and stops the recorder in a `finally` (which runs after the phase flip). Change it so the recorder stops (uploading) BEFORE the phase becomes `'ended'`, while still always stopping on a persist failure:

```typescript
  const end = useCallback(async () => {
    let failure: string | null = null;
    try {
      await controller.end();
    } catch (e) {
      failure = e instanceof Error ? e.message : 'Your rehearsal could not be saved.';
    }
    await recorder.stop(); // finish upload + release BEFORE showing the report, so audio is present on first load
    if (failure) setError(failure);
    setCaptureState('idle');
    setPhase(controller.getState().ended ? 'ended' : 'live');
  }, [controller, recorder]);
```

(`recorder.stop()` is non-fatal and idempotent, so it always runs and never throws; the recorder is still released even when `controller.end()` failed.)

- [ ] **Step 2: Run the full suite + build**

Run: `npm.cmd run test`
Expected: full suite green (240 + this phase's new tests; no regressions).

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/features/simulator/use-simulation-engine.ts
git commit -m "fix: finish the recording upload before ending, so the report shows audio immediately"
```

---

### Task 12: In-browser verification + ledger

**Files:**
- Modify: `.superpowers/sdd/progress.md` (git-ignored scratch — update on disk; do not `git add` it)

No production code. Proves the tap-to-seek and minimal-report paths the unit tests cannot.

- [ ] **Step 1: Record a real session and open the report**

Start the dev server (`npm.cmd run dev`, port 3000). Guest Mode → New programme → upload a deck → Start rehearsal → Begin → grant mic → speak a few sentences across 2+ slides → End rehearsal. Land on `/reports/[id]`.

- [ ] **Step 2: Confirm the coaching report renders from real capture**

Verify: the highest-leverage header, the "How you delivered" metric chips (real pace/fillers/questions-handled), the "Timeline of moments" with `mm:ss` badges, the persona cards ("What the panel pressed on"), the drills, and the "Session recording" player all render.

- [ ] **Step 3: Confirm tap-to-seek**

Click a timeline moment (and a persona challenge) with a non-zero `mm:ss`. Confirm the audio player jumps to that time and begins playing.

- [ ] **Step 4: Confirm the graceful minimal report (Phase-6 502 fix)**

Open the report for a session with no captured presenter speech (e.g., end a rehearsal without speaking, or an older transcript-less session). Confirm it returns a usable report (200, `minimal` — metrics show `--`, empty timeline, no crash) rather than the previous "502 / Unable to create" error.

- [ ] **Step 5: Update the progress ledger**

Append a Phase 7 section to `.superpowers/sdd/progress.md`: tasks + commit SHAs, full-suite/build status, the in-browser results (report renders from real capture, tap-to-seek works, minimal report replaces the 502), and deferred follow-ups (longitudinal diffing = Phase 8; panel-voice mix; per-persona voices; public/ read-auth).

- [ ] **Step 6: Verify the whole suite one final time**

Run: `npm.cmd run test`
Expected: full suite green.

Run: `npm.cmd run build`
Expected: exit 0.

(No commit needed unless code changed; the ledger is git-ignored.)

---

## Self-Review

**Spec coverage:**
- §2 grounded metrics → Task 2; grounded+validated persona lines → Tasks 4,5,6; one endpoint → Task 6; graceful minimal → Tasks 5,6; tap-to-seek → Tasks 7,9.
- §3 CoachingReport type/schema + `{ coachingReport }` cache → Tasks 1,6,10.
- §4 metrics → Task 2. §5 timeline + formatTimestamp → Task 3. §6 persona verdicts → Task 4. §7 route → Task 6 (assembler Task 5). §8 UI units → Tasks 8,9. §9 seek → Task 7. §10 engine honesty race → Task 11. §11 report page → Task 10. §12 testing → tests in each task + Task 12 live. §13 files ⊆ tasks; retirement → Task 10.

**Placeholder scan:** none — every code step carries full code; the only "verify before commit" notes (Task 6 single `readingEvidence` declaration; Task 10 unused `useRouter`) are concrete lint guards with the exact condition stated, not vague hand-waves.

**Type consistency:** `CoachingMetrics`/`TimelineMoment`/`PersonaVerdict`/`CoachingReport` defined in Task 1 and consumed unchanged in Tasks 2–10. `computeCoachingMetrics`, `buildTimeline`, `formatTimestamp`, `buildPersonaVerdicts`, `validatePersonaVerdictLines`, `assembleCoachingReport`, `SessionAudioPlayerHandle.seekTo`, and the four component prop shapes all match across their producing and consuming tasks. `verdictLines: Record<string,string>` keyed by `personaId` is consistent between Tasks 4, 5, and 6.
