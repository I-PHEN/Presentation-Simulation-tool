# Phase 5 — Immersive Multi-Persona Room (UI + Route + Liveness) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full-viewport, unshelled immersive rehearsal room at `/rehearse/[sessionId]` on top of the Phase-4 engine — a live multi-persona panel that **greets the speaker aloud on entry** (never silent), listens via mic, challenges with evidence-grounded questions in distinct persona voices, and shows a live transcript + pacing/filler metrics. Repoint Phase-3 "Start rehearsal" here.

**Architecture:** New modular UI under `src/features/simulator/`, composed by `SimulatorRoom` and consuming a single `use-simulation-engine` hook that binds the tested `createSimulationController` (Phase 4) to real IO — mic STT, per-persona TTS, timers, live metrics, and the opening `/api/intro` welcome. Pure/store units are unit-tested; the media hook + room are verified in-browser (no jsdom in this repo).

**Tech Stack:** Next.js App Router (client), TypeScript, Tailwind v4 soft-depth tokens, Vitest (`renderToStaticMarkup` + injected-fake store tests), existing `voice-engine` (`createSTT`, `generateTTS`, `playAudioData`, `unlockAudio`), `/api/intro`, `/api/defense/examiner`, `/api/session/[id]`.

## Global Constraints

- **Design spec:** `docs/superpowers/specs/2026-07-21-immersive-simulator-voice-first-design.md` — implements its Phase 5 (§4.1, §4.2 units 6–10, §7, **§7a opening moment**, §8, §9).
- **Liveness (§7a):** the room never opens in silence. On the user's first gesture (**Begin**) → `unlockAudio()` → the lead persona (panel[0] = Professor) speaks a short welcome from `/api/intro` (LLM 1-sentence, safe default fallback) via TTS in that persona's voice, its `AudiencePanel` card in the **speaking** state; then mic capture starts. A **Replay intro** control re-plays it. Playback failure degrades to caption + replay — never a hard error.
- **Voice-first:** no camera, no screen-share, no recording, no report UI in this phase — do not render controls for them.
- **Reuse the engine:** `createSimulationController`, `assemblePanel`, `computeMetrics`, `selectNextSpeaker` from `src/features/simulator/` (Phase 4, committed) — do not reimplement. Reuse `voice-engine` and `/api/*` endpoints unchanged (the only server touch is none this phase; `/api/intro` and `/api/defense/examiner` are used as-is).
- **Portability:** keep DOM/React only in the hook and components; the store controllers stay framework-light and injectable.
- **Soft-depth visual system:** `rounded-xl`/`rounded-2xl`, `shadow-e1/e2/e3`, `buttonVariants`, the cobalt **examination frame** for the active slide, restrained neutral surfaces + single cobalt accent — **not** colored AI-slop. Honor `prefers-reduced-motion` (global guard exists).
- **Do not touch** the legacy `RehearsalRoom`, `practice/[sessionId]` route, `studio-session-model.ts`, or its 5 dependent test files. `/practice/[id]?view=room` stays as the legacy path.
- After each task: `npm.cmd run test` green; stage only that task's named files.

---

### Task 1: Multi-persona voice controller + intro (`panel-voice.ts`)

Generalizes the tested `createExaminerVoiceController` (`src/features/defense/hooks/use-examiner-voice.ts`) to speak in each event's persona voice and to deliver the opening intro.

**Files:**
- Create: `src/features/simulator/panel-voice.ts`
- Test: `src/features/simulator/panel-voice.test.ts`

**Interfaces:**
- Consumes: `ExaminerEvent`, `TranscriptSegment` from `@/features/defense/types`; `AudioPlayResult` from `@/lib/voice-engine`.
- Produces:
  - `interface PanelVoiceState { caption: string | null; speakingPersonaId: string | null; lastEvent: ExaminerEvent | null; lastError: string | null }`
  - `createPanelVoiceController(deps): { speak(event), speakIntro(intro), replayLast(), getState(), subscribe(listener) }`
  - `usePanelVoice(deps)` hook (thin `useSyncExternalStore` wrapper, mirrors `useExaminerVoice`).
  - deps: `{ pauseCapture, resumeCapture, generateSpeech(text, voiceId), playSpeech(audio), appendSegment(seg), defaultVoiceId, now? }`.

- [ ] **Step 1: Write the failing test**

Create `src/features/simulator/panel-voice.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createPanelVoiceController } from './panel-voice';
import type { ExaminerEvent } from '@/features/defense/types';

const VOICE = 'voice-professor';
const event: ExaminerEvent = { kind: 'question', text: 'What supports this?', slideIndex: 1, evidence: 'x', occurredAtMs: 10, persona: { id: 'professor', title: 'Professor' } };

function deps(overrides = {}) {
  return {
    pauseCapture: vi.fn(), resumeCapture: vi.fn(),
    generateSpeech: vi.fn(async () => ({ audio: new Blob() })),
    playSpeech: vi.fn(async () => ({ played: true as const })),
    appendSegment: vi.fn(),
    defaultVoiceId: 'voice-default',
    now: () => 42,
    voiceForPersona: (id: string) => (id === 'professor' ? VOICE : 'voice-default'),
    ...overrides,
  };
}

describe('createPanelVoiceController', () => {
  it('speaks an examiner event in its persona voice, pausing then resuming capture', async () => {
    const d = deps();
    const c = createPanelVoiceController(d);
    await c.speak(event);
    expect(d.pauseCapture).toHaveBeenCalledOnce();
    expect(d.generateSpeech).toHaveBeenCalledWith(event.text, VOICE);
    expect(d.resumeCapture).toHaveBeenCalledOnce();
    expect(c.getState().caption).toBe(event.text);
    expect(c.getState().speakingPersonaId).toBe(null); // cleared after speaking
  });

  it('falls back to the default voice when the event has no persona', async () => {
    const d = deps();
    const c = createPanelVoiceController(d);
    await c.speak({ ...event, persona: undefined });
    expect(d.generateSpeech).toHaveBeenCalledWith(event.text, 'voice-default');
  });

  it('plays the opening intro without appending a transcript segment', async () => {
    const d = deps();
    const c = createPanelVoiceController(d);
    await c.speakIntro({ personaId: 'professor', voiceId: VOICE, text: 'Welcome. Turn on your mic when ready.' });
    expect(d.generateSpeech).toHaveBeenCalledWith('Welcome. Turn on your mic when ready.', VOICE);
    expect(d.playSpeech).toHaveBeenCalledOnce();
    expect(d.appendSegment).not.toHaveBeenCalled(); // intro is greeting, not evidence
    expect(d.pauseCapture).not.toHaveBeenCalled(); // capture not started yet at intro time
  });

  it('surfaces a replayable error and caption when playback fails', async () => {
    const d = deps({ playSpeech: vi.fn(async () => ({ played: false as const, error: 'autoplay' as const })) });
    const c = createPanelVoiceController(d);
    await c.speak(event);
    expect(c.getState().lastError).toBeTruthy();
    expect(c.getState().caption).toBe(event.text);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/features/simulator/panel-voice.test.ts`
