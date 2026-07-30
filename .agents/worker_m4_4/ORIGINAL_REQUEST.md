## 2026-07-30T18:51:44Z
<USER_REQUEST>
You are Worker M4 4 tasked with completing all build, tsc, lint, and unit test remediation tasks in c:\Users\Michael\Downloads\sparring-partner.
Your assigned working directory is c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m4_4. Write all metadata/reports ONLY in that directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Remediation Tasks:

1. **Fix Page Route Unit Tests**:
   - In `src/app/coaching/[sessionId]/page.test.tsx` and `src/app/rehearse/[sessionId]/page.test.tsx`, replace `readFileSync` source string containment checks with genuine component rendering assertions using `renderToString` or React component rendering.

2. **Fix Syntax & JSX Errors in `src/components/present-section.tsx`**:
   - Fix JSX opening/closing tag mismatches and unexpected syntax tokens (around lines 102, 801, 1657, 1658) so TypeScript compiles without errors.

3. **Fix Missing Import in `src/components/configure-section.tsx`**:
   - Import `Sparkles` from `lucide-react` (line 687).

4. **Fix React Hooks Lint Error in `src/features/coaching/components/coaching-room.tsx`**:
   - Resolve line 93 `useMemo` / hook warning (`react-hooks/preserve-manual-memoization`).

5. **Fix CJS Lint Error in `scripts/create-sharkpit-pptx.cjs`**:
   - Add `/* eslint-disable @typescript-eslint/no-require-imports */` at top of `scripts/create-sharkpit-pptx.cjs`.

6. **Run & Verify All Verification Commands**:
   - Run `npx tsc --noEmit` — must pass cleanly with exit code 0!
   - Run `npm run lint` — must pass cleanly with exit code 0!
   - Run `npm run build` — must build production bundle successfully!
   - Run `npm test` (`npx vitest run`) — 100% tests passing!

Write your changes report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m4_4\changes.md` and handoff report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m4_4\handoff.md`. Include test/build/lint/tsc execution logs. Update your `progress.md` with status. When complete, send a message to parent.
</USER_REQUEST>
