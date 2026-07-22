# Phase 6 — Audio Recording + Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the presenter's microphone audio as one continuous recording for a whole rehearsal, then replay it from the report.

**Architecture:** A dedicated, continuous session recorder decoupled from the STT (which only captures per-utterance bursts and kills its stream each pause). A pure injected-seam controller (`createSessionRecorder`) owns the lifecycle; a thin untested DOM adapter (`browser-audio-recorder`) supplies the real `getUserMedia`/`MediaRecorder`; a pure `uploadSessionAudio` posts to the existing route; a tested `SessionAudioPlayer` replays on the report. The engine hook starts the recorder on `begin()` and stops+uploads on `end()`, both best-effort/non-fatal.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Vitest (`environment: 'node'`, `renderToStaticMarkup` + injected-fake unit tests — NO jsdom), Tailwind v4 soft-depth tokens, Prisma/SQLite, `authenticatedFetch`.

**Spec:** `docs/superpowers/specs/2026-07-22-audio-recording-replay-design.md`

## Global Constraints

- Branch: `simulator-coaching`. Never stage unrelated dirty worktree files (`fetch_intro.js`, `src/lib/store.ts`, `src/components/*-section.tsx`, `src/app/api/multi-chat|score|transcribe/*`, etc.). Stage only each task's named files.
- Existing full suite (225+) stays green; **zero edits to prior phases' test files.**
- Capture scope is **presenter mic only** — no panel-voice mixing, no video.
- Tests: Vitest node env; unit logic uses injected fakes (`vi.fn()`); components use `renderToStaticMarkup` + source-substring. `renderToStaticMarkup` encodes `'`→`&#x27;`, `&`→`&amp;` — keep asserted substrings free of those characters.
- Reuse unchanged in shape: `Session.audioPath`, `POST /api/session/[id]/audio` (behavior extended with an auth guard only), `authenticatedFetch`, `buttonVariants`/`cn`, soft-depth recipes.
- Recorder core must not leak DOM types beyond `Blob`; the `RecorderSink` interface is the seam.
- Run tests with `npm.cmd run test` (do NOT pipe through `tail` — it masks the exit code). Build with `npm.cmd run build` (exit 0; Office trace-copy warning is non-fatal).

---

### Task 1: Session recorder core (`session-recorder.ts`)

**Files:**
- Create: `src/features/simulator/session-recorder.ts`
- Test: `src/features/simulator/session-recorder.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface RecorderSink { start(): void; stop(): Promise<Blob>; release(): void; }`
  - `interface SessionRecorderDeps { acquire: () => Promise<RecorderSink>; upload: (blob: Blob) => Promise<void>; onError?: (message: string) => void; }`
  - `createSessionRecorder(deps: SessionRecorderDeps): { start(): Promise<void>; stop(): Promise<void>; isRecording(): boolean; }`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { createSessionRecorder, type RecorderSink } from './session-recorder';

function sink(blob = new Blob(['audio'], { type: 'audio/webm' })): RecorderSink & { started: number; released: number } {
  const s = {
    started: 0, released: 0,
    start: vi.fn(() => { s.started += 1; }),
    stop: vi.fn(async () => blob),
    release: vi.fn(() => { s.released += 1; }),
  };
  return s as unknown as RecorderSink & { started: number; released: number };
}

