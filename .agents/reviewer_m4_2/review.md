# Review Report — M4 1-on-1 AI Executive Coaching Studio Unit Tests & Components

**Reviewer**: Reviewer M4 2 (Roles: reviewer, critic)  
**Date**: 2026-07-30  
**Verdict**: **REQUEST_CHANGES**

---

## Review Summary

Independent review of unit test suites and components in `src/features/coaching`, `src/features/simulator`, and `src/app`.
While `npx vitest run` executes 107 test files (446 tests passing), the review uncovered a **Critical Integrity Violation** (facade unit tests inspecting source code via `readFileSync` instead of rendering/executing components), as well as build, type-check (`tsc`), and linting failures across the project.

---

## Findings

### [Critical] Finding 1 — INTEGRITY VIOLATION: Facade Page Unit Tests Bypassing Component Logic
- **What**: Unit tests for Next.js page components in `src/app/coaching/[sessionId]/page.test.tsx` and `src/app/rehearse/[sessionId]/page.test.tsx` do not render or execute React components. Instead, they read raw source files with `node:fs` (`readFileSync`) and assert substring containment on the code.
- **Where**:
  - `src/app/coaching/[sessionId]/page.test.tsx` (lines 7-9)
  - `src/app/rehearse/[sessionId]/page.test.tsx` (lines 7-9)
- **Why**: This is a facade test pattern and shortcut. It self-certifies component behavior without mounting components or executing any runtime logic (`useEffect`, `useOnboardingGuard`, `authenticatedFetch`, Zod schema parsing `parseSession`, state management, or error handling). If the page components contain runtime errors, these tests still pass.
- **Suggestion**: Rewrite both page test suites using `@testing-library/react` (or standard component test utilities) to render `CoachingRoomPage` and `RehearsePage`, mocking network endpoints (`authenticatedFetch`) and verifying loading state, session data rendering, and error handling.

### [Major] Finding 2 — Type Check (`npx tsc --noEmit`) and Build Failures
- **What**: `npx tsc --noEmit` and `npm run build` fail due to syntax and JSX errors in `src/components/present-section.tsx`.
- **Where**: `src/components/present-section.tsx` (lines 102, 801, 1657, 1658)
- **Why**: TS compiler errors:
  - `error TS1005: ',' expected.` (line 102:25)
  - `error TS17008: JSX element 'div' has no corresponding closing tag.` (line 801:6)
  - `error TS1381: Unexpected token.` (line 1657:1)
  - `error TS1005: '</' expected.` (line 1658:1)
- **Suggestion**: Fix unclosed JSX tags and syntax errors in `src/components/present-section.tsx` so `npx tsc --noEmit` passes cleanly.

### [Major] Finding 3 — ESLint Failures and React Compiler Rules Violation
- **What**: `npm run lint` fails with 5 errors.
- **Where**:
  - `src/features/coaching/components/coaching-room.tsx` (line 93)
  - `src/components/configure-section.tsx` (line 687)
  - `src/components/present-section.tsx` (line 1657)
  - `scripts/create-sharkpit-pptx.cjs` (lines 1-2)
- **Why**:
  - `coaching-room.tsx`: React Compiler dependency mismatch (`react-hooks/preserve-manual-memoization`). The `useMemo` for `slides` specified `[rawDeck, session?.slides, session?.topic]`, but React Compiler inferred dependency `session`.
  - `configure-section.tsx`: `'Sparkles' is not defined` (`react/jsx-no-undef`). Missing import for `Sparkles` icon from `lucide-react`.
  - `create-sharkpit-pptx.cjs`: `@typescript-eslint/no-require-imports`.
- **Suggestion**:
  - In `coaching-room.tsx`, align dependencies in `useMemo` or update memoization logic.
  - In `configure-section.tsx`, import `Sparkles` from `lucide-react`.
  - Fix syntax error in `present-section.tsx`.

### [Major] Finding 4 — SSR `renderToString` Test Pattern Missing Interactive State Verification
- **What**: `src/features/coaching/components/coaching-room.test.tsx` and `src/features/simulator/SimulatorRoom.test.tsx` use `renderToString` from `react-dom/server` rather than `@testing-library/react`.
- **Where**:
  - `src/features/coaching/components/coaching-room.test.tsx` (line 22)
  - `src/features/simulator/SimulatorRoom.test.tsx` (lines 37, 61)
- **Why**: `renderToString` performs static server-side rendering only. It does not execute `useEffect` hooks, user interactions (e.g. clicking "Ask Coach for Live Advice", toggling microphone, opening Coach Rescue modal), or async API script loading.
- **Suggestion**: Supplement or replace `renderToString` assertions with `@testing-library/react` interactive component tests.

---

## Verified Claims

| Claim / Command | Status | Result / Method |
|-----------------|--------|-----------------|
| `npm test` (`npx vitest run`) | PASSED | 107 test files passed (446 tests). Verified via execution. |
| `npx tsc --noEmit` | FAILED | 4 errors in `src/components/present-section.tsx`. Verified via execution. |
| `npm run lint` | FAILED | 5 errors in `coaching-room.tsx`, `configure-section.tsx`, `present-section.tsx`, `create-sharkpit-pptx.cjs`. Verified via execution. |
| `npm run build` | FAILED | Failed due to tsc/next syntax error in `present-section.tsx`. Verified via execution. |
| `SimulatorRoom` mode branching | PASSED | Verified layout differences in `guided` (1 coach avatar) vs `mock` (4-person panel grid). |
| `ActivityBars` & `AudiencePanel` unit tests | PASSED | Pure presenter and equalizer animation tests in `src/features/simulator/` are well-structured and genuine. |
| Coaching domain models & repositories | PASSED | `progress-model.test.ts`, `session-outcome.test.ts`, `speaker-profile.test.ts`, `speaker-profile-repository.test.ts` genuine and 100% passing. |

---

## Coverage Gaps

- **Page Component Integration**: `src/app/coaching/[sessionId]/page.tsx` and `src/app/rehearse/[sessionId]/page.tsx` have 0% runtime test coverage due to `readFileSync` facade tests.
- **Interactive Component State**: Event handlers and state hooks in `CoachingRoom` (mic toggle, recording, TTS speech, rescue modal, advice HUD) are unverified under user interaction.

---

## Unverified Items

- Runtime audio playback (`playAudioData`) in browser environments (mocked in unit test runner).