Expected: FAIL — cannot resolve `./panel-voice`.

- [ ] **Step 3: Write the implementation**

Create `src/features/simulator/panel-voice.ts` (structure mirrors `createExaminerVoiceController`; adds `voiceForPersona`, `speakingPersonaId`, and `speakIntro`):

```ts
'use client';

import { useRef, useSyncExternalStore } from 'react';
import type { ExaminerEvent, TranscriptSegment } from '@/features/defense/types';
import type { AudioPlayResult } from '@/lib/voice-engine';

export interface PanelVoiceState {
  caption: string | null;
  speakingPersonaId: string | null;
  lastEvent: ExaminerEvent | null;
  lastError: string | null;
}

export type PanelTranscriptSegment = TranscriptSegment & { delivery: 'audio' | 'caption-fallback' };

export interface PanelVoiceDependencies {
  pauseCapture: () => void | Promise<void>;
  resumeCapture: () => void | Promise<void>;
  generateSpeech: (text: string, voiceId: string) => Promise<unknown>;
  playSpeech: (audio: unknown) => Promise<AudioPlayResult>;
  appendSegment: (segment: PanelTranscriptSegment) => void | Promise<void>;
  defaultVoiceId: string;
  voiceForPersona?: (personaId: string) => string;
  now?: () => number;
}

const replayError = 'Audio could not play. Use replay to try again.';

export function createPanelVoiceController(deps: PanelVoiceDependencies) {
  let state: PanelVoiceState = { caption: null, speakingPersonaId: null, lastEvent: null, lastError: null };
  const attempted = new Set<string>();
  const failedAppend = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const setState = (next: Partial<PanelVoiceState>) => { state = { ...state, ...next }; emit(); };
  const voiceFor = (personaId: string | undefined) =>
    (personaId && deps.voiceForPersona?.(personaId)) || deps.defaultVoiceId;
  const eventKey = (e: ExaminerEvent) => [e.kind, e.slideIndex, e.occurredAtMs, e.text, e.evidence].join('|');

  const appendOnce = async (event: ExaminerEvent, delivery: PanelTranscriptSegment['delivery']): Promise<boolean> => {
    const key = eventKey(event);
    if (attempted.has(key)) return !failedAppend.has(key);
    attempted.add(key);
    try {
      await deps.appendSegment({
        role: 'examiner', slideIndex: event.slideIndex, text: event.text,
        startedAtMs: event.occurredAtMs, endedAtMs: deps.now?.() ?? event.occurredAtMs, delivery,
      });
      return true;
    } catch {
      failedAppend.add(key);
      return false;
    }
  };

  const speak = async (event: ExaminerEvent): Promise<AudioPlayResult> => {
    await deps.pauseCapture();
    setState({ caption: event.text, speakingPersonaId: event.persona?.id ?? null, lastEvent: event, lastError: null });
    try {
      const audio = await deps.generateSpeech(event.text, voiceFor(event.persona?.id));
      const result = await deps.playSpeech(audio);
      if (result.played) {
        if (!(await appendOnce(event, 'audio'))) { setState({ lastError: replayError }); return { played: false, error: 'playback' }; }
        return result;
      }
      await appendOnce(event, 'caption-fallback');
      setState({ lastError: replayError });
      return result;
    } catch {
      await appendOnce(event, 'caption-fallback');
      setState({ lastError: replayError });
      return { played: false, error: 'playback' };
    } finally {
      setState({ speakingPersonaId: null });
      await deps.resumeCapture();
    }
  };

  const speakIntro = async (intro: { personaId: string; voiceId: string; text: string }): Promise<AudioPlayResult> => {
    setState({ caption: intro.text, speakingPersonaId: intro.personaId, lastError: null });
    try {
      const audio = await deps.generateSpeech(intro.text, intro.voiceId);
      const result = await deps.playSpeech(audio);
      if (!result.played) setState({ lastError: replayError });
      return result;
    } catch {
      setState({ lastError: replayError });
      return { played: false, error: 'playback' };
    } finally {
      setState({ speakingPersonaId: null });
    }
  };

  return {
    speak,
    speakIntro,
    replayLast: async () => (state.lastEvent ? speak(state.lastEvent) : ({ played: false, error: 'playback' } as AudioPlayResult)),
    getState: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

export function usePanelVoice(deps: PanelVoiceDependencies) {
  const ref = useRef<ReturnType<typeof createPanelVoiceController> | null>(null);
  if (!ref.current) ref.current = createPanelVoiceController(deps);
  const controller = ref.current;
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  return { ...controller, state };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- src/features/simulator/panel-voice.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/panel-voice.ts src/features/simulator/panel-voice.test.ts
git commit -m "feat: add multi-persona panel voice controller with opening intro"
```

