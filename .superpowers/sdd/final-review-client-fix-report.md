# Final client boundary fix report

## Final client-boundary fix pass — 2026-07-18

`generateTTS()` now uses the existing `authenticatedFetch` transport, so the protected `/api/tts` request receives the Firebase Bearer identity (or only the constrained development mock identity) instead of relying on browser-default fetch credentials.

Added `src/lib/authenticated-asset.tsx`. Its asset loader requests each private slide with `authenticatedFetch`, creates an object URL from the authorized response, and revokes that URL on source replacement/unmount. `AuthenticatedSlideImage` provides neutral loading and failure UI without exposing a private source URL. Deck receipt thumbnails and the rehearsal stage now use this component; no defense UI native image element consumes `slide.imageUrl` directly.

Session GET now safely parses persisted JSON before applying shared defense schemas. Malformed deck/transcript/event values return the intended recoverable 422 evidence response instead of escaping as a generic 500.

### Test evidence

- RED: `npm.cmd run test -- src/lib/authenticated-asset.test.ts src/lib/voice-engine.test.ts` initially failed because the asset loader did not exist and TTS used native `fetch`.
- GREEN focused: `npm.cmd run test -- src/lib/authenticated-asset.test.ts src/lib/voice-engine.test.ts src/app/api/session/[id]/route.test.ts src/features/defense/components/deck-intake.test.tsx src/features/defense/components/rehearsal-room.test.tsx` — PASS, 5 files / 22 tests.
- Full: `npm.cmd run test` — PASS, 32 files / 100 tests.
- Build: `npm.cmd run build` — PASS (exit 0) with elevated filesystem access. It compiled and generated all routes. The pre-existing/non-fatal standalone tracing warning remains for the hard-coded local Microsoft PowerPoint path in the upload route.

No browser/Firebase/microphone/PowerPoint/Cartesia live smoke test was performed. Tests mock authenticated transport and object URL APIs; no token was put in a URL and no server asset authorization rule was weakened.
