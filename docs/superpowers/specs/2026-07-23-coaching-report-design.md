# Phase 7 — Comprehensive Coaching Report (Design)

**Status:** Approved (2026-07-23). Slice 1, Phase 7 of the Sparring Partner simulator/coaching build.
**PRD:** `docs/superpowers/specs/2026-07-21-sparring-partner-product-prd.md` (§3 moat, §5.3 coaching report).
**Branch:** `simulator-coaching`, continuing from the Phase 6 tip (`01999cc`).

---

## 1. Goal

Turn the end-of-session report into the comprehensive, evidence-grounded coach the PRD promises: a timeline of moments pinned to `mm:ss` + slide + the exact line you said, a grounded metrics read of your delivery, each panel member's verdict, prescribed drills, and audio replay where **tapping a moment jumps the tape to that instant**. Every judgement traces to captured evidence — "we have the tape" made visible.

## 2. Decisions (binding)

- **Scored dimensions are grounded, not LLM-judged.** Computed deterministically from the capture (pace, fillers, verbatim-reading, time-per-slide, questions handled). The legacy `/api/score` is NOT used — it already 409s defense sessions and is built on the retired chat-message model. No new 0–100 model opinions.
- **Persona verdicts are grounded + one validated line.** Each persona card shows the questions/interrupts THEY actually raised (captured `ExaminerEvent.persona`) with slide + your response, plus one short verdict sentence produced by the report's **existing single LLM completion** and **validated against that persona's real events** (drop-if-unsupported; never fabricate). No extra LLM calls.
- **One generation endpoint.** Keep `/api/defense/report` as the single generator + single completion, extended — not a new endpoint.
- **Grounded report survives a weak LLM result.** Replace the current hard 502s with a graceful **minimal report** so a transcript-less or unvalidatable session still yields a usable report (timeline + metrics + replay + persona evidence).
- **Tap-to-seek ships in this phase** (realizing the seam Phase 6 left in `SessionAudioPlayer`).

## 3. Data model

No schema migration. The richer report is cached in `Session.summary` as JSON (as the defense report is today). The stored object is `{ coachingReport: CoachingReport }`. Old `{ defenseReport }` caches simply fail the new parse and are regenerated on next view (dev data; acceptable).

`CoachingReport` (new superset type + zod schema in `src/features/defense/types.ts`, additive):

```
CoachingReport {
  highestLeverage: DefenseFinding;          // unchanged
  drills: string[];                          // 1–3, from findings (was nextDrill + per-finding)
  metrics: CoachingMetrics;                  // grounded, §4
  timeline: TimelineMoment[];                // grounded, §5
  personaVerdicts: PersonaVerdict[];         // grounded + validated line, §6
  strengths: string[];                       // unchanged
  minimal: boolean;                          // true when built without validated LLM findings (§7)
}
```

The existing `DefenseReport` type and `buildDefenseReport` remain for the evidence-trail portion the new report reuses; `CoachingReport` composes them rather than deleting them.

## 4. Grounded metrics — `src/features/defense/coaching-metrics.ts` (pure, tested)

`computeCoachingMetrics({ deck, transcriptSegments, examinerEvents }): CoachingMetrics`

```
CoachingMetrics {
  paceWpm: number | null;              // presenter words / presenter speaking-minutes; null if no speech
  fillerPerMin: number | null;         // filler-word count / speaking-minutes
  verbatimSlides: number;              // slides with copied phrasing (analyseReading: hasSpeech && overlap>0 || copiedPhrases)
  slideTimes: { slideIndex: number; ms: number; atMs: number }[];  // total presenter ms per slide; atMs = first presenter segment start on that slide
  questionsHandled: { handled: number; total: number };            // events with a later presenter segment on same slide
}
```

- Reuse `computeMetrics` (`src/features/simulator/metrics.ts`) — it already returns `{ wordCount, spokenMs, wpm, fillerCount, fillerRate }`. Derive: `paceWpm = spokenMs > 0 ? wpm : null`; `fillerPerMin = spokenMs > 0 ? fillerCount / (spokenMs / 60_000) : null`. Do NOT reimplement the filler list or WPM math — call `computeMetrics`.
- Reuse `analyseReading` + `spokenBySlide` (`src/features/defense/*`) for verbatim.
- "Handled": a panel `ExaminerEvent` at `occurredAtMs` on `slideIndex` is handled iff there is a presenter `TranscriptSegment` on the same `slideIndex` with `startedAtMs > occurredAtMs`.
- Deterministic; no LLM; no DOM. Every numeric dimension that maps to a moment carries an `atMs` for seeking.

## 5. Evidence timeline — `src/features/defense/coaching-timeline.ts` (pure, tested)

`buildTimeline({ transcriptSegments, examinerEvents }): TimelineMoment[]`