---

### Task 2: Intro request/response helpers (`intro.ts`)

**Files:**
- Create: `src/features/simulator/intro.ts`
- Test: `src/features/simulator/intro.test.ts`

**Interfaces:**
- Consumes: `Persona` from `./personas`.
- Produces:
  - `leadPersona(panel: Persona[]): Persona` — `panel[0]`.
  - `buildIntroRequest(title: string, panel: Persona[]): { title: string; judges: Array<{ id: string; title: string }> }`.
  - `parseIntroResponse(data: unknown, panel: Persona[]): { text: string; voiceId: string; personaId: string }` — maps the returned `judgeId`/`voice` to the lead persona, with a safe default welcome + lead voice when the response is malformed.

- [ ] **Step 1: Write the failing test**

Create `src/features/simulator/intro.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildIntroRequest, leadPersona, parseIntroResponse } from './intro';
import { assemblePanel } from './personas';

const panel = assemblePanel();

describe('intro helpers', () => {
  it('names the lead persona as the first panel member', () => {
    expect(leadPersona(panel).id).toBe('professor');
  });

  it('builds an intro request with the title and the panel as judges', () => {
    const req = buildIntroRequest('My Defense', panel);
    expect(req.title).toBe('My Defense');
    expect(req.judges).toEqual(panel.map((p) => ({ id: p.id, title: p.title })));
  });

  it('parses a valid intro response into text + lead voice', () => {
    const parsed = parseIntroResponse({ text: 'Welcome to your defense.', voice: 'v1', judgeId: 'professor' }, panel);
    expect(parsed.text).toBe('Welcome to your defense.');
    expect(parsed.voiceId).toBe('v1');
    expect(parsed.personaId).toBe('professor');
  });

  it('falls back to a default welcome and the lead persona voice on a malformed response', () => {
    const parsed = parseIntroResponse(null, panel);
    expect(parsed.text.length).toBeGreaterThan(0);
    expect(parsed.text.toLowerCase()).toContain('microphone');
    expect(parsed.voiceId).toBe(leadPersona(panel).voiceId);
    expect(parsed.personaId).toBe('professor');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/features/simulator/intro.test.ts`
Expected: FAIL — cannot resolve `./intro`.

- [ ] **Step 3: Write the implementation**

Create `src/features/simulator/intro.ts`:

```ts
import type { Persona } from './personas';

const DEFAULT_WELCOME = 'Welcome. Take a breath — turn on your microphone whenever you are ready to begin.';

export function leadPersona(panel: Persona[]): Persona {
  if (panel.length === 0) throw new Error('leadPersona requires a non-empty panel');
  return panel[0];
}

export function buildIntroRequest(title: string, panel: Persona[]): { title: string; judges: Array<{ id: string; title: string }> } {
  return { title, judges: panel.map((p) => ({ id: p.id, title: p.title })) };
}

export function parseIntroResponse(data: unknown, panel: Persona[]): { text: string; voiceId: string; personaId: string } {
  const lead = leadPersona(panel);
  const record = (data && typeof data === 'object') ? data as Record<string, unknown> : {};
  const text = typeof record.text === 'string' && record.text.trim().length > 0 ? record.text.trim() : DEFAULT_WELCOME;
  const voiceId = typeof record.voice === 'string' && record.voice.trim().length > 0 ? record.voice.trim() : lead.voiceId;
  return { text, voiceId, personaId: lead.id };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- src/features/simulator/intro.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/intro.ts src/features/simulator/intro.test.ts
git commit -m "feat: add simulator intro request/response helpers"
```

---

### Task 3: `SlideStage` + `SimulatorToolbar` (presentational)

**Files:**
- Create: `src/features/simulator/SlideStage.tsx`, `src/features/simulator/SimulatorToolbar.tsx`
- Test: `src/features/simulator/SlideStage.test.tsx`, `src/features/simulator/SimulatorToolbar.test.tsx`

**Interfaces:**
- `SlideStage(props: { slide: { index: number; text: string; imageUrl: string }; position: number; total: number; onPrev: () => void; onNext: () => void })` — the examination-frame hero slide + mono index badge + prev/next (prev disabled at 0, next disabled at total-1).
- `SimulatorToolbar(props: { micActive: boolean; onToggleMic: () => void; onToggleParticipants: () => void; onToggleTranscript: () => void; onEnd: () => void; endDisabled?: boolean })` — floating pill: mic, participants, transcript, End (destructive).

- [ ] **Step 1: Write the failing tests**

Create `src/features/simulator/SlideStage.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SlideStage } from './SlideStage';

const slide = { index: 3, text: 'Our method compares A and B.', imageUrl: '/s/3.png' };

describe('SlideStage', () => {
  it('renders the active slide inside the examination frame with a mono index badge and nav', () => {
    const html = renderToStaticMarkup(<SlideStage slide={slide} position={2} total={5} onPrev={() => undefined} onNext={() => undefined} />);
    expect(html).toContain('aria-label="Active presentation slide"');
    expect(html).toContain('before:bg-gradient-to-r'); // examination frame top edge
    expect(html).toContain('03 / 05'); // mono index badge
    expect(html).toContain('aria-label="Previous slide"');
    expect(html).toContain('aria-label="Next slide"');
  });

  it('disables previous on the first slide and next on the last', () => {
    const first = renderToStaticMarkup(<SlideStage slide={slide} position={0} total={5} onPrev={() => undefined} onNext={() => undefined} />);
    expect(first).toMatch(/aria-label="Previous slide"[^>]*disabled/);
    const last = renderToStaticMarkup(<SlideStage slide={slide} position={4} total={5} onPrev={() => undefined} onNext={() => undefined} />);
    expect(last).toMatch(/aria-label="Next slide"[^>]*disabled/);
  });
});
```

