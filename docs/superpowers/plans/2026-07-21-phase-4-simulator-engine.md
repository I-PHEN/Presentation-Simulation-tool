# Phase 4 — Immersive Simulator Engine (Headless) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the headless, fully-tested engine for the voice-first multi-persona rehearsal room — persona library + auto-panel, live-metrics math, turn-selection, a persona-aware evidence-grounded examiner endpoint, and a multi-persona simulation controller — with zero UI (that is Phase 5).

**Architecture:** New pure/UI-agnostic units under `src/features/simulator/`, plus one additive extension to the shared `ExaminerEvent` schema and the existing `/api/defense/examiner` endpoint. The controller is a generalization of the tested `rehearsal-room-controller` (single examiner → persona panel), preserving its diagnostic/mock lifecycle and ordered-persistence discipline. Everything here is framework-free and injectable so the future native app can reuse it and so it is unit-testable without a DOM.

**Tech Stack:** TypeScript, Zod, Vitest (`environment: 'node'`, `vi.hoisted` mocks for the route). No React in this phase.

## Global Constraints

- **Design spec:** `docs/superpowers/specs/2026-07-21-immersive-simulator-voice-first-design.md`. This plan implements its Phase 4 (§4.2 units 1–5 + §4.3 endpoint + §4.4 schema field).
- **Voice-first, no camera/screen/record/report** in this slice — build none of them, not even placeholders.
- **Honesty / anti-fabrication:** the examiner endpoint's existing design has the LLM decide only the event *kind*; the **server** generates the grounded text pinned to the slide claim + the presenter's actual words. Persona flavor must ride on that server-generated path — never let the model author the question text. When `persona` is omitted, endpoint output must be **byte-for-byte identical** to today (legacy room + tests stay green).
- **Additive & optional:** the `persona` field on `ExaminerEvent` is optional; existing serialized events, the legacy `RehearsalRoom`, `studio-session-model.ts`, and the current report must remain valid and untouched.
- **Portability:** `personas.ts`, `metrics.ts`, `turn-selection.ts`, `simulation-controller.ts` are pure and import no React/DOM.
- **Cartesia voices:** the known-good voice id is `d46abd1d-2d02-43e8-819f-51fb652c1c61`. Distinct per-persona voice ids are a later config fill; use the known-good id as each persona's `voiceId` now (the map is the single seam). Do **not** invent unverified voice ids (they would 500 at TTS time).
- After each task: `npm.cmd run test` green; stage only that task's named files.

---

### Task 1: Persona library + auto-panel (`personas.ts`)

**Files:**
- Create: `src/features/simulator/personas.ts`
- Test: `src/features/simulator/personas.test.ts`

**Interfaces:**
- Produces:
  - `interface Persona { id: 'professor' | 'examiner' | 'peer'; title: string; focus: string; promptFragment: string; voiceId: string }`
  - `const PERSONAS: Record<Persona['id'], Persona>`
  - `function assemblePanel(): Persona[]` — the deterministic fixed panel `[professor, examiner, peer]`.

- [ ] **Step 1: Write the failing test**

Create `src/features/simulator/personas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PERSONAS, assemblePanel } from './personas';

describe('assemblePanel', () => {
  it('returns the fixed 3-member defense panel in order', () => {
    const panel = assemblePanel();
    expect(panel.map((p) => p.id)).toEqual(['professor', 'examiner', 'peer']);
  });

  it('gives every persona a title, focus, prompt fragment, and voice id', () => {
    for (const persona of assemblePanel()) {
      expect(persona.title.length).toBeGreaterThan(0);
      expect(persona.focus.length).toBeGreaterThan(0);
      expect(persona.promptFragment.length).toBeGreaterThan(0);
      expect(persona.voiceId).toMatch(/^[A-Za-z0-9-]+$/);
    }
  });

  it('exposes the same persona objects through PERSONAS by id', () => {
    expect(assemblePanel()).toEqual([PERSONAS.professor, PERSONAS.examiner, PERSONAS.peer]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/features/simulator/personas.test.ts`
Expected: FAIL — cannot resolve `./personas`.

- [ ] **Step 3: Write the implementation**

Create `src/features/simulator/personas.ts`:

```ts
// The known-good Cartesia Sonic voice id (see plan Global Constraints). Distinct
// per-persona voice ids are a later config fill; this is the single seam.
const DEFAULT_VOICE = 'd46abd1d-2d02-43e8-819f-51fb652c1c61';

export interface Persona {
  id: 'professor' | 'examiner' | 'peer';
  title: string;
  focus: string;
  promptFragment: string;
  voiceId: string;
}

export const PERSONAS: Record<Persona['id'], Persona> = {
  professor: {
    id: 'professor',
    title: 'Professor',
    focus: 'Methodology & rigor',
    promptFragment:
      'You are a thoughtful, rigorous thesis professor. Weigh methodology and reasoning: how they arrived at the result, whether they understand their method’s limitations, and whether they make logical leaps without evidence. You are warm but do not accept hand-waving.',
    voiceId: DEFAULT_VOICE,
  },
  examiner: {
    id: 'examiner',
    title: 'Examiner',
    focus: 'Assumptions & evidence',
    promptFragment:
      'You are a rigorous defense examiner. Probe the weakest link in the argument: claims that outrun their support and unstated assumptions. Press precisely where the evidence is thin.',
    voiceId: DEFAULT_VOICE,
  },
  peer: {
    id: 'peer',
    title: 'Peer',
    focus: 'Clarity & plain explanation',
    promptFragment:
      'You are a sharp peer in the audience. Weigh clarity: whether they can explain the point simply and concretely, and whether jargon or vague language is obscuring the meaning.',
    voiceId: DEFAULT_VOICE,
  },
};

export function assemblePanel(): Persona[] {
  return [PERSONAS.professor, PERSONAS.examiner, PERSONAS.peer];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- src/features/simulator/personas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/personas.ts src/features/simulator/personas.test.ts
git commit -m "feat: add simulator persona library and auto-panel"
```

---

### Task 2: Live speech metrics (`metrics.ts`)

**Files:**
- Create: `src/features/simulator/metrics.ts`
- Test: `src/features/simulator/metrics.test.ts`

**Interfaces:**
- Consumes: `TranscriptSegment` from `@/features/defense/types` (`{ role: 'presenter' | 'examiner'; slideIndex; text; startedAtMs; endedAtMs }`).
- Produces: `interface SpeechMetrics { wordCount; spokenMs; wpm; fillerCount; fillerRate }` and `function computeMetrics(segments: TranscriptSegment[]): SpeechMetrics`.

- [ ] **Step 1: Write the failing test**

Create `src/features/simulator/metrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeMetrics } from './metrics';
import type { TranscriptSegment } from '@/features/defense/types';

const seg = (text: string, startedAtMs: number, endedAtMs: number): TranscriptSegment => ({
  role: 'presenter', slideIndex: 1, text, startedAtMs, endedAtMs,
});

describe('computeMetrics', () => {
  it('is all-zero for an empty transcript', () => {
    expect(computeMetrics([])).toEqual({ wordCount: 0, spokenMs: 0, wpm: 0, fillerCount: 0, fillerRate: 0 });
  });

  it('counts only presenter words and computes words-per-minute over spoken time', () => {
    // 6 presenter words across 60_000ms => 6 wpm. Examiner speech is excluded.
    const segments = [seg('one two three four five six', 0, 60_000), { ...seg('examiner talk here', 0, 60_000), role: 'examiner' as const }];
    const metrics = computeMetrics(segments);
    expect(metrics.wordCount).toBe(6);
    expect(metrics.spokenMs).toBe(60_000);
    expect(metrics.wpm).toBe(6);
  });

  it('counts filler words case-insensitively on word boundaries, including multi-word fillers', () => {
    const metrics = computeMetrics([seg('Um, this is basically, you know, a Uman result', 0, 1_000)]);
    // 'Um' + 'basically' + 'you know' = 3. 'Uman' must NOT match 'um'.
    expect(metrics.fillerCount).toBe(3);
    expect(metrics.fillerRate).toBeCloseTo(3 / metrics.wordCount, 5);
  });

  it('reports zero wpm when no spoken time elapsed', () => {
    expect(computeMetrics([seg('instant words here', 5_000, 5_000)]).wpm).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/features/simulator/metrics.test.ts`