describe('createSessionRecorder', () => {
  it('acquires and starts a single recording', async () => {
    const s = sink();
    const acquire = vi.fn(async () => s);
    const r = createSessionRecorder({ acquire, upload: vi.fn(async () => undefined) });
    await r.start();
    expect(acquire).toHaveBeenCalledOnce();
    expect(s.started).toBe(1);
    expect(r.isRecording()).toBe(true);
  });

  it('stops, uploads the assembled blob, and releases the stream', async () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    const s = sink(blob);
    const upload = vi.fn(async () => undefined);
    const r = createSessionRecorder({ acquire: async () => s, upload });
    await r.start();
    await r.stop();
    expect(upload).toHaveBeenCalledWith(blob);
    expect(s.released).toBe(1);
    expect(r.isRecording()).toBe(false);
  });

  it('is idempotent — a second stop does nothing', async () => {
    const s = sink();
    const upload = vi.fn(async () => undefined);
    const r = createSessionRecorder({ acquire: async () => s, upload });
    await r.start();
    await r.stop();
    await r.stop();
    expect(upload).toHaveBeenCalledOnce();
    expect(s.released).toBe(1);
  });

  it('treats an acquire failure as non-fatal — reports it and never throws', async () => {
    const onError = vi.fn();
    const r = createSessionRecorder({ acquire: async () => { throw new Error('denied'); }, upload: vi.fn(), onError });
    await expect(r.start()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
    expect(r.isRecording()).toBe(false);
  });

  it('treats an upload failure as non-fatal — reports it and still releases', async () => {
    const s = sink();
    const onError = vi.fn();
    const r = createSessionRecorder({ acquire: async () => s, upload: async () => { throw new Error('offline'); }, onError });
    await r.start();
    await expect(r.stop()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
    expect(s.released).toBe(1);
    expect(r.isRecording()).toBe(false);
  });

  it('stop before start is a no-op', async () => {
    const upload = vi.fn(async () => undefined);
    const r = createSessionRecorder({ acquire: async () => sink(), upload });
    await r.stop();
    expect(upload).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- session-recorder`
Expected: FAIL — `createSessionRecorder` not defined.

- [ ] **Step 3: Write minimal implementation**

```typescript
export interface RecorderSink {
  start(): void;
  stop(): Promise<Blob>;
  release(): void;
}

export interface SessionRecorderDeps {
  acquire: () => Promise<RecorderSink>;
  upload: (blob: Blob) => Promise<void>;
  onError?: (message: string) => void;
}

const START_ERROR = 'Recording could not start. Your rehearsal is still being captured as text.';
const UPLOAD_ERROR = 'The recording could not be saved. Your report is still ready.';

export function createSessionRecorder(deps: SessionRecorderDeps) {
  let sink: RecorderSink | null = null;
  let recording = false;

  const start = async (): Promise<void> => {
    if (recording) return;
    try {
      sink = await deps.acquire();
      sink.start();
      recording = true;
    } catch {
      sink = null;
      recording = false;
      deps.onError?.(START_ERROR);
    }
  };

  const stop = async (): Promise<void> => {
    if (!recording || !sink) return;
    const active = sink;
    sink = null;
    recording = false;
    try {
      const blob = await active.stop();
      await deps.upload(blob);
    } catch {
      deps.onError?.(UPLOAD_ERROR);
    } finally {
      active.release();
    }
  };

  return { start, stop, isRecording: () => recording };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- session-recorder`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/session-recorder.ts src/features/simulator/session-recorder.test.ts
git commit -m "feat: continuous session audio recorder core (injected-seam, non-fatal)"
```

---

### Task 2: Upload helper (`upload-recording.ts`)

**Files:**
- Create: `src/features/simulator/upload-recording.ts`
- Test: `src/features/simulator/upload-recording.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `uploadSessionAudio(sessionId: string, blob: Blob, fetcher?: typeof fetch): Promise<void>` — posts `FormData` (field `audio`) to `/api/session/${sessionId}/audio`; resolves on ok, throws on non-ok. Bound form (`(blob) => uploadSessionAudio(id, blob)`) is what Task 5 passes to the recorder's `upload` dep.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { uploadSessionAudio } from './upload-recording';

describe('uploadSessionAudio', () => {
  it('posts the blob as multipart form-data to the session audio route', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    const blob = new Blob(['x'], { type: 'audio/webm' });
    await uploadSessionAudio('sess-1', blob, fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/session/sess-1/audio');
    expect(init.method).toBe('POST');
    const form = init.body as FormData;
    expect(form.get('audio')).toBeInstanceOf(Blob);
  });

  it('throws when the server rejects the upload', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 }));
    await expect(uploadSessionAudio('sess-1', new Blob(['x']), fetcher as unknown as typeof fetch)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- upload-recording`
Expected: FAIL — `uploadSessionAudio` not defined.

- [ ] **Step 3: Write minimal implementation**

```typescript
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export async function uploadSessionAudio(
  sessionId: string,
  blob: Blob,
  fetcher: typeof fetch = authenticatedFetch,
): Promise<void> {
  const form = new FormData();
  form.append('audio', blob, `${sessionId}.webm`);
  const response = await fetcher(`/api/session/${sessionId}/audio`, { method: 'POST', body: form });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : 'Failed to upload the recording.');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- upload-recording`
Expected: PASS (2 tests).

Note: `authenticatedFetch` has the same call signature as `fetch`, so the default is type-compatible; the test injects a fake fetcher.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/upload-recording.ts src/features/simulator/upload-recording.test.ts
git commit -m "feat: uploadSessionAudio posts recording to the session audio route"
```

---

### Task 3: Browser adapter (`browser-audio-recorder.ts`)

**Files:**
- Create: `src/features/simulator/browser-audio-recorder.ts`

**Interfaces:**
- Consumes: `RecorderSink` from Task 1.
- Produces: `acquireBrowserRecorder(): Promise<RecorderSink>` — opens the mic and a continuous `MediaRecorder`, assembling one webm blob on stop. Task 5 passes this as the recorder's `acquire` dep.

This is the thin DOM adapter — **no unit test** (matches the untested-adapter convention of `src/lib/voice-engine.ts`; live media is verified in-browser at the end of the phase).

- [ ] **Step 1: Write the implementation**

```typescript
'use client';

import type { RecorderSink } from './session-recorder';

// DOM glue: one continuous mic stream + MediaRecorder for the whole session.
// Independent of the STT, which opens/closes its own per-utterance stream.
// Not unit-tested (real getUserMedia/MediaRecorder) — verified in-browser.
export async function acquireBrowserRecorder(): Promise<RecorderSink> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return {
    start: () => recorder.start(),
    stop: (): Promise<Blob> => new Promise((resolve) => {
      if (recorder.state === 'inactive') { resolve(new Blob(chunks, { type: 'audio/webm' })); return; }
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
      recorder.stop();
    }),
    release: () => stream.getTracks().forEach((t) => t.stop()),
  };
}
```

- [ ] **Step 2: Verify it type-checks with the suite**

Run: `npm.cmd run test -- session-recorder`
Expected: PASS (still 6 — this file has no test, but the run confirms it compiles under the shared tsconfig and doesn't break the recorder tests).

- [ ] **Step 3: Commit**

```bash
git add src/features/simulator/browser-audio-recorder.ts
git commit -m "feat: browser MediaRecorder adapter implementing RecorderSink"
```

---

### Task 4: Report player (`SessionAudioPlayer.tsx`)

**Files:**
- Create: `src/features/simulator/SessionAudioPlayer.tsx`
- Test: `src/features/simulator/SessionAudioPlayer.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `SessionAudioPlayer({ audioPath }: { audioPath?: string | null }): React.ReactElement` — a soft-depth card. With a path: a titled card containing `<audio controls preload="metadata">` over the path. Without: the dashed empty-state with the copy "No recording was captured for this session." Task 6 mounts it on the report page.

- [ ] **Step 1: Write the failing test**

```typescript
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SessionAudioPlayer } from './SessionAudioPlayer';

describe('SessionAudioPlayer', () => {
  it('renders an audio player over the recording path', () => {
    const html = renderToStaticMarkup(<SessionAudioPlayer audioPath="/recordings/sess-1.webm" />);
    expect(html).toContain('Session recording');
    expect(html).toContain('controls');
    expect(html).toContain('src="/recordings/sess-1.webm"');
  });

  it('renders an honest empty state when there is no recording', () => {
    const html = renderToStaticMarkup(<SessionAudioPlayer audioPath={null} />);
    expect(html).toContain('No recording was captured for this session.');
    expect(html).not.toContain('<audio');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- SessionAudioPlayer`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
export function SessionAudioPlayer({ audioPath }: { audioPath?: string | null }): React.ReactElement {
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
      {/* Phase 7 seam: expose a ref/seek here for tap-a-finding -> jump-to-mm:ss. */}
      <audio className="mt-4 w-full" controls preload="metadata">
        <source src={audioPath} type="audio/webm" />
      </audio>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- SessionAudioPlayer`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/simulator/SessionAudioPlayer.tsx src/features/simulator/SessionAudioPlayer.test.tsx
git commit -m "feat: SessionAudioPlayer with replay + honest empty state"
```

---

### Task 5: Wire recorder into the engine + Rec indicator

**Files:**
- Modify: `src/features/simulator/use-simulation-engine.ts`
- Modify: `src/features/simulator/SimulatorToolbar.tsx`
- Modify: `src/features/simulator/SimulatorToolbar.test.tsx` (add cases — this is a Phase-6 file, not a prior-phase lock)

**Interfaces:**
- Consumes: `createSessionRecorder` (Task 1), `acquireBrowserRecorder` (Task 3), `uploadSessionAudio` (Task 2).
- Produces: the hook return gains `recording: boolean`; `SimulatorToolbar` gains an optional `recording?: boolean` prop rendering a `● Rec` indicator.

- [ ] **Step 1: Write the failing toolbar test (append to existing describe)**

Add these two cases inside the existing `describe('SimulatorToolbar', …)` block in `SimulatorToolbar.test.tsx`:

```tsx
  it('shows a recording indicator while recording', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar recording micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).toContain('Rec');
    expect(html).toContain('aria-label="Recording in progress"');
  });

  it('hides the recording indicator when not recording', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar recording={false} micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).not.toContain('aria-label="Recording in progress"');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- SimulatorToolbar`
Expected: FAIL — indicator markup absent.

- [ ] **Step 3: Add the Rec indicator to the toolbar**

In `SimulatorToolbar.tsx`, add `recording` to the props type and render the indicator as the first child inside the outer `<div>` (before the mic button):

```tsx
export function SimulatorToolbar({ recording, micActive, onToggleMic, onToggleParticipants, onToggleTranscript, onEnd, endDisabled }: {
  recording?: boolean; micActive: boolean; onToggleMic: () => void; onToggleParticipants: () => void; onToggleTranscript: () => void; onEnd: () => void; endDisabled?: boolean;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-popover/90 px-3 py-2 shadow-e3 backdrop-blur-xl">
      {recording && (
        <span aria-label="Recording in progress" className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
          <span className="size-2 rounded-full bg-destructive" aria-hidden="true" /> Rec
        </span>
      )}
```

(Keep the rest of the toolbar exactly as-is.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- SimulatorToolbar`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire the recorder into the engine hook**

In `use-simulation-engine.ts`:

Add imports near the other simulator imports:

```typescript
import { createSessionRecorder } from './session-recorder';
import { acquireBrowserRecorder } from './browser-audio-recorder';
import { uploadSessionAudio } from './upload-recording';
```

Add a recorder ref beside the existing refs (after `voiceRef`):

```typescript
  const recorderRef = useRef<ReturnType<typeof createSessionRecorder> | null>(null);
  if (!recorderRef.current) {
    recorderRef.current = createSessionRecorder({
      acquire: acquireBrowserRecorder,
      upload: (blob) => uploadSessionAudio(session.id, blob),
      onError: (message) => setError(message),
    });
  }
  const recorder = recorderRef.current;
```

In `begin()`, start the recorder right after `unlockAudio()` (before the intro fetch) — best-effort, never awaited-into-failure since `start()` never throws:

```typescript
  const begin = useCallback(async () => {
    unlockAudio();
    startedAtRef.current = Date.now();
    await recorder.start();
    setPhase('introducing');
```

(Leave the rest of `begin()` unchanged; add `recorder` to its dependency array.)

In `end()`, stop+upload the recorder after the controller ends — best-effort:

```typescript
  const end = useCallback(async () => {
    try {
      await controller.end();
      await recorder.stop();
      setCaptureState('idle');
      setPhase(controller.getState().ended ? 'ended' : 'live');
    } catch (e) { setError(e instanceof Error ? e.message : 'Your rehearsal could not be saved.'); }
  }, [controller, recorder]);
```

Add `recording: recorder.isRecording()` to the returned object (next to `micActive`).

- [ ] **Step 6: Run the full suite + build**

Run: `npm.cmd run test`
Expected: PASS — full suite green (prior count + 10 new: 6 recorder + 2 upload + 2 player + 2 toolbar = but toolbar had 2, now 4; net new files add 10, toolbar adds 2). No failures.

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/features/simulator/use-simulation-engine.ts src/features/simulator/SimulatorToolbar.tsx src/features/simulator/SimulatorToolbar.test.tsx
git commit -m "feat: record session audio start->stop in the engine + Rec indicator"
```

---

### Task 6: Mount the player on the report + wire audioPath

**Files:**
- Modify: `src/app/reports/[sessionId]/page.tsx`
- Test: `src/app/reports/[sessionId]/page.test.tsx` (create if absent; if a test file already exists, append the new cases — do not alter existing assertions)

**Interfaces:**
- Consumes: `SessionAudioPlayer` (Task 4).
- Produces: report page renders `<SessionAudioPlayer audioPath={...} />` from `session.audioPath`.

- [ ] **Step 1: Check for an existing report page test**

Run: `ls src/app/reports/[sessionId]/`
If `page.test.tsx` exists, read it and append the case below into it. Otherwise create it with the full contents in Step 2.

- [ ] **Step 2: Write the failing test (source-substring lock)**

Create/extend `src/app/reports/[sessionId]/page.test.tsx`:

```tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('report page audio replay wiring', () => {
  it('reads audioPath from the session and renders the player', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/reports/[sessionId]/page.tsx'), 'utf8');
    expect(source).toContain('SessionAudioPlayer');
    expect(source).toContain('audioPath');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm.cmd run test -- reports`
Expected: FAIL — source lacks `SessionAudioPlayer`.

- [ ] **Step 4: Wire the player into the report page**

In `src/app/reports/[sessionId]/page.tsx`:

Add the import:

```tsx
import { SessionAudioPlayer } from '@/features/simulator/SessionAudioPlayer';
```

Add audio-path state near the other state:

```tsx
  const [audioPath, setAudioPath] = useState<string | null>(null);
```

Inside the existing `load()` async function, after the `stored` fetch resolves, capture the path (the `/api/session/[id]` response exposes it under `defense.audioPath` — read it defensively):

```tsx
        const path = stored.ok && typeof stored.body?.defense?.audioPath === 'string' ? stored.body.defense.audioPath : null;
        if (active) setAudioPath(path);
```

Render the player above `DefenseReportView` in the success branch. Change the returned JSX so the report branch is wrapped:

```tsx
  return (
    <AppShell active="progress">
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
      ) : report ? (
        <div className="space-y-6">
          <SessionAudioPlayer audioPath={audioPath} />
          <DefenseReportView report={report} retryHref={`/practice/${sessionId}`} />
        </div>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">Preparing your evidence-led report...</p>
      )}
    </AppShell>
  );
```

Verify the `/api/session/[id]` GET response actually includes `audioPath` under `defense`. Read `src/app/api/session/[id]/route.ts` GET handler; if `audioPath` is not in the serialized `defense` object, add it there (it is a plain scalar column — include it in the returned shape). Confirm this by reading the route before finishing.

- [ ] **Step 5: Run test + full suite**

Run: `npm.cmd run test -- reports`
Expected: PASS.

Run: `npm.cmd run test`
Expected: full suite green.

- [ ] **Step 6: Commit**

```bash
git add "src/app/reports/[sessionId]/page.tsx" "src/app/reports/[sessionId]/page.test.tsx"
git commit -m "feat: replay session recording on the report page"
```

If the GET route needed the `audioPath` field added, include it in this commit and note it in the message.

---

### Task 7: Auth-guard the audio upload route

**Files:**
- Modify: `src/app/api/session/[id]/audio/route.ts`

**Interfaces:**
- Consumes: `authenticateRequest`, `isAuthenticationFailure` from `@/lib/server-auth` (existing).
- Produces: the POST route rejects unauthenticated callers and writes only to sessions the caller owns.

- [ ] **Step 1: Read the sibling pattern**

Read `src/app/api/session/[id]/route.ts` lines around the PATCH/DELETE handlers to copy the exact guard idiom:
- `const identity = await authenticateRequest(req); if (isAuthenticationFailure(identity)) return identity;`
- ownership via `db.session.findFirst({ where: { id, userId: identity.userId } })`, returning 404 when not found.

- [ ] **Step 2: Add the guard to the audio route**

In `src/app/api/session/[id]/audio/route.ts`, add the import and guard at the top of the `try` block, before reading `formData`:

```typescript
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';
```

```typescript
    const { id } = await params;

    const identity = await authenticateRequest(req);
    if (isAuthenticationFailure(identity)) return identity;

    const owned = await db.session.findFirst({ where: { id, userId: identity.userId }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
```

Then change the final `db.session.update({ where: { id }, ... })` to `where: { id }` unchanged (ownership already enforced). Leave file-writing logic as-is.

Match the exact ownership-query shape used by the sibling route (if it uses a broader `where` to also allow unowned/guest sessions, mirror that exactly rather than inventing a stricter rule — read before writing).

- [ ] **Step 3: Verify the suite + build still pass**

Run: `npm.cmd run test`
Expected: full suite green (no test targets this route directly; this confirms nothing else broke).

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/session/[id]/audio/route.ts"
git commit -m "fix: require auth + ownership to upload session audio"
```

---

### Task 8: In-browser verification + ledger

**Files:**
- Modify: `.superpowers/sdd/progress.md`

No production code. This task proves the live-media path the unit tests cannot.

- [ ] **Step 1: Run the app and record a short rehearsal**

Start the dev server (`npm.cmd run dev`, port 3000). Guest Mode → New programme → upload a deck → Start rehearsal → Begin. Grant the mic permission when prompted. Speak a few sentences, then End rehearsal.

- [ ] **Step 2: Confirm the recording landed**

Verify `public/recordings/{sessionId}.webm` exists and is non-empty, and that `audioPath` is set on the session (check the DB or the `/api/session/[id]` response).

- [ ] **Step 3: Confirm replay**

On the report page (`/reports/[sessionId]`), confirm the `Session recording` card renders and the audio plays back what you said.

- [ ] **Step 4: Confirm graceful degradation**

Repeat a session but deny the mic permission. Confirm the session still finishes, the report loads, and the player shows "No recording was captured for this session." (audioPath null). Confirm the non-fatal error copy surfaced (not a crash).

- [ ] **Step 5: Update the progress ledger**

Append a Phase 6 section to `.superpowers/sdd/progress.md` recording: tasks + commit SHAs, full-suite/build status, the in-browser results (recording written, replay works, mic-denied degrades gracefully), and deferred follow-ups (panel-voice mix, timeline-synced seek in Phase 7).

- [ ] **Step 6: Commit**

```bash
git add .superpowers/sdd/progress.md
git commit -m "docs: record Phase 6 audio recording + replay completion"
```

---

## Self-Review

**Spec coverage:**
- §3.1 recorder core → Task 1. §3.2 adapter → Task 3. §3.3 upload → Task 2. §3.4 player → Task 4.
- §4.1 engine wiring → Task 5. §4.2 Rec indicator → Task 5. §4.3 report mount → Task 6.
- §5 data flow → Tasks 5+6 (begin→start, end→stop→upload, report→player). §6 error handling → Task 1 (non-fatal recorder) + Task 5 (onError→setError). §6 route auth → Task 7.
- §7 testing → tests in Tasks 1,2,4,5,6 + live verification in Task 8. §8 out-of-scope respected (no mixing/seek/video). §9 file list ⊆ tasks.

**Placeholder scan:** none — every code step shows full code; commands are exact; the only "read before writing" instructions (Task 6 GET shape, Task 7 ownership shape) are verification guards against a stricter-than-sibling rule, with the fallback code shown inline.

**Type consistency:** `RecorderSink { start/stop/release }`, `createSessionRecorder` return `{ start/stop/isRecording }`, `uploadSessionAudio(id, blob, fetcher?)`, `SessionAudioPlayer({ audioPath })`, toolbar `recording?` prop — all names match across Tasks 1→5→6. `acquireBrowserRecorder` returns the same `RecorderSink` Task 1 defines and Task 5 consumes.