Create `src/features/simulator/SimulatorToolbar.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SimulatorToolbar } from './SimulatorToolbar';

describe('SimulatorToolbar', () => {
  it('renders mic, participants, transcript, and a destructive End control', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).toContain('aria-label="Mute microphone"'); // active => offers mute
    expect(html).toContain('aria-label="Show participants"');
    expect(html).toContain('aria-label="Show transcript"');
    expect(html).toContain('End rehearsal');
  });

  it('labels the mic control to turn on when inactive', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar micActive={false} onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).toContain('aria-label="Turn on microphone"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd run test -- src/features/simulator/SlideStage.test.tsx src/features/simulator/SimulatorToolbar.test.tsx`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Write the components**

Create `src/features/simulator/SlideStage.tsx`:

```tsx
'use client';

import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SlideStage({ slide, position, total, onPrev, onNext }: {
  slide: { index: number; text: string; imageUrl: string };
  position: number; total: number; onPrev: () => void; onNext: () => void;
}) {
  return (
    <section aria-label="Active presentation slide" className="flex min-w-0 flex-col gap-3">
      <div className="relative rounded-2xl border border-border bg-card p-2 shadow-e2 before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary before:to-transparent after:absolute after:inset-0 after:-z-10 after:rounded-2xl after:bg-primary/10 after:blur-2xl">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-muted/30">
          <AuthenticatedSlideImage source={slide.imageUrl} alt={`Slide ${position + 1}: ${slide.text}`} className="h-full w-full object-contain" />
          <span className="absolute right-3 top-3 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] backdrop-blur">
            {String(position + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate px-1 text-sm text-muted-foreground">{slide.text}</p>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label="Previous slide" onClick={onPrev} disabled={position === 0} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>Prev</button>
          <button type="button" aria-label="Next slide" onClick={onNext} disabled={position >= total - 1} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>Next</button>
        </div>
      </div>
    </section>
  );
}
```

Create `src/features/simulator/SimulatorToolbar.tsx`:

```tsx
'use client';

import { Mic, MicOff, Users, Captions, PhoneOff } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SimulatorToolbar({ micActive, onToggleMic, onToggleParticipants, onToggleTranscript, onEnd, endDisabled }: {
  micActive: boolean; onToggleMic: () => void; onToggleParticipants: () => void; onToggleTranscript: () => void; onEnd: () => void; endDisabled?: boolean;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-popover/90 px-3 py-2 shadow-e3 backdrop-blur-xl">
      <button type="button" aria-label={micActive ? 'Mute microphone' : 'Turn on microphone'} onClick={onToggleMic}
        className={cn(buttonVariants({ variant: micActive ? 'default' : 'secondary', size: 'icon' }), 'rounded-full')}>
        {micActive ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}
      </button>
      <button type="button" aria-label="Show participants" onClick={onToggleParticipants} className={cn(buttonVariants({ variant: 'secondary', size: 'icon' }), 'rounded-full')}>
        <Users className="size-4" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Show transcript" onClick={onToggleTranscript} className={cn(buttonVariants({ variant: 'secondary', size: 'icon' }), 'rounded-full')}>
        <Captions className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onEnd} disabled={endDisabled} className={cn(buttonVariants({ variant: 'destructive', size: 'sm' }), 'rounded-full')}>
        <PhoneOff className="size-4" aria-hidden="true" /> End rehearsal
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm.cmd run test -- src/features/simulator/SlideStage.test.tsx src/features/simulator/SimulatorToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/SlideStage.tsx src/features/simulator/SlideStage.test.tsx src/features/simulator/SimulatorToolbar.tsx src/features/simulator/SimulatorToolbar.test.tsx
git commit -m "feat: add SlideStage and SimulatorToolbar UI units"
```

---

### Task 4: `AudiencePanel` + `TranscriptPanel` (presentational)

**Files:**
- Create: `src/features/simulator/AudiencePanel.tsx`, `src/features/simulator/TranscriptPanel.tsx`
- Test: `src/features/simulator/AudiencePanel.test.tsx`, `src/features/simulator/TranscriptPanel.test.tsx`

**Interfaces:**
- `AudiencePanel(props: { panel: Persona[]; speakingPersonaId: string | null; caption: string | null })` — one card per persona; the speaking persona shows a **speaking** ring + the caption, others **listening**.
- `TranscriptPanel(props: { segments: TranscriptSegment[]; interim: string; metrics: SpeechMetrics })` — running metrics chips (WPM, fillers) + committed lines (presenter vs examiner) + the live interim line.

- [ ] **Step 1: Write the failing tests**

Create `src/features/simulator/AudiencePanel.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AudiencePanel } from './AudiencePanel';
import { assemblePanel } from './personas';

const panel = assemblePanel();

describe('AudiencePanel', () => {
  it('renders a card for every panel member with its title and focus', () => {
    const html = renderToStaticMarkup(<AudiencePanel panel={panel} speakingPersonaId={null} caption={null} />);
    for (const p of panel) { expect(html).toContain(p.title); expect(html).toContain(p.focus); }
    expect(html).toContain('aria-label="Audience panel"');
  });

  it('marks the speaking persona and shows the caption; others listen', () => {
    const html = renderToStaticMarkup(<AudiencePanel panel={panel} speakingPersonaId="professor" caption="Walk me through your method." />);
    expect(html).toContain('data-state="speaking"');
    expect(html).toContain('data-state="listening"');
    expect(html).toContain('Walk me through your method.');
  });
});
```