Expected: FAIL — cannot resolve `./metrics`.

- [ ] **Step 3: Write the implementation**

Create `src/features/simulator/metrics.ts`:

```ts
import type { TranscriptSegment } from '@/features/defense/types';

const FILLERS = ['um', 'uh', 'er', 'like', 'you know', 'basically', 'sort of', 'kind of', 'i mean', 'actually'];

export interface SpeechMetrics {
  wordCount: number;
  spokenMs: number;
  wpm: number;
  fillerCount: number;
  fillerRate: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function computeMetrics(segments: TranscriptSegment[]): SpeechMetrics {
  const presenter = segments.filter((segment) => segment.role === 'presenter');
  const text = presenter.map((segment) => segment.text).join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const spokenMs = presenter.reduce((sum, segment) => sum + Math.max(0, segment.endedAtMs - segment.startedAtMs), 0);
  const minutes = spokenMs / 60_000;
  const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;

  const haystack = text.toLowerCase();
  let fillerCount = 0;
  for (const filler of FILLERS) {
    const matches = haystack.match(new RegExp(`\\b${escapeRegExp(filler)}\\b`, 'g'));
    fillerCount += matches ? matches.length : 0;
  }
  const fillerRate = wordCount > 0 ? fillerCount / wordCount : 0;

  return { wordCount, spokenMs, wpm, fillerCount, fillerRate };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- src/features/simulator/metrics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/metrics.ts src/features/simulator/metrics.test.ts
git commit -m "feat: add simulator live speech metrics"
```

---

### Task 3: Panel turn-selection (`turn-selection.ts`)

**Files:**
- Create: `src/features/simulator/turn-selection.ts`
- Test: `src/features/simulator/turn-selection.test.ts`

**Interfaces:**
- Consumes: `Persona` from `./personas`.
- Produces: `function selectNextSpeaker(panel: Persona[], events: ReadonlyArray<{ persona?: { id: string } }>): Persona` — chooses the panel member who has spoken **fewest** times; ties break toward the **least-recently-spoken** (and, among never-spoken, earliest in panel order). Assumes a non-empty panel; throws on an empty panel.

- [ ] **Step 1: Write the failing test**

Create `src/features/simulator/turn-selection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { selectNextSpeaker } from './turn-selection';
import { assemblePanel } from './personas';

const panel = assemblePanel(); // [professor, examiner, peer]
const spoke = (id: string) => ({ persona: { id } });

describe('selectNextSpeaker', () => {
  it('picks the first panel member when nobody has spoken', () => {
    expect(selectNextSpeaker(panel, []).id).toBe('professor');
  });

  it('spreads turns to the members who have not spoken yet', () => {
    expect(selectNextSpeaker(panel, [spoke('professor')]).id).toBe('examiner');
    expect(selectNextSpeaker(panel, [spoke('professor'), spoke('examiner')]).id).toBe('peer');
  });

  it('after a full round, returns to the least-recently-spoken member', () => {
    const events = [spoke('professor'), spoke('examiner'), spoke('peer')];
    expect(selectNextSpeaker(panel, events).id).toBe('professor');
  });

  it('ignores events without a persona tag', () => {
    expect(selectNextSpeaker(panel, [{}, spoke('professor')]).id).toBe('examiner');
  });

  it('throws on an empty panel', () => {
    expect(() => selectNextSpeaker([], [])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/features/simulator/turn-selection.test.ts`
Expected: FAIL — cannot resolve `./turn-selection`.

- [ ] **Step 3: Write the implementation**

Create `src/features/simulator/turn-selection.ts`:

```ts
import type { Persona } from './personas';

export function selectNextSpeaker(
  panel: Persona[],
  events: ReadonlyArray<{ persona?: { id: string } }>,
): Persona {
  if (panel.length === 0) throw new Error('selectNextSpeaker requires a non-empty panel');

  const counts = new Map<string, number>(panel.map((persona) => [persona.id, 0]));
  const lastIndex = new Map<string, number>(panel.map((persona) => [persona.id, -1]));
  events.forEach((event, index) => {
    const id = event.persona?.id;
    if (id === undefined || !counts.has(id)) return;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    lastIndex.set(id, index);
  });

  let best = panel[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const persona of panel) {
    const count = counts.get(persona.id) ?? 0;
    const recency = (lastIndex.get(persona.id) ?? -1) + 1; // never-spoken => 0, else 1-based event index
    // Fewer turns dominate; ties break to the least-recently-spoken.
    const score = count * 1_000_000 + recency;
    if (score < bestScore) {
      bestScore = score;
      best = persona;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- src/features/simulator/turn-selection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/turn-selection.ts src/features/simulator/turn-selection.test.ts
git commit -m "feat: add simulator panel turn-selection"
```

---

### Task 4: Persona-aware examiner endpoint + `persona` event field

**Files:**
- Modify: `src/features/defense/types.ts` (add optional `persona` to `ExaminerEvent`)
- Modify: `src/features/defense/examiner.ts` (add optional `persona` to `createExaminerEventSchema`)
- Modify: `src/app/api/defense/examiner/route.ts` (accept optional `persona`; blend fragment into the decision prompt; persona-tag + persona-lead the grounded event)
- Modify: `src/app/api/defense/examiner/route.test.ts` (add persona-branch coverage; keep legacy assertions)

**Interfaces:**
- Consumes: existing route internals (`requestSchema`, `createServerGroundedEvent`, `createExaminerEventSchema`).
- Produces: `ExaminerEvent.persona?: { id: string; title: string }`; the endpoint accepts an optional request field `persona: { id: string; title: string; promptFragment: string }`; when present, the returned `event.persona` is set and the event's lead phrasing is persona-specific; when absent, output is unchanged.

- [ ] **Step 1: Extend the shared schema + type (write failing test first)**

Add to `src/app/api/defense/examiner/route.test.ts` (new cases inside the existing `describe`, keeping all current tests):

```ts
  it('tags the grounded event with the persona and uses the persona lead when a persona is supplied', async () => {
    findFirst.mockResolvedValue(session);
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ kind: 'question' }) } }] });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    const persona = { id: 'peer', title: 'Peer', promptFragment: 'You weigh clarity and plain explanation.' };
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: segment, persona }) }));
    const body = await response.json();
    expect(body.event.persona).toEqual({ id: 'peer', title: 'Peer' });
    // Persona fragment reaches the model decision prompt.
    expect(create.mock.calls[0][0].messages[0].content).toContain('clarity and plain explanation');
    // Still grounded in both server sources.
    expect(body.event.text).toContain('Retention increased after the onboarding redesign.');
    expect(body.event.text).toContain(segment.text);
    // Peer lead phrasing is used.
    expect(body.event.text).toContain('Say this in plain terms');
  });

  it('omits persona from the event and keeps legacy lead phrasing when no persona is supplied', async () => {
    findFirst.mockResolvedValue(session);
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ kind: 'interrupt' }) } }] });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: segment }) }));
    const body = await response.json();
    expect(body.event.persona).toBeUndefined();
    expect(body.event.text).toContain('Address this precisely'); // rigorous legacy lead
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/app/api/defense/examiner/route.test.ts`
Expected: FAIL — persona not tagged / peer lead missing (route not yet updated; schema rejects `persona`).

- [ ] **Step 3: Update the type**

In `src/features/defense/types.ts`, change the `ExaminerEvent` interface to add the optional field (leave everything else as-is):

```ts
export interface ExaminerEvent {
  kind: 'interrupt' | 'question' | 'follow_up';
  text: string;
  slideIndex: number;
  evidence: string;
  occurredAtMs: number;
  persona?: { id: string; title: string };
}
```

- [ ] **Step 4: Update the shared schema**

Replace the body of `src/features/defense/examiner.ts` with the persona-extended schema (still `.strict()`; `persona` optional so omitting it stays valid and present-with-only-id/title stays valid):

```ts
import { z } from 'zod';

export const createExaminerEventSchema = z.object({
  kind: z.enum(['interrupt', 'question', 'follow_up']),
  text: z.string().trim().min(1).max(1_000),
  slideIndex: z.number().int().positive(),
  evidence: z.string().trim().min(1).max(2_000),
  occurredAtMs: z.number().finite().nonnegative(),
  persona: z.object({ id: z.string().trim().min(1).max(50), title: z.string().trim().min(1).max(80) }).optional(),
}).strict();
```