```
TimelineMoment {
  atMs: number;             // for mm:ss display and audio seek
  kind: 'presenter' | 'question' | 'interrupt' | 'follow_up';
  slideIndex: number;
  text: string;             // the presenter line, or the panel question text
  personaTitle?: string;    // present for panel moments (from ExaminerEvent.persona.title)
}
```

- Merge presenter segments (`startedAtMs`, role `presenter`) and examiner events (`occurredAtMs`, `kind`) into one list sorted ascending by `atMs`; ties broken by putting the panel event after the presenter line it responds to (stable sort on atMs is sufficient).
- `mm:ss` formatting is a tiny pure helper `formatTimestamp(ms): string` (e.g. `134000 → "2:14"`), unit-tested, colocated.
- Pure; no LLM; no DOM.

## 6. Persona verdicts — `src/features/defense/persona-verdicts.ts` (pure, tested)

`buildPersonaVerdicts({ examinerEvents, transcriptSegments, verdictLines }): PersonaVerdict[]`

```
PersonaVerdict {
  personaId: string;
  personaTitle: string;
  challenges: { atMs: number; slideIndex: number; text: string; responded: boolean }[];
  verdictLine: string | null;   // validated LLM line, else null (card still renders on grounded evidence)
}
```

- Group `examinerEvents` by `persona.id`/`persona.title` (events without a persona are grouped under a neutral "Panel" bucket, or skipped — decide: skip persona-less events from persona cards but keep them in the timeline). Decision: **persona-less events are omitted from persona cards** (they still appear in the timeline).
- `responded`: same rule as "handled" in §4 (a later presenter segment on that slide).
- `verdictLines: Record<personaId, string>` comes from the report route (§7). `buildPersonaVerdicts` only ASSEMBLES + attaches already-validated lines; it does not itself call the LLM. Validation lives in the route so the pure module stays LLM-free.

## 7. Report route — `src/app/api/defense/report/route.ts` (extended)

Single completion, extended prompt + schema:

- The completion returns, in addition to `findings` (unchanged, still validated against captured speech), an optional `personaVerdicts: { personaId, line }[]`.
- **Validate each verdict line:** keep a line only if that `personaId` actually has ≥1 captured `ExaminerEvent` in this session. An unsupported line is dropped (not a 502). This mirrors the existing finding-grounding discipline but degrades gracefully per-line.
- **Assemble** the `CoachingReport`: `highestLeverage` + `drills` (from ordered findings) + `computeCoachingMetrics(...)` + `buildTimeline(...)` + `buildPersonaVerdicts({ ..., verdictLines })` + `strengths`.
- **Graceful minimal report (fixes the Phase-6 502):**
  - If there is **no presenter speech**, or the LLM findings **fail validation**, do NOT 502. Instead return `{ report: CoachingReport }` with `minimal: true`, `highestLeverage` set to a neutral grounded fallback (existing `buildDefenseReport` fallback), empty/whatever `drills`, and the still-valid grounded `metrics` + `timeline` + `personaVerdicts` (verdict lines simply all null when the LLM part is unusable).
  - A true server error (LLM/network/db throw) still returns 500.
- Cache `{ coachingReport }` in `session.summary`; also persist validated `findings` as today.
- Keep the existing auth + ownership guard and the `practiceMode === 'defense'` gate unchanged.

## 8. Report UI — `src/features/defense/components/` (rebuilt into focused units)

Replace the 8-line `DefenseReportView` with `CoachingReportView` composing small presentational units (each `renderToStaticMarkup`-tested):

- `CoachingReportView.tsx` — page `<h1>` (highest-leverage headline) + section order below; owns the `SessionAudioPlayer` ref and passes an `onSeek(ms)` down to timeline + metrics.
- `MetricsStrip.tsx` — grounded dimension chips (pace, fillers, verbatim, questions handled, longest slide); a chip with an `atMs` is a button that calls `onSeek`.
- `EvidenceTimeline.tsx` — `<ol>` of moments; each row shows a mono `mm:ss` badge, persona tag when present, slide, and text; the row is a button calling `onSeek(atMs)`.
- `PersonaVerdictCards.tsx` — one card per `PersonaVerdict`: title, the validated verdict line (when present), and the challenges list (each with `mm:ss` → `onSeek`, slide, text, and a responded/not marker).
- `DrillsPanel.tsx` — 1–3 prescribed drills with a retry affordance (keeps the existing `retryHref`).
- Reuse `SessionAudioPlayer` (§9) as the replay surface; it sits inside `CoachingReportView` under the single `<h1>`, resolving the deferred heading-order minor.
- Soft-depth recipes only (cards `rounded-xl border border-border bg-card p-6 shadow-e1`, mono badges, status dots). Copy is coaching-professional, never generic.
- `renderToStaticMarkup` encodes `'`→`&#x27;`, `&`→`&amp;` — asserted test substrings avoid those characters.

## 9. Tap-to-seek — `SessionAudioPlayer.tsx` (extend)

