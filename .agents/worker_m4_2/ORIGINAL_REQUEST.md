## 2026-07-30T17:55:07Z

You are Worker M4 2 tasked with resolving all build, tsc, lint, and test facade issues flagged by Reviewer M4 2 in c:\Users\Michael\Downloads\sparring-partner.
Your assigned working directory is c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m4_2. Write all your metadata/reports ONLY in that working directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks to Complete:

1. **Fix Page Route Unit Tests**:
   - In `src/app/coaching/[sessionId]/page.test.tsx` and `src/app/rehearse/[sessionId]/page.test.tsx`, replace `readFileSync` string containment checks with actual component rendering / unit test assertions (e.g. using `renderToString` or React testing library) so no source file string facade tests exist.

2. **Fix Syntax & JSX Errors in `src/components/present-section.tsx`**:
   - Fix JSX opening/closing tag mismatches and syntax error tokens (around lines 102, 801, 1657, 1658) so TypeScript compiles cleanly.

3. **Fix Missing Import in `src/components/configure-section.tsx`**:
   - Import `Sparkles` from `lucide-react` (line 687).

4. **Fix React Hooks Lint Error in `src/features/coaching/components/coaching-room.tsx`**:
   - Fix line 93 `useMemo` / hook warning (`react-hooks/preserve-manual-memoization`).

5. **Fix CJS Lint Error in `scripts/create-sharkpit-pptx.cjs`**:
   - Add `/* eslint-disable @typescript-eslint/no-require-imports */` at top of `scripts/create-sharkpit-pptx.cjs`.

6. **Run & Verify All Build & Test Commands**:
   - Run `npx tsc --noEmit` — must exit code 0!
   - Run `npm run lint` — must exit code 0!
   - Run `npm run build` — must compile successfully!
   - Run `npm test` (`npx vitest run`) — 100% tests passing!

Write your changes report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m4_2\changes.md` and handoff report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m4_2\handoff.md`. Include test/build/lint/tsc execution logs. Update your `progress.md` with status. When complete, send a message to parent.