Create `src/features/simulator/TranscriptPanel.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TranscriptPanel } from './TranscriptPanel';
import type { TranscriptSegment } from '@/features/defense/types';

const segments: TranscriptSegment[] = [
  { role: 'presenter', slideIndex: 1, text: 'We measured retention.', startedAtMs: 0, endedAtMs: 2000 },
  { role: 'examiner', slideIndex: 1, text: 'How was it measured?', startedAtMs: 2000, endedAtMs: 4000 },
];
const metrics = { wordCount: 3, spokenMs: 2000, wpm: 90, fillerCount: 1, fillerRate: 0.33 };

describe('TranscriptPanel', () => {
  it('shows running metrics chips and both roles of committed lines', () => {
    const html = renderToStaticMarkup(<TranscriptPanel segments={segments} interim="" metrics={metrics} />);
    expect(html).toContain('90'); // wpm value
    expect(html).toContain('WPM');
    expect(html).toContain('Fillers');
    expect(html).toContain('We measured retention.');
    expect(html).toContain('How was it measured?');
    expect(html).toContain('aria-label="Live transcript"');
  });

  it('shows the live interim line while speaking', () => {
    const html = renderToStaticMarkup(<TranscriptPanel segments={[]} interim="and the results show" metrics={metrics} />);
    expect(html).toContain('and the results show');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd run test -- src/features/simulator/AudiencePanel.test.tsx src/features/simulator/TranscriptPanel.test.tsx`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Write the components**

Create `src/features/simulator/AudiencePanel.tsx`:

```tsx
'use client';

import type { Persona } from './personas';
import { cn } from '@/lib/utils';

export function AudiencePanel({ panel, speakingPersonaId, caption }: {
  panel: Persona[]; speakingPersonaId: string | null; caption: string | null;
}) {
  return (
    <section aria-label="Audience panel" className="flex flex-col gap-3">
      {panel.map((persona) => {
        const speaking = persona.id === speakingPersonaId;
        return (
          <div key={persona.id} data-state={speaking ? 'speaking' : 'listening'}
            className={cn('rounded-xl border bg-card p-4 shadow-e1 transition-colors',
              speaking ? 'border-primary shadow-e2 ring-1 ring-primary/40' : 'border-border')}>
            <div className="flex items-center gap-3">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                speaking ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                {persona.title.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{persona.title}</p>
                <p className="truncate text-xs text-muted-foreground">{persona.focus}</p>
              </div>
              <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                {speaking ? 'Speaking' : 'Listening'}
              </span>
            </div>
            {speaking && caption && <p className="mt-3 text-sm leading-6">{caption}</p>}
          </div>
        );
      })}
    </section>
  );
}
```

Create `src/features/simulator/TranscriptPanel.tsx`:

```tsx
'use client';

import type { TranscriptSegment } from '@/features/defense/types';
import type { SpeechMetrics } from './metrics';
import { cn } from '@/lib/utils';

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <span className="font-mono text-foreground">{value}</span> {label}
    </span>
  );
}

export function TranscriptPanel({ segments, interim, metrics }: {
  segments: TranscriptSegment[]; interim: string; metrics: SpeechMetrics;
}) {
  return (
    <section aria-label="Live transcript" className="flex min-h-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-e1">
      <div className="flex flex-wrap gap-2">
        <Chip label="WPM" value={String(metrics.wpm)} />
        <Chip label="Fillers" value={String(metrics.fillerCount)} />
      </div>
      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {segments.map((segment, index) => (
          <li key={index} className={cn('rounded-lg px-3 py-2 text-sm leading-6',
            segment.role === 'presenter' ? 'bg-surface' : 'bg-accent/60 text-accent-foreground')}>
            <span className="mr-2 text-[11px] font-medium uppercase text-muted-foreground">{segment.role === 'presenter' ? 'You' : 'Panel'}</span>
            {segment.text}
          </li>
        ))}
        {interim && <li className="rounded-lg px-3 py-2 text-sm italic leading-6 text-muted-foreground">{interim}</li>}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm.cmd run test -- src/features/simulator/AudiencePanel.test.tsx src/features/simulator/TranscriptPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/AudiencePanel.tsx src/features/simulator/AudiencePanel.test.tsx src/features/simulator/TranscriptPanel.tsx src/features/simulator/TranscriptPanel.test.tsx
git commit -m "feat: add AudiencePanel and TranscriptPanel UI units"
```

---

### Task 5: `use-simulation-engine.ts` — the engine hook (integration; in-browser verified)

Binds the tested `createSimulationController` to real IO (mic STT, per-persona TTS via `panel-voice`, timers, live metrics) and owns the **opening intro** flow. Mirrors the wiring in the legacy `RehearsalRoom` (`src/features/defense/components/rehearsal-room.tsx`), generalized to the panel + intro. No jsdom in this repo, so the hook body is verified by driving the app; the plan ships it complete and correct.

**Files:**
- Create: `src/features/simulator/use-simulation-engine.ts`

**Interface produced:**
```ts
type SimulationPhase = 'ready' | 'introducing' | 'live' | 'ended';
useSimulationEngine(session, { onComplete }): {
  phase, slide, position, total, captureState, micActive,
  panel, speakingPersonaId, caption, events, interim, metrics,
  error, begin(), toggleMic(), changeSlide(pos), end(), replayIntro(), canFinish, finish(),
}
```

- [ ] **Step 1: Write the implementation**

Create `src/features/simulator/use-simulation-engine.ts`:

```ts
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { createSTT, generateTTS, playAudioData, unlockAudio } from '@/lib/voice-engine';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';
import { analyseReading } from '@/features/defense/reading-analysis';
import { spokenBySlide } from '@/features/defense/transcript';
import { createSimulationController } from './simulation-controller';
import { createPanelVoiceController } from './panel-voice';
import { assemblePanel, type Persona } from './personas';
import { computeMetrics } from './metrics';
import { buildIntroRequest, parseIntroResponse } from './intro';

type SimSession = { id: string; deck: DeckContext; mode: DefenseMode; stance: ExaminerStance; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; status: string };
type STTHandle = Awaited<ReturnType<typeof createSTT>>;
export type SimulationPhase = 'ready' | 'introducing' | 'live' | 'ended';

export function useSimulationEngine(session: SimSession, { onComplete }: { onComplete: () => void }) {
  const [, render] = useState(0);
  const rerender = useCallback(() => render((v) => v + 1), []);
  const [phase, setPhase] = useState<SimulationPhase>('ready');
  const [interim, setInterim] = useState('');
  const [captureState, setCaptureState] = useState<'idle' | 'listening' | 'paused'>('idle');
  const [error, setError] = useState<string | null>(null);

  const panel = useMemo<Persona[]>(() => assemblePanel(), []);
  const voiceForPersona = useCallback((id: string) => panel.find((p) => p.id === id)?.voiceId ?? panel[0].voiceId, [panel]);

  const captureRef = useRef<STTHandle | null>(null);
  const pendingCommitRef = useRef<Promise<unknown>>(Promise.resolve());
  const startedAtRef = useRef(0);
  const controllerRef = useRef<ReturnType<typeof createSimulationController> | null>(null);
  const voiceRef = useRef<ReturnType<typeof createPanelVoiceController> | null>(null);

  const stopCapture = useCallback(async () => {
    const capture = captureRef.current; captureRef.current = null;
    if (capture) await capture.stop();
    await pendingCommitRef.current;
    setInterim('');
  }, []);

  const startCapture = useCallback(async (start: { slideIndex: number; startedAtMs: number }) => {
    setError(null);
    try {
      const controller = controllerRef.current; if (!controller) return;
      captureRef.current = await createSTT(setInterim, (text) => {
        const segment: TranscriptSegment = { role: 'presenter', slideIndex: start.slideIndex, text: text.trim(), startedAtMs: start.startedAtMs, endedAtMs: Math.max(start.startedAtMs, Date.now() - startedAtRef.current) };
        pendingCommitRef.current = controller.commit(segment);
      });
      captureRef.current.start();
      setCaptureState('listening');
    } catch {
      setCaptureState('idle');
      setError('Microphone access was unavailable. Check permission and retry.');
    }
  }, []);

  const pauseCapture = useCallback(async () => { setCaptureState('paused'); await stopCapture(); }, [stopCapture]);
  const resumeCapture = useCallback(async () => {
    const controller = controllerRef.current; if (!controller) return;
    const state = controller.getState();
    if (state.started && !state.ended) await startCapture({ slideIndex: state.slideIndex, startedAtMs: Math.max(0, Date.now() - startedAtRef.current) });
  }, [startCapture]);

  if (!voiceRef.current) {
    voiceRef.current = createPanelVoiceController({
      pauseCapture, resumeCapture, generateSpeech: generateTTS, playSpeech: playAudioData,
      appendSegment: async (segment) => { await controllerRef.current?.appendExaminerSegment(segment); },
      defaultVoiceId: panel[0].voiceId, voiceForPersona, now: () => Math.max(0, Date.now() - startedAtRef.current),
    });
    voiceRef.current.subscribe(rerender);
  }
  const voice = voiceRef.current;

  if (!controllerRef.current) {
    controllerRef.current = createSimulationController({
      mode: session.mode, panel, now: () => Date.now(),
      initialSlideIndex: session.deck.slides[0].index, initialSegments: session.transcriptSegments, initialEvents: session.examinerEvents,
      persist: async (segments, events, status) => {
        const response = await authenticatedFetch(`/api/session/${session.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcriptSegments: segments, examinerEvents: events, status }) });
        if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(typeof body.error === 'string' ? body.error : 'Your rehearsal could not be saved. Retry before finishing.'); }
      },
      startCapture, stopCapture,
      requestTurn: async (segment, persona) => {
        const state = controllerRef.current!.getState();
        const evidence = analyseReading(session.deck.slides, spokenBySlide(state.segments)).find((item) => item.slideIndex === segment.slideIndex);
        const response = await authenticatedFetch('/api/defense/examiner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.id, currentSegment: segment, readingEvidence: evidence, persona: { id: persona.id, title: persona.title, promptFragment: persona.promptFragment } }) });
        const body = await response.json().catch(() => ({}));
        return response.ok && body.event ? body.event as ExaminerEvent : null;
      },
      speak: voice.speak, onComplete, onChange: rerender,
    });
  }
  const controller = controllerRef.current;
  const state = controller.getState();
  const voiceState = voice.getState();

  const position = Math.max(0, session.deck.slides.findIndex((s) => s.index === state.slideIndex));
  const slide = session.deck.slides[position];
  const metrics = useMemo(() => computeMetrics(state.segments), [state.segments]);

  const begin = useCallback(async () => {
    unlockAudio();
    startedAtRef.current = Date.now();
    setPhase('introducing');
    try {
      const res = await authenticatedFetch('/api/intro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildIntroRequest(session.deck.sourceName, panel)) });
      const intro = parseIntroResponse(await res.json().catch(() => null), panel);
      await voice.speakIntro(intro);
    } catch { /* intro is best-effort; never blocks the rehearsal */ }
    setPhase('live');
    await controller.start();
  }, [controller, panel, session.deck.sourceName, voice]);

  const replayIntro = useCallback(async () => {
    const res = await authenticatedFetch('/api/intro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildIntroRequest(session.deck.sourceName, panel)) }).catch(() => null);
    const intro = parseIntroResponse(res ? await res.json().catch(() => null) : null, panel);
    await voice.speakIntro(intro);
  }, [panel, session.deck.sourceName, voice]);

  const toggleMic = useCallback(async () => {
    if (captureState === 'listening') { setCaptureState('paused'); await stopCapture(); }
    else { await startCapture({ slideIndex: state.slideIndex, startedAtMs: Math.max(0, Date.now() - startedAtRef.current) }); }
  }, [captureState, startCapture, state.slideIndex, stopCapture]);

  const changeSlide = useCallback(async (pos: number) => { await controller.changeSlide(session.deck.slides[pos].index); }, [controller, session.deck.slides]);
  const end = useCallback(async () => { try { await controller.end(); setCaptureState('idle'); setPhase(controller.getState().ended ? 'ended' : 'live'); } catch (e) { setError(e instanceof Error ? e.message : 'Your rehearsal could not be saved.'); } }, [controller]);

  return {
    phase, slide, position, total: session.deck.slides.length, captureState, micActive: captureState === 'listening',
    panel, speakingPersonaId: voiceState.speakingPersonaId, caption: voiceState.caption, events: state.events, transcript: state.segments, interim, metrics,
    error: error ?? voiceState.lastError, begin, toggleMic, changeSlide, end, replayIntro,
    canFinish: controller.canFinish(), finish: controller.finish,
  };
}
```

- [ ] **Step 2: Typecheck the hook in isolation**

Run: `npm.cmd run build`
Expected: exit 0 (no type errors in the new hook; the hook is not yet imported by a route, so this only proves it compiles — behavior is verified in Task 6's in-browser walkthrough).

- [ ] **Step 3: Commit**

```bash
git add src/features/simulator/use-simulation-engine.ts
git commit -m "feat: add use-simulation-engine hook binding controller to mic, voices, and intro"
```

---

### Task 6: `SimulatorRoom` + `/rehearse/[sessionId]` route + repoint (integration; in-browser verified)

**Files:**
- Create: `src/features/simulator/SimulatorRoom.tsx`, `src/app/rehearse/[sessionId]/page.tsx`
- Modify: `src/app/decks/new/page.tsx` (repoint "Start rehearsal" → `/rehearse/[id]`), `src/app/decks/new/page.test.tsx` (update the route-target lock)

- [ ] **Step 1: Update the Phase-3 route test to the new target**

In `src/app/decks/new/page.test.tsx`, change the one-shot navigation assertions from the practice room to the immersive room:

```tsx
  it('creates a fully-configured session and enters the immersive room in one step', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/decks/new/page.tsx'), 'utf8');
    expect(source).toContain('/rehearse/');
    expect(source).not.toContain('?view=setup');
    expect(source).toContain('buildRehearseSessionPayload');
  });