- Add a forwarded imperative handle: `SessionAudioPlayer` accepts a `ref` exposing `seekTo(seconds: number): void`, which sets the underlying `<audio>` element's `currentTime` and calls `play()`. Keep the existing empty-state branch and the `audioPath` prop.
- `CoachingReportView` holds the ref and provides `onSeek(ms) => player.seekTo(ms/1000)` to timeline + metrics + persona challenges.
- If there is no recording (empty state), `onSeek` is a no-op (the player has nothing to seek); the timeline/metrics still render and simply don't jump. Honest.
- The seek behavior itself (DOM `currentTime`) is verified in-browser, not unit-tested (repo has no jsdom).

## 10. Engine polish — Phase-6 honesty race (#4)

In `src/features/simulator/use-simulation-engine.ts`, ensure the recording finishes uploading before the room flips to `'ended'`, so the report shows the audio on first load rather than the empty state. Small change: await `recorder.stop()` before `setPhase('ended')` while keeping it in a path that still runs on persist failure (the `finally` currently runs after the phase flip — reorder so stop completes first, then set ended). Surface a brief `saving` state on the hook if the await is user-visible. This is the only engine file touched in Phase 7; it directly serves the report's honesty.

## 11. Report page — `src/app/reports/[sessionId]/page.tsx`

- Parse the cached/generated report with the new `coachingReportSchema` (accept `{ coachingReport }`; on miss, regenerate via the route as today).
- Render `<CoachingReportView report={...} audioPath={audioPath} onComplete.../>`; keep the existing `role="alert"` / `role="status"` load/error states and the audioPath wiring from Phase 6.
- The player moves inside `CoachingReportView`; the page no longer renders `SessionAudioPlayer` directly (removing the Phase-6 top-of-page mount), so heading order is correct.

## 12. Testing

**Pure units (Vitest, node env, fixtures):**
- `coaching-metrics.test.ts` — WPM/filler/verbatim/slide-times/questions-handled against a crafted transcript+events fixture; null-speech case; handled-vs-unhandled edge (event with/without a later same-slide segment).
- `coaching-timeline.test.ts` — chronological merge/sort; persona tags; `formatTimestamp` (0, <1min, minutes, rounding).
- `persona-verdicts.test.ts` — grouping by persona; `responded` flag; verdict-line attach; persona-less events omitted; null line when absent.
- Report route validation — verdict-line grounding (drop unsupported personaId) and the minimal-report path (no-speech → minimal:true, not 502) where pure-extractable; if the route logic is hard to unit-test directly, extract the validation/assembly into a pure helper and test that.

**Component (renderToStaticMarkup):**
- `CoachingReportView` + each sub-unit: section presence, `mm:ss` badges, persona cards, metric chips, drills, minimal-report rendering, empty-recording behavior (no seek buttons crash).

**Live (in-browser, honest limit):** record a real session → open the report → confirm timeline/metrics/persona cards render from real capture, and **clicking a moment seeks the audio**. Confirm a transcript-less session yields the minimal report (no 502).

Existing full suite stays green; no edits to prior phases' test files except additive cases in files this phase owns.

## 13. Files

**New:** `coaching-metrics.ts`(+test), `coaching-timeline.ts`(+test), `persona-verdicts.ts`(+test) under `src/features/defense/`; `CoachingReportView.tsx`, `MetricsStrip.tsx`, `EvidenceTimeline.tsx`, `PersonaVerdictCards.tsx`, `DrillsPanel.tsx` (+tests) under `src/features/defense/components/`.
**Edited:** `src/features/defense/types.ts` (CoachingReport type + schema), `src/app/api/defense/report/route.ts` (verdict lines + assembly + minimal report), `src/app/reports/[sessionId]/page.tsx` (new view + schema), `src/features/simulator/SessionAudioPlayer.tsx` (seek ref), `src/features/simulator/use-simulation-engine.ts` (honesty-race reorder).
**Retired when superseded:** `DefenseReportView` (`src/features/defense/components/defense-report.tsx`) and its test `defense-report.test.tsx` — both removed once the report page renders `CoachingReportView`. Confirmed importers are only the report page (recut in §11) and that test file; no other consumers. Removing the retired component's own test is legitimate (not a "prior test" edit to force new code green).
**Reused unchanged:** `analyseReading`, `spokenBySlide`, `computeMetrics`, `buildDefenseReport` (composed), `SessionAudioPlayer` empty-state, soft-depth recipes, auth/ownership guards.

## 14. Out of scope (later phases)

- Longitudinal `SpeakerProfile` diffing + Home/Progress surfacing (Phase 8 — but `CoachingMetrics` is stored in the cached report so Phase 8 can consume it).
- Panel-voice mixing, video, distinct per-persona voices.
- Serving `public/recordings/*.webm` through an authenticated route (ops/Phase 8).
