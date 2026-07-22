# Phase 6 — Audio Recording + Replay (Design)

**Status:** Approved (2026-07-22). Slice 1, Phase 6 of the Sparring Partner simulator/coaching build.
**PRD:** `docs/superpowers/specs/2026-07-21-sparring-partner-product-prd.md` (§5.2 audio recording, §5.3 audio replay, §9 phase 6).
**Branch:** `simulator-coaching`, continuing from the Phase 5 tip.

---

## 1. Goal

Persist the presenter's microphone audio for a whole rehearsal as one continuous recording, then replay it from the report. This is the first delivery of the "we have the tape" moat: the coach can point at what you actually said.

**Capture scope (decided):** presenter's **mic only** — a clean, continuous tape from `begin()` to `end()`. Mixing the AI panel's spoken questions into the recording (a full-room tape) is a deliberate **fast-follow**, not this phase. Audio only; no video (per PRD §11).

## 2. The core problem

The existing STT (`createSTT` in `src/lib/voice-engine.ts`) **cannot** be the session tape. It:

- opens its **own** `getUserMedia({ audio: true })` stream every time `startCapture` runs,
- records only a single utterance burst into a `MediaRecorder`, posts it to `/api/transcribe`, and
- **stops the stream entirely** on every `stop()` (each mic pause, and each time an AI persona speaks — which pauses capture).

So there is no continuous audio today. Phase 6 introduces a **dedicated, continuous recorder** that runs for the entire session, independent of the STT's per-utterance churn.

The persistence backend already exists and is reused unchanged in shape:

- `Session.audioPath String?` (Prisma) — nullable path to the recording.
- `POST /api/session/[id]/audio` — accepts `multipart/form-data` with an `audio` file, writes `public/recordings/{id}.webm`, sets `audioPath = /recordings/{id}.webm`. (This route currently has **no auth/ownership guard** — see §6.)

## 3. Architecture — units

Keep the simulation engine's established "injected-seam controller + thin untested DOM adapter + tested pure logic" pattern, and the PRD §11 portability tiebreaker (UI-agnostic core).

### 3.1 `src/features/simulator/session-recorder.ts` (tested)

A small controller owning exactly one continuous recording per session.

```
type RecorderSink = {
  start(): void;
  stop(): Promise<Blob>;   // resolves the assembled single blob
  release(): void;         // stop underlying mic tracks
};

createSessionRecorder(deps: {
  acquire: () => Promise<RecorderSink>;      // opens mic + MediaRecorder (injected)
  upload: (blob: Blob) => Promise<void>;      // uploadSessionAudio bound to a session id
  onError?: (message: string) => void;        // non-fatal surface
}): {
  start(): Promise<void>;   // acquire + start; start-failure is non-fatal
  stop(): Promise<void>;    // stop -> assemble -> upload -> release; idempotent
  isRecording(): boolean;
};
```

- `start()` acquires the sink and starts it. If `acquire` rejects (mic denied/unavailable), it calls `onError` and returns — the session proceeds **without** a tape. Never throws to the caller.
- `stop()` stops the sink, gets the single assembled blob, uploads it, then releases the stream. Idempotent (a second `stop()` is a no-op). Upload failure calls `onError` and still releases — never throws.
- No DOM types leak into this module beyond `Blob`; `RecorderSink` is the seam.

### 3.2 `src/features/simulator/browser-audio-recorder.ts` (thin, untested)

The DOM glue implementing `acquire(): Promise<RecorderSink>` with real `navigator.mediaDevices.getUserMedia({ audio: true })` and `new MediaRecorder(stream, { mimeType: 'audio/webm' })`, accumulating `ondataavailable` chunks and assembling them into one `Blob` on stop. Mirrors the untested-adapter convention already used by `voice-engine.ts`.

### 3.3 `src/features/simulator/upload-recording.ts` (tested)

```
uploadSessionAudio(sessionId: string, blob: Blob, fetcher = authenticatedFetch): Promise<void>
```

Builds `FormData` with field name `audio`, POSTs to `/api/session/${sessionId}/audio`, throws on non-ok. `fetch` injected for tests (verify URL, method, field name, ok→resolve, non-ok→throw).

### 3.4 `src/features/simulator/SessionAudioPlayer.tsx` (tested)

A soft-depth player card for the report.

- `audioPath` present → a titled card with a styled `<audio controls preload="metadata">` whose `<source>` is `audioPath`, plus a small caption.
- `audioPath` absent/null → honest empty state: **"No recording was captured for this session."** in the dashed empty-state recipe.
- `renderToStaticMarkup`-tested for both states and copy strings.
- Structured (a forward `ref`/`seek` seam left as a clear extension point in comments) so Phase 7 timeline-sync drops in — but **no seek behavior built now** (YAGNI).