```

(Replace the previous `expect(source).toContain('?view=room')` test body with the above; keep the rest of the file unchanged.)

- [ ] **Step 2: Repoint the create navigation**

In `src/app/decks/new/page.tsx`, change the success navigation:

```tsx
      router.push(`/rehearse/${data.sessionId}`);
```

(from `router.push(\`/practice/${data.sessionId}?view=room\`)`).

- [ ] **Step 3: Write `SimulatorRoom`**

Create `src/features/simulator/SimulatorRoom.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';
import { useSimulationEngine } from './use-simulation-engine';
import { SlideStage } from './SlideStage';
import { AudiencePanel } from './AudiencePanel';
import { TranscriptPanel } from './TranscriptPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SimSession = { id: string; deck: DeckContext; mode: DefenseMode; stance: ExaminerStance; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; status: string };

export function SimulatorRoom({ session, onComplete }: { session: SimSession; onComplete: () => void }) {
  const engine = useSimulationEngine(session, { onComplete });
  const [showTranscript, setShowTranscript] = useState(true);
  const [showParticipants, setShowParticipants] = useState(true);

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
        <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Exit rehearsal</a>
        <p className="min-w-0 truncate text-sm font-medium">{session.deck.sourceName}</p>
        <span className="text-sm text-muted-foreground">Slide {engine.position + 1} / {engine.total}</span>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] flex-1 gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-6">
        <div className="flex min-w-0 flex-col gap-4">
          <SlideStage slide={engine.slide} position={engine.position} total={engine.total} onPrev={() => void engine.changeSlide(Math.max(0, engine.position - 1))} onNext={() => void engine.changeSlide(Math.min(engine.total - 1, engine.position + 1))} />
          {showTranscript && <div className="lg:hidden"><TranscriptPanel segments={engine.transcript} interim={engine.interim} metrics={engine.metrics} /></div>}
        </div>
        <aside className="flex flex-col gap-4">
          {showParticipants && <AudiencePanel panel={engine.panel} speakingPersonaId={engine.speakingPersonaId} caption={engine.caption} />}
          {showTranscript && <div className="hidden lg:block"><TranscriptPanel segments={engine.transcript} interim={engine.interim} metrics={engine.metrics} /></div>}
          {engine.error && <p role="alert" className="text-sm text-destructive">{engine.error}</p>}
        </aside>
      </main>

      {engine.phase === 'ready' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-xl">
          <p className="max-w-md text-center text-sm text-muted-foreground">Your panel is ready. When you press Begin, they will welcome you — then start presenting whenever you are ready.</p>
          <button type="button" onClick={() => void engine.begin()} className={cn(buttonVariants({ size: 'lg' }))}>Begin</button>
        </div>
      )}

      <footer className="pointer-events-none sticky bottom-0 flex justify-center p-4">
        <SimulatorToolbar micActive={engine.micActive} onToggleMic={() => void engine.toggleMic()} onToggleParticipants={() => setShowParticipants((v) => !v)} onToggleTranscript={() => setShowTranscript((v) => !v)} onEnd={() => void engine.end()} endDisabled={engine.phase !== 'live'} />
      </footer>

      {engine.phase === 'ended' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Rehearsal complete.</p>
          <button type="button" disabled={!engine.canFinish} onClick={engine.finish} className={cn(buttonVariants({ size: 'lg' }))}>See your report</button>
        </div>
      )}
    </div>
  );
}
```