- [ ] **Step 5: Update the route**

In `src/app/api/defense/examiner/route.ts`:

(a) Add persona to `requestSchema` (inside the `z.object({ ... })`, before the closing `.strict()`):

```ts
  persona: z.object({ id: z.string().trim().min(1).max(50), title: z.string().trim().min(1).max(80), promptFragment: z.string().trim().min(1).max(2_000) }).optional(),
```

(b) Replace `createServerGroundedEvent` with a persona-aware version (persona-specific lead; tags the event; legacy path unchanged when `persona` is undefined):

```ts
const PERSONA_LEADS: Record<string, string> = {
  professor: 'Walk me through your method here.',
  examiner: 'Address this precisely.',
  peer: 'Say this in plain terms.',
};

function createServerGroundedEvent(
  kind: 'interrupt' | 'question' | 'follow_up',
  stance: 'supportive' | 'rigorous',
  slideIndex: number,
  slideText: string,
  speech: string,
  persona?: { id: string; title: string },
) {
  const claim = excerpt(slideText);
  const spoken = excerpt(speech);
  const lead = persona
    ? (PERSONA_LEADS[persona.id] ?? (stance === 'rigorous' ? 'Address this precisely.' : 'Please clarify this connection.'))
    : stance === 'rigorous' ? 'Address this precisely.' : 'Please clarify this connection.';
  const action = kind === 'interrupt' ? 'Pause for a moment' : kind === 'follow_up' ? 'Follow up on this point' : 'Please explain';
  return {
    kind,
    text: `${action}: the slide states "${claim}" and you said "${spoken}". ${lead}`,
    slideIndex,
    evidence: `Slide claim: ${claim} Presenter speech: ${spoken}`,
    occurredAtMs: Date.now(),
    ...(persona ? { persona: { id: persona.id, title: persona.title } } : {}),
  };
}
```

(c) Destructure `persona` and blend its fragment into the decision prompt, then pass it through. Change the destructure line and the `prompt`/event-build lines:

```ts
    const { sessionId, currentSegment, readingEvidence, persona } = parsedRequest.data;
```

In the `prompt` template, insert the persona fragment right after the first line (so it colors the decision). Replace the prompt's opening with:

```ts
    const prompt = `You are a ${stance} thesis examiner.${persona ? ` Persona focus: ${persona.promptFragment}` : ''} Return ONLY either NO_INTERRUPT or a JSON object matching exactly this schema: {"kind":"interrupt"|"question"|"follow_up"}.
```

And pass persona into the event builder:

```ts
    const event = createExaminerEventSchema.safeParse(createServerGroundedEvent(decision.data.kind, stance, slide.index, slide.text, currentSegment.text, persona ? { id: persona.id, title: persona.title } : undefined));
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm.cmd run test -- src/app/api/defense/examiner/route.test.ts`
Expected: PASS — new persona cases pass and all seven legacy cases stay green (persona-omitted output unchanged).

- [ ] **Step 7: Run the full suite**

Run: `npm.cmd run test`
Expected: PASS — the additive `persona` field does not break the controller test, session schema, or report tests.

- [ ] **Step 8: Commit**

```bash
git add src/features/defense/types.ts src/features/defense/examiner.ts src/app/api/defense/examiner/route.ts src/app/api/defense/examiner/route.test.ts
git commit -m "feat: make the examiner endpoint persona-aware (additive)"
```

---

### Task 5: Multi-persona simulation controller (`simulation-controller.ts`)

**Files:**
- Create: `src/features/simulator/simulation-controller.ts`
- Test: `src/features/simulator/simulation-controller.test.ts`

**Interfaces:**
- Consumes: `DefenseMode`, `ExaminerEvent`, `TranscriptSegment` from `@/features/defense/types`; `Persona` from `./personas`; `selectNextSpeaker` from `./turn-selection` (injected, defaulted).
- Produces: `createSimulationController(deps): SimulationController`. It generalizes the tested `rehearsal-room-controller`: the single `requestExaminer(segment)` becomes `requestTurn(segment, persona)`, a `panel: Persona[]` is supplied, and each produced event is persona-tagged (from the persona the controller chose, if the endpoint did not already tag it). All lifecycle semantics (diagnostic live-speak, mock queue/answer/continue, ordered persistence, slide flush, completed-status monotonicity) are **identical** to the reference controller.

```ts
export type SimulationControllerDependencies = {
  mode: DefenseMode;
  panel: Persona[];
  now: () => number;
  persist: (segments: TranscriptSegment[], events: ExaminerEvent[], status: 'practicing' | 'completed') => Promise<void> | void;
  startCapture: (start: { slideIndex: number; startedAtMs: number }) => Promise<void> | void;
  stopCapture: () => Promise<void> | void;
  requestTurn: (segment: TranscriptSegment, persona: Persona) => Promise<ExaminerEvent | null>;
  speak: (event: ExaminerEvent) => Promise<unknown> | unknown;
  onComplete: () => void;
  onChange?: () => void;
  selectSpeaker?: (panel: Persona[], events: ReadonlyArray<{ persona?: { id: string } }>) => Persona;
  initialSlideIndex?: number;
  initialSegments?: TranscriptSegment[];
  initialEvents?: ExaminerEvent[];
};
```

- [ ] **Step 1: Write the failing test**

Create `src/features/simulator/simulation-controller.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createSimulationController } from './simulation-controller';
import { assemblePanel } from './personas';
import type { ExaminerEvent } from '@/features/defense/types';

