# Task 6 report

Implemented grounded examiner voice foundation.

Changed files:
- `src/features/defense/examiner.ts`, `src/features/defense/examiner.test.ts`
- `src/features/defense/hooks/use-examiner-voice.ts`, `src/features/defense/hooks/use-examiner-voice.test.ts`
- `src/app/api/defense/examiner/route.ts`, `src/app/api/defense/examiner/route.test.ts`
- `src/lib/voice-engine.ts`, `src/lib/voice-engine.test.ts`
- `src/app/api/tts/route.ts`, `src/app/api/tts/route.test.ts`

TDD evidence:
- Focused RED: missing examiner/controller modules and the prior `playAudioData()` void result caused the new tests to fail as expected.
- Focused GREEN: `npm.cmd run test -- src/features/defense/examiner.test.ts src/features/defense/hooks/use-examiner-voice.test.ts src/lib/voice-engine.test.ts src/app/api/tts/route.test.ts src/app/api/defense/examiner/route.test.ts` — 5 files, 9 tests passed.
- Full: `npm.cmd run test` — 20 files, 51 tests passed.

Self-review:
- Examiner outputs are schema parsed, slide-bound, and never expose a free-text chat endpoint.
- Voice sequencing pauses capture, exposes caption, then plays/appends/resumes; caption fallback is stored with delivery metadata and replay is append-idempotent.
- Playback failures return typed outcomes and clean up active audio/object URLs; TTS validates client inputs before Cartesia and keeps upstream details server-side.

Commit status: amended as `4d908af feat(defense): add grounded examiner voice foundation` after a task-only staging check.

Concern: `npx.cmd tsc --noEmit` cannot start in this sandbox (`EPERM lstat C:\\Users\\Michael`); the focused and full Vitest suites are green.

## Review-fix follow-up

Fixed the review findings with new regression tests:

- Server grounding now requires model evidence to share source terms with both the current slide and presenter segment. The response replaces model-supplied evidence with bounded, server-derived slide/speech evidence, so unsupported evidence cannot escape.
- Reading-evidence entries now cap individual strings at 500 characters and must use the current presenter segment's slide index before route prompting.
- Audio playback now owns an active playback record. Stopping playback pauses and clears audio, revokes the exact object URL, clears references, and settles the pending playback promise as a failure. `NotAllowedError` is the only autoplay classification; other rejected `play()` calls are playback failures.
- Examiner delivery tracks a stable event key. A failed append preserves caption and actionable error, and replay does not attempt a duplicate append for that event.

Review-fix TDD evidence:

- RED: the added unsupported-grounding, mismatched/oversized reading-evidence, non-autoplay rejection, stop-settlement, and failed-append idempotence tests failed against the original implementation.
- Focused: `npm.cmd run test -- src/features/defense/examiner.test.ts src/features/defense/hooks/use-examiner-voice.test.ts src/lib/voice-engine.test.ts src/app/api/tts/route.test.ts src/app/api/defense/examiner/route.test.ts` — 5 files, 14 tests passed.
- Full: `npm.cmd run test` — 20 files, 56 tests passed.

## Final grounding and overlap fixes

- Route acceptance now requires the returned examiner question text itself to share meaningful source terms with both the current slide and presenter speech. Model evidence cannot rescue an unrelated question; server-derived evidence remains authoritative.
- `playAudioData()` stops, settles, clears, and revokes any active playback before creating another one, preventing overlapping calls from leaking the first promise or object URL.
- Added regressions for the shared-`retention`/unrelated-`marketing survey` case and overlapping playback followed by stop.

Verification:

- Focused Task 6: `npm.cmd run test -- src/features/defense/examiner.test.ts src/features/defense/hooks/use-examiner-voice.test.ts src/lib/voice-engine.test.ts src/app/api/tts/route.test.ts src/app/api/defense/examiner/route.test.ts` — 5 files, 16 tests passed.
- Full: `npm.cmd run test` — 20 files, 58 tests passed.

## Server-authored examiner question fix

- The model is now constrained to `NO_INTERRUPT` or a decision-kind object only. It cannot supply the displayed examiner question, evidence, timestamp, or slide index.
- For a non-null decision, the route constructs the event entirely from bounded exact excerpts of the session slide and current presenter segment, quotes both excerpts in the question, and emits matching server-derived evidence. Stance changes only the server-owned question wording.
- Regression coverage proves contradictory model content such as `retention decline` is discarded and cannot appear in the response when the server sources say `retention increased`.

Verification:

- Focused Task 6: `npm.cmd run test -- src/features/defense/examiner.test.ts src/features/defense/hooks/use-examiner-voice.test.ts src/lib/voice-engine.test.ts src/app/api/tts/route.test.ts src/app/api/defense/examiner/route.test.ts` — 5 files, 16 tests passed.
- Full: `npm.cmd run test` — 20 files, 58 tests passed.