> Implementer note: `useSimulationEngine` (Task 5) returns `transcript: state.segments` — `SimulatorRoom` reads `engine.transcript` directly (the controller's ordered segments); do not fabricate ordering.

- [ ] **Step 4: Write the route**

Create `src/app/rehearse/[sessionId]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SimulatorRoom } from '@/features/simulator/SimulatorRoom';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';
import { defenseDeckSchema, examinerEventsSchema, transcriptSegmentsSchema } from '@/features/defense/session-schema';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

type SimSession = { id: string; deck: DeckContext; mode: DefenseMode; stance: ExaminerStance; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; status: string };

function parseSession(value: unknown): SimSession | null {
  if (!value || typeof value !== 'object' || !('defense' in value)) return null;
  const d = (value as { defense: unknown }).defense;
  if (!d || typeof d !== 'object') return null;
  const s = d as Record<string, unknown>;
  const deck = defenseDeckSchema.safeParse(s.deck);
  const segments = transcriptSegmentsSchema.safeParse(s.transcriptSegments);
  const events = examinerEventsSchema.safeParse(s.examinerEvents);
  if (!deck.success || !segments.success || !events.success) return null;
  if (s.mode !== 'diagnostic' && s.mode !== 'mock') return null;
  if (s.stance !== 'rigorous' && s.stance !== 'supportive') return null;
  if (typeof s.id !== 'string') return null;
  return { id: s.id, deck: deck.data, mode: s.mode, stance: s.stance, transcriptSegments: segments.data, examinerEvents: events.data, status: typeof s.status === 'string' ? s.status : 'practicing' };
}

export default function RehearseRoomPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>();
  const [session, setSession] = useState<SimSession>();
  const [error, setError] = useState<string>();

  useEffect(() => { void params.then(({ sessionId: value }) => setSessionId(value)); }, [params]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    (async () => {
      try {
        const response = await authenticatedFetch(`/api/session/${sessionId}`);
        const body = await response.json();
        const parsed = response.ok ? parseSession(body) : null;
        if (!parsed) throw new Error(response.ok ? 'This rehearsal session is missing its deck.' : body.error || 'Unable to load this rehearsal.');
        if (active) setSession(parsed);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load this rehearsal.');
      }
    })();
    return () => { active = false; };
  }, [sessionId]);

  if (error) return <p role="alert" className="m-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>;
  if (!session) return <p role="status" className="p-6 text-sm text-muted-foreground">Loading your rehearsal room...</p>;
  return <SimulatorRoom session={session} onComplete={() => router.push(`/reports/${session.id}`)} />;
}
```

- [ ] **Step 5: Verify build + run the app (in-browser acceptance)**

Run: `npm.cmd run test` (expect green — the only test change is the decks/new route-target lock) and `npm.cmd run build` (exit 0).

Then run `npm.cmd run dev` and, signed in via Guest Mode:
1. New programme → upload a deck → Start rehearsal → lands on `/rehearse/<id>`.
2. The **Begin** overlay shows; press it → the lead persona **speaks a welcome** (audio), its card in the speaking state, caption visible → then mic goes live. **The room is not silent.**
3. Speak a few sentences → transcript + WPM/filler chips update → a persona challenges you in its voice.
4. Prev/Next slides, mic toggle, participants/transcript toggles, End → report route.
5. Check both themes and a 390px mobile width (audience/transcript stack; toolbar reachable).

- [ ] **Step 6: Commit**

```bash
git add src/features/simulator/SimulatorRoom.tsx src/app/rehearse/ src/app/decks/new/page.tsx src/app/decks/new/page.test.tsx
git commit -m "feat: immersive /rehearse room with live panel + opening welcome; repoint Start rehearsal"
```

---

## Self-review notes (author)

- **Spec coverage:** hook (§4.2 unit 6) ✔ Task 5; UI units 7–10 ✔ Tasks 3–4; SimulatorRoom + route (§4.1) ✔ Task 6; opening moment (§7a) ✔ Tasks 1–2 (voice + intro helpers) wired in Task 5 `begin()`/`replayIntro()` and surfaced by Task 6's Begin overlay + AudiencePanel speaking state; metrics (§6) reuse Phase 4 `computeMetrics` in Task 5; responsive (§8) in Task 6.
- **Liveness is first-class:** `begin()` fetches `/api/intro`, speaks it via `panel-voice.speakIntro` before capture starts; failure is caught and the default welcome still plays; a `replayIntro()` exists.
- **Testability honesty:** Tasks 1–4 are unit-tested (store controller with injected fakes; presentational `renderToStaticMarkup`). Tasks 5–6 are media/DOM integration verified in-browser (repo has no jsdom) — the plan ships their complete code and a concrete acceptance walkthrough.
- **Return-shape fix flagged:** Task 6 needs `engine.transcript`; Task 5's return must include `transcript: state.segments` — called out inline in Task 6 Step 3 so the implementer adds it.
- **No scope creep:** no camera/screen/record/report controls; legacy room + `studio-session-model` untouched; only `decks/new` navigation repointed (its test updated in the same task).
- **Known follow-ups (not this phase):** distinct Cartesia voice ids per persona (config fill; all currently the default); retiring the legacy controller/room when `/practice` is reconciled; the report route target (`/reports/[id]`) already exists.