const panel = assemblePanel();
const event: ExaminerEvent = { kind: 'question', text: 'What supports this result?', slideIndex: 1, evidence: 'Slide claim', occurredAtMs: 20 };
const segment = (text = 'one two three four five six seven eight') => ({ role: 'presenter' as const, slideIndex: 1, text, startedAtMs: 0, endedAtMs: 10 });

describe('simulation controller', () => {
  it('routes a qualifying diagnostic segment to the selected persona and speaks the tagged event', async () => {
    const speak = vi.fn();
    const requestTurn = vi.fn(async (_segment, persona) => ({ ...event, persona: { id: persona.id, title: persona.title } }));
    const controller = createSimulationController({ mode: 'diagnostic', panel, now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestTurn, speak, onComplete: vi.fn() });
    await controller.start();
    await controller.commit(segment('one two three')); // below the 8-word floor: ignored
    await controller.commit(segment());
    await controller.waitForExaminer();
    expect(requestTurn).toHaveBeenCalledOnce();
    // First turn goes to the first panel member.
    expect(requestTurn.mock.calls[0][1].id).toBe('professor');
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ persona: { id: 'professor', title: 'Professor' } }));
  });

  it('tags an untagged endpoint event with the persona the controller chose', async () => {
    const speak = vi.fn();
    const requestTurn = vi.fn().mockResolvedValue(event); // endpoint returned no persona
    const controller = createSimulationController({ mode: 'diagnostic', panel, now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestTurn, speak, onComplete: vi.fn() });
    await controller.start();
    await controller.commit(segment());
    await controller.waitForExaminer();
    expect(controller.getState().events[0].persona).toEqual({ id: 'professor', title: 'Professor' });
  });

  it('spreads consecutive diagnostic turns across the panel', async () => {
    const requestTurn = vi.fn(async (_segment, persona) => ({ ...event, persona: { id: persona.id, title: persona.title } }));
    const controller = createSimulationController({ mode: 'diagnostic', panel, now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestTurn, speak: vi.fn(), onComplete: vi.fn() });
    await controller.start();
    await controller.commit(segment()); await controller.waitForExaminer();
    await controller.commit({ ...segment(), endedAtMs: 11 }); await controller.waitForExaminer();
    expect(requestTurn.mock.calls.map((call) => call[1].id)).toEqual(['professor', 'examiner']);
  });

  it('awaits final capture persistence before completed and never regresses completed status', async () => {
    const writes: string[] = [];
    let controller!: ReturnType<typeof createSimulationController>;
    const persist = vi.fn(async (_s, _e, status: string) => { writes.push(status); });
    const stopCapture = vi.fn(async () => { await controller.commit(segment()); });
    controller = createSimulationController({ mode: 'mock', panel, now: () => 0, persist, startCapture: vi.fn(), stopCapture, requestTurn: vi.fn(), speak: vi.fn(), onComplete: vi.fn() });
    await controller.start(); await controller.end(); await controller.appendExaminer(event);
    expect(writes).toEqual(['practicing', 'practicing', 'completed', 'completed']);
  });

  it('keeps a mock room in Q&A until every queued question is answered, then finishes', async () => {
    const done = vi.fn();
    const controller = createSimulationController({ mode: 'mock', panel, now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestTurn: vi.fn(), speak: vi.fn(), onComplete: done });
    await controller.start(); await controller.appendExaminer(event); await controller.appendExaminer({ ...event, occurredAtMs: 21 }); await controller.end();
    controller.finish(); expect(done).not.toHaveBeenCalled();
    await controller.commit(segment('An answer long enough to be persisted first.'));
    await controller.continueQuestion();
    await controller.commit(segment('A second complete answer for the final question.'));
    await controller.continueQuestion(); controller.finish(); expect(done).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/features/simulator/simulation-controller.test.ts`
Expected: FAIL — cannot resolve `./simulation-controller`.

- [ ] **Step 3: Write the implementation**

Create `src/features/simulator/simulation-controller.ts` (a persona-generalized copy of `rehearsal-room-controller`; the only behavioral additions are speaker selection and persona-tagging — everything else mirrors the reference exactly):

```ts
import type { DefenseMode, ExaminerEvent, TranscriptSegment } from '@/features/defense/types';
import type { Persona } from './personas';
import { selectNextSpeaker } from './turn-selection';

export type SimulationControllerDependencies = {
  mode: DefenseMode;
  panel: Persona[];
  now: () => number;
  persist: (segments: TranscriptSegment[], events: ExaminerEvent[], status: 'practicing' | 'completed') => Promise<void> | void;
  startCapture: (start: { slideIndex: number; startedAtMs: number }) => Promise<void> | void;
  stopCapture: () => Promise<void> | void;
  requestTurn: (segment: TranscriptSegment, persona: Persona) => Promise<ExaminerEvent | null>;
  speak: (event: ExaminerEvent) => Promise<unknown> | unknown;
  onComplete: () => void;
  onChange?: () => void;
  selectSpeaker?: (panel: Persona[], events: ReadonlyArray<{ persona?: { id: string } }>) => Persona;
  initialSlideIndex?: number;
  initialSegments?: TranscriptSegment[];
  initialEvents?: ExaminerEvent[];
};

const minimumWords = 8;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function createSimulationController(dependencies: SimulationControllerDependencies) {
  const pickSpeaker = dependencies.selectSpeaker ?? selectNextSpeaker;
  let slideIndex = dependencies.initialSlideIndex ?? 1;
  let startedAtMs = 0;
  let started = false;
  let ended = false;
  let status: 'practicing' | 'completed' = 'practicing';
  let segments: TranscriptSegment[] = dependencies.initialSegments ?? [];
  let events: ExaminerEvent[] = dependencies.initialEvents ?? [];
  let queueIndex = 0;
  let answeringQuestion = false;
  let answerCommitted = false;
  let persistence = Promise.resolve();
  let examinerWork = Promise.resolve();
  const notify = () => dependencies.onChange?.();

  const save = (nextStatus = status) => {
    persistence = persistence.then(() => dependencies.persist(segments, events, nextStatus));
    return persistence;
  };
  const captureStart = () => dependencies.startCapture({ slideIndex, startedAtMs: Math.max(0, dependencies.now() - startedAtMs) });

  const appendExaminer = async (event: ExaminerEvent) => {
    events = [...events, event];
    notify();
    await save();
  };
  const appendExaminerSegment = async (segment: TranscriptSegment) => {
    segments = [...segments, segment];
    notify();
    await save();
  };
  const examine = async (segment: TranscriptSegment) => {
    if (words(segment.text) < minimumWords) return;
    const persona = pickSpeaker(dependencies.panel, events);
    const raw = await dependencies.requestTurn(segment, persona);
    if (!raw) return;
    const event: ExaminerEvent = raw.persona ? raw : { ...raw, persona: { id: persona.id, title: persona.title } };
    await appendExaminer(event);
    if (dependencies.mode === 'diagnostic') await dependencies.speak(event);
  };
  const commit = async (segment: TranscriptSegment) => {
    if (ended || !segment.text.trim()) return;
    segments = [...segments, segment];
    notify();
    await save();
    if (dependencies.mode === 'mock' && answeringQuestion) {
      answerCommitted = true;
      notify();
      return;
    }
    examinerWork = examinerWork.then(() => examine(segment));
  };
  const start = async () => {
    startedAtMs = dependencies.now();
    started = true;
    status = 'practicing';
    await save('practicing');
    await captureStart();
    notify();
  };
  const changeSlide = async (nextSlideIndex: number) => {
    if (started && !ended) await dependencies.stopCapture();
    slideIndex = nextSlideIndex;
    notify();
    if (started && !ended) await captureStart();
  };
  const end = async () => {
    if (ended) return;
    await dependencies.stopCapture();
    await examinerWork;
    if (dependencies.mode === 'mock' && events.length) {
      answeringQuestion = true;
      answerCommitted = false;
      slideIndex = events[queueIndex].slideIndex;
      await dependencies.speak(events[queueIndex]);
    } else {
      ended = true;
      status = 'completed';
      await save('completed');
    }
    notify();
  };
  const continueQuestion = async () => {
    if (!answeringQuestion || dependencies.mode !== 'mock' || !answerCommitted) return;
    await dependencies.stopCapture();
    const next = queueIndex + 1;
    if (next >= events.length) {
      answeringQuestion = false;
      ended = true;
      status = 'completed';
      await save('completed');
      notify();
      return;
    }
    queueIndex = next;
    answerCommitted = false;
    slideIndex = events[queueIndex].slideIndex;
    notify();
    await dependencies.speak(events[queueIndex]);
  };
  const canFinish = () => ended;
  const finish = () => { if (canFinish()) dependencies.onComplete(); };

  return { start, commit, appendExaminer, appendExaminerSegment, changeSlide, end, continueQuestion, finish, waitForExaminer: () => examinerWork, canFinish, getState: () => ({ slideIndex, started, ended, status, segments, events, queueIndex, answeringQuestion, answerCommitted, panel: dependencies.panel }) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- src/features/simulator/simulation-controller.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Run the full suite + build**

Run: `npm.cmd run test`
Expected: PASS — full suite green.

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/simulator/simulation-controller.ts src/features/simulator/simulation-controller.test.ts
git commit -m "feat: add multi-persona simulation controller"
```

---

## Self-review notes (author)

- **Spec coverage (§4.2 units 1–5, §4.3 endpoint, §4.4 schema):** personas/panel ✔ (Task 1), metrics ✔ (Task 2), turn-selection ✔ (Task 3), persona endpoint + additive `persona` field ✔ (Task 4), simulation controller ✔ (Task 5). `use-simulation-engine.ts` (the React/DOM hook) is intentionally deferred to **Phase 5**, where it is wired to the UI and verified in-browser — its logic-bearing parts already live in the pure controller, so there is nothing headless left to unit-test in the hook.
- **Anti-fabrication preserved:** Task 4 keeps the LLM deciding only `kind`; text stays server-generated and quoted; persona only adds a deterministic lead + tag + a prompt-coloring fragment. Persona-omitted output is unchanged, so the seven legacy route tests and the legacy `RehearsalRoom` stay green.
- **Type consistency:** `Persona`, `assemblePanel`, `selectNextSpeaker`, `createSimulationController`, and the `persona: { id, title }` shape are identical across tasks and match the endpoint's tag.
- **Known, intentional duplication (surface to final review / human):** `simulation-controller.ts` duplicates most of `rehearsal-room-controller.ts`. This is a deliberate fork — the legacy controller powers the legacy `/practice/[id]?view=room` room (still routed to by `studio-session-model.ts` + 5 test files, out of scope here), while the new controller is the multi-persona future. They converge when the legacy room is retired in a later reconciliation phase. Retiring it now is out of this slice's scope (spec §12). Flagged for the human to confirm rather than silently accept.
- **No DB migration:** the `persona` field lives in JSON-serialized events; Prisma schema is untouched.
