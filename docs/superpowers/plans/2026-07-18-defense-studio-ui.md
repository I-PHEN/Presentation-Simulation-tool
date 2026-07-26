# Defense Studio UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current presentation-practice islands with a professional, accessible Readiness Desk, deck preparation flow, rehearsal room, and evidence-led defense brief.

**Architecture:** Build focused Defense Studio components under `src/features/defense/components`, leaving persisted session/evaluation rules in the existing feature modules. Keep the existing app routes as thin authenticated shells; consume typed data and preserve legacy components only until the new flow replaces each visible section.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, shadcn/Radix primitives, Lucide, Framer Motion, Vitest/React Testing Library.

## Global Constraints

- Use familiar, accessible shadcn/Radix components and Lucide iconography; no unfamiliar controls, pseudo-AI chat panes, avatars, or decorative score gauges.
- Use Georgia only for display headings, Geist for body/UI, and Geist Mono only for metadata.
- Use the Defense Studio palette: ink `#15262D`, paper `#E9ECE7`, card paper `#F6F7F3`, rule `#C5CECA`, copper signal `#B94C2C`, muted ink `#66757A`.
- Maintain visible keyboard focus, semantic labels, loading/error/empty states, reduced motion support, and responsive behavior at 390px.
- Remove the custom favicon configuration; do not replace it before a dedicated mark exists.
- Start the application on port `3001`, never port `3000`.
- Replace the PowerPoint converter's LibreOffice-only dependency with the installed Microsoft PowerPoint Windows automation path, and return the same normalized deck response.
- Remove the generic template/panel builder rather than hiding it behind a new theme.

---

### Task 1: Establish the Defense Studio shell and visual contract

**Files:** Create `src/features/defense/components/defense-shell.tsx`, `defense-shell.test.tsx`. Modify `src/app/globals.css`, `src/app/layout.tsx`.

**Produces:** `DefenseShell({ eyebrow, title, children, action })`, a professional page frame with semantic landmark regions and no custom favicon.

- [ ] Write a failing test asserting `DefenseShell` renders the eyebrow, heading, `main` landmark, and labelled action.
- [ ] Run `npm.cmd run test -- src/features/defense/components/defense-shell.test.tsx`; expect missing-component failure.
- [ ] Implement the component using semantic `header`, `main`, and `footer`, plus the palette/typography tokens and `prefers-reduced-motion` CSS rule. Remove the `icons` metadata field from `layout.tsx`.
- [ ] Run the component test successfully, then `npm.cmd run lint` and `npx.cmd tsc --noEmit`; document unrelated pre-existing errors separately.
- [ ] Commit only Task 1 files with `feat: add defense studio shell`.

### Task 2: Build the Readiness Desk

**Files:** Create `src/features/defense/components/readiness-desk.tsx`, `readiness-desk.test.tsx`. Modify `src/app/dashboard/page.tsx`.

**Consumes:** A `ReadinessDeskData` interface containing `title`, `daysUntilDefense`, `nextDrill`, `latestReadiness`, and `recentSessions`.

**Produces:** One visible next action and a three-item rehearsal record; no generic stat-card grid.

- [ ] Write a failing test that expects `Begin focused practice`, `Highest-risk defense question`, and `Latest mock defense` to render from one `ReadinessDeskData` fixture.
- [ ] Verify the red test, then implement a single editorial two-column desktop layout that collapses to one column. The action is the only primary button; prior sessions remain compact rows.
- [ ] Use the current database session list to build the fixture data; show an explicit empty state that says `Upload a deck to begin your first rehearsal.`
- [ ] Verify component tests, responsive rendering, lint, and typecheck. Commit only Task 2 files.

### Task 3: Replace generic setup with deck preparation and reliable PowerPoint ingestion

**Files:** Create `src/features/defense/components/prepare-deck.tsx`, `mode-choice.tsx`, corresponding tests. Modify `src/app/practice/page.tsx`, `src/components/upload-section.tsx`.

**Consumes:** The existing deck upload response and `DefenseMode`.

**Produces:** Slide-required deck receipt and plain-language mode choice, with no audience/persona/interview controls.

- [ ] Write a failing test asserting that the two choices contain exact copy: `Pause at the first material weakness.` and `Present uninterrupted, then defend your work in Q&A.`
- [ ] Verify red, implement the compact receipt (filename, slide count, three thumbnails) and disabled primary action until title/deck are valid.
- [ ] The page copy must say `Upload your PowerPoint or PDF deck. Your examiner uses it to test what you explained - and what you did not.` Use the installed `POWERPNT.EXE` Windows automation fallback when LibreOffice is unavailable; test the converter command selection without requiring a real deck in the unit test.
- [ ] Delete the visible template grid, panel-member builder, focus-area checklist, custom-prompt text box, audience-count controls, and generic audience controls from the primary route. Replace them with one examiner stance control: Supportive or Rigorous.
- [ ] Verify test, lint, responsive 390px layout, then commit Task 3 files.

### Task 4: Build the professional rehearsal room and slide-boundary capture

**Files:** Create `src/features/defense/components/rehearsal-room.tsx`, `rehearsal-room.test.tsx`. Modify `src/components/present-section.tsx`, `src/lib/store.ts`.

**Consumes:** active slide, transcript segments, `DefenseMode`, microphone state, and the existing voice engine.

**Produces:** A slide-centered stage with restrained controls and typed slide-boundary transcript segments.

- [ ] Write failing tests proving Diagnostic mode renders `Examiner challenge` when one is provided and Mock mode does not interrupt the active presentation.
- [ ] Implement the stage: top metadata strip, central slide, compact transcript/progress rail, labelled recording control, and no avatar/chat UI.
- [ ] Store transcript segments as `{ slideIndex, text }`; append a segment when recording begins and every time the slide changes. Use this data for reading evidence rather than guessing slide ownership from final text.
- [ ] Verify tests and keyboard navigation, then commit Task 4 files.

### Task 5: Ship the evidence-led Defense Brief

**Files:** Create `src/features/defense/components/defense-brief.tsx`, `defense-brief.test.tsx`. Modify `src/components/scoring-dashboard.tsx`, `src/app/api/score/route.ts`.

**Consumes:** persisted deck context, slide-boundary transcript segments, calculated `ReadingEvidence`, and evaluator findings.

**Produces:** `Readiness`, `Highest-risk defense question`, `What your examiner heard`, and `Rehearse next` report sections.

- [ ] Write a failing brief test asserting a high-risk finding renders slide evidence and its retry drill.
- [ ] In the score route, map saved transcript segments to deck slides, call `analyseReading`, include the evidence in `buildDefenseEvaluationPrompt`, validate exactly three findings, and persist them.
- [ ] Implement the brief with `Explained in your own words` phrase evidence instead of a generic numeric verbatim gauge. Add `Practice this answer` to begin a focused diagnostic retry.
- [ ] Verify API/unit/component tests plus the full test suite; commit Task 5 files.

### Task 6: Run and inspect the production journey

**Files:** Modify `.gitignore` only if required for local artifacts.

- [ ] Run `npm.cmd run test`, `npm.cmd run lint`, and `npx.cmd tsc --noEmit`; separate pre-existing errors from new ones.
- [ ] Start `npm.cmd run dev -- -p 3001` and verify `http://localhost:3001` responds.
- [ ] Manually test upload of a PowerPoint deck, Diagnostic Practice interruption, Mock Defense non-interruption, brief rendering, and dashboard persistence.
- [ ] Report any remaining non-product blockers before declaring the redesign complete.