## 4. Wiring

### 4.1 `use-simulation-engine.ts`

- Instantiate `createSessionRecorder` once (ref), with `acquire` = `browserAudioRecorder`, `upload` = `uploadSessionAudio` bound to `session.id`, `onError` → sets the hook's non-fatal `error`.
- `begin()`: after `unlockAudio()` and before/around starting the controller, call `recorder.start()` (best-effort; does not block the intro or the live phase).
- `end()`: after `controller.end()` resolves, call `recorder.stop()` (awaited, best-effort). A failed recorder/upload never prevents `phase = 'ended'` or `onComplete`.
- Expose `recording: boolean` in the hook's return.

### 4.2 `SimulatorToolbar.tsx`

A small honest **● Rec** indicator shown while `recording` is true — reinforces the "we have the tape" promise and immersion. Presentational; driven by the hook flag. `renderToStaticMarkup`-tested for presence/absence.

### 4.3 `src/app/reports/[sessionId]/page.tsx`

Extend the existing load to also read `session.audioPath` from the `/api/session/[id]` response and render `<SessionAudioPlayer audioPath={...} />` above `DefenseReportView`. Source-substring test locks the wiring. Phase 7 inherits a working player.

## 5. Data flow

```
begin()  -> unlockAudio -> recorder.start()  [continuous mic stream #2]
            (STT opens/closes its OWN stream per utterance; recorder keeps running)
...session runs...
end()    -> controller.end() (persists transcript) -> recorder.stop()
            -> assemble one Blob -> POST /api/session/[id]/audio -> audioPath saved
navigate -> /reports/[id] -> fetch session.audioPath -> SessionAudioPlayer plays /recordings/{id}.webm
```

**Two concurrent mic streams** (the STT's per-utterance stream + the recorder's continuous stream) is expected and standard — browsers permit multiple `getUserMedia` consumers of the same physical mic. Documented characteristic, not a defect.

## 6. Error handling & hardening

- **Mic denied / recorder start fails:** non-fatal `onError`; session runs tapeless; report shows the empty-state player. `begin()` never blocks on it.
- **Upload fails at `end()`:** non-fatal `onError`; still navigate to the report; `audioPath` stays null → empty-state player.
- **Idempotent `stop()`**; stream always released even on upload failure.
- **Route auth hole (in-scope fix):** `POST /api/session/[id]/audio` currently performs no identity/ownership check. Since Phase 6 builds directly on it, add the same guard the sibling session routes use: `const identity = await authenticateRequest(req); if (isAuthenticationFailure(identity)) return identity;` (from `@/lib/server-auth`), then gate the write on ownership via `db.session.findFirst({ where: { id, userId: identity.userId } })` and 404 when not found — mirroring `src/app/api/session/[id]/route.ts` PATCH/DELETE exactly. No new auth concepts.

## 7. Testing

**Unit (Vitest, node env, repo conventions):**
- `session-recorder.test.ts` — single `start`; chunks assemble to one blob; `upload` invoked with it; `release` called; idempotent `stop`; `acquire`-rejection is non-fatal (onError, no throw); `upload`-rejection is non-fatal (onError, release still called).
- `upload-recording.test.ts` — correct URL/method/`audio` field against injected fetch; ok→resolve; non-ok→throw.
- `SessionAudioPlayer.test.tsx` — with path renders `<audio>`/`<source>` + controls; without path renders empty-state copy.
- Toolbar test — Rec indicator shown iff `recording`.
- Report page — source-substring lock for audioPath→player wiring.

**Live (in-browser, honest limit per PRD §8):** record a short rehearsal → confirm `public/recordings/{id}.webm` written and `audioPath` set → open the report → recording replays. Confirm a denied mic still yields a finished session + empty-state player.

The existing full suite stays green; no test-file edits to prior phases.

## 8. Out of scope (this phase)

- Panel-voice / full-room mixing (fast-follow).
- Timeline-synced seek from findings (Phase 7 — the player leaves a seam).
- Video capture/replay (deferred, PRD §11).
- Any change to `/api/transcribe` or the STT's per-utterance flow.

## 9. Files

**New:** `src/features/simulator/session-recorder.ts` (+ test), `browser-audio-recorder.ts`, `upload-recording.ts` (+ test), `SessionAudioPlayer.tsx` (+ test).
**Edited:** `use-simulation-engine.ts`, `SimulatorToolbar.tsx` (+ test), `src/app/reports/[sessionId]/page.tsx` (+ test), `src/app/api/session/[id]/audio/route.ts` (auth guard).
**Reused unchanged in shape:** `Session.audioPath`, `POST /api/session/[id]/audio` (behavior extended with auth only), `authenticatedFetch`, soft-depth UI recipes.
