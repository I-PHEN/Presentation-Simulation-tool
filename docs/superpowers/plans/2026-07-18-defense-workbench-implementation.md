# Defense Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented generic practice UI with a complete, voice-first, slide-grounded thesis-defense workbench from PowerPoint/PDF intake through evidence-led report.

**Architecture:** Keep the defense domain in focused `src/features/defense` modules: typed deck/session/transcript/report contracts, converter selection, reading evidence, examiner-event validation, and report building. New route-level pages compose small Defense UI components inside one authenticated `AppShell`; API routes own persistence, conversion, and model calls. The legacy generic multi-agent flow remains outside the new primary path until the cutover task removes its routes/components from navigation.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Tailwind CSS 4, shadcn/Radix primitives, Prisma/SQLite, Zod, Cartesia TTS, browser MediaRecorder/Web Speech API, Vitest.

## Global Constraints

- Support thesis/capstone defense only in this primary flow; do not reintroduce templates, panel builders, generic audience controls, or free-text examiner prompts.
- Accept `.pptx`, `.ppt`, and `.pdf` files up to **25 MB**. On Windows, fall back to installed Microsoft PowerPoint automation when LibreOffice is unavailable.
- Use real grayscale light/dark tokens exactly: canvas `#FFFFFF`/`#09090B`, surface `#F4F4F5`/`#16161A`, primary text `#18181B`/`#FAFAFA`, secondary text `#52525B`/`#A1A1AA`, divider `#E4E4E7`/`#29292D`.
- Use Geist/system sans only. Normal explanatory body copy is at least 14px; compact metadata is supplementary only.
- Every examiner intervention/question/follow-up is spoken aloud. Text is a caption/replay/evidence aid, never the primary response channel.
- Pause or mark presenter capture while examiner audio plays; do not score synthesized examiner audio as student speech.
- A reading/slide-reliance conclusion must cite a slide and spoken evidence. Blank speech, short titles, and necessary technical terms are not proof of reading.
- Preserve existing authentication; make no bulk `git add`, reset, checkout, or edits to unrelated dirty files.
- Do not delete currently dirty legacy components in this implementation. Remove them from the primary navigation/import graph; leave deletion for a separately authorized cleanup after the new flow is accepted.
- Run targeted Vitest tests after every task. Before handoff, run all relevant tests, `npm.cmd run lint`, and `npx.cmd tsc --noEmit`; report existing failures truthfully if they remain outside the changed scope.

---

## File structure

| Path | Responsibility |
|---|---|
| `src/features/defense/types.ts` | Canonical deck, session, transcript, examiner-event, report, and theme-neutral data types. |
| `src/features/defense/session-schema.ts` | Zod validation for creating/updating a defense session. |
| `src/features/defense/transcript.ts` | Pure slide-segment aggregation and evidence serialization. |
| `src/features/defense/deck-conversion.ts` | Pure converter discovery/command construction and converter failure classification. |
| `src/features/defense/examiner.ts` | Prompt/input and Zod validation for grounded spoken examiner events. |
| `src/features/defense/report.ts` | Converts persisted findings/evidence into the report model. |
| `src/features/defense/components/app-shell.tsx` | Shared top navigation, theme toggle, responsive layout, account affordance. |
| `src/features/defense/components/overview-workspace.tsx` | Active-defense overview and one next action. |
| `src/features/defense/components/deck-intake.tsx` | Upload, conversion progress/error, and deck receipt UI. |
| `src/features/defense/components/practice-setup.tsx` | Mode/stance selection only. |
| `src/features/defense/components/rehearsal-room.tsx` | Slide-first room, caption rail, controls, and voice-event rendering. |
| `src/features/defense/components/defense-report.tsx` | Evidence chain and next drill UI. |
| `src/features/defense/hooks/use-examiner-voice.ts` | Ordered TTS/capture state machine used by the rehearsal room. |
| `src/app/decks/new/page.tsx` | Authenticated deck intake route. |
| `src/app/practice/[sessionId]/page.tsx` | Authenticated setup/rehearsal route. |
| `src/app/reports/[sessionId]/page.tsx` | Authenticated report route. |
| `src/app/api/upload-presentation/route.ts` | Validates, converts, renders, and returns a `DeckContext`. |
| `src/app/api/session/route.ts` | Creates a typed defense session. |
| `src/app/api/session/[id]/route.ts` | Reads/deletes an expanded defense session. |
| `src/app/api/defense/examiner/route.ts` | Produces a validated grounded examiner event. |
| `src/app/api/defense/report/route.ts` | Persists slide-aware transcript/evidence and returns the report model. |

## Task 1: Establish the neutral product shell and remove the rejected visual direction

**Files:**
- Create: `src/features/defense/components/app-shell.tsx`
- Create: `src/features/defense/components/app-shell.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/theme-toggle.tsx`
- Modify: `src/features/defense/components/defense-shell.tsx`, `src/features/defense/components/readiness-desk.tsx` only to remove their imports from the primary route; leave their files intact for later authorized cleanup

**Interfaces:**
- Produces `AppShell({ active: 'overview' | 'decks' | 'practice' | 'reports', children }: AppShellProps)`.
- `ThemeToggle` exposes an accessible button with `aria-label="Switch to dark mode"` or `"Switch to light mode"` based on `resolvedTheme`.

- [ ] **Step 1: Write the failing shell/theme tests.**

```tsx
// src/features/defense/components/app-shell.test.tsx
it('renders one labelled navigation landmark and the selected section', () => {
  const html = renderToStaticMarkup(
    <AppShell active="practice"><p>Room</p></AppShell>,
  );
  expect(html).toContain('aria-label="Primary navigation"');
  expect(html).toContain('aria-current="page"');
  expect(html).toContain('Practice');
});
```

- [ ] **Step 2: Run the test and confirm it fails because `AppShell` does not exist.**

Run: `npm.cmd run test -- src/features/defense/components/app-shell.test.tsx`

Expected: FAIL with module-not-found or export-not-found.

- [ ] **Step 3: Implement the small shell and token reset.**

```tsx
export type DefenseNavItem = 'overview' | 'decks' | 'practice' | 'reports';

export function AppShell({ active, children }: {
  active: DefenseNavItem;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <nav aria-label="Primary navigation" className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-5">
          {/* Defense wordmark, four links, ThemeToggle, account control */}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
```

Replace the appended paper/copper/grid/Georgia `.defense-*` overrides in `globals.css` with the approved grayscale tokens for `:root` and `.dark`; remove the existing radial dark gradient and `.glass` treatment. Remove the remote favicon entry from `metadata.icons` in `layout.tsx` rather than adding an unapproved replacement.

- [ ] **Step 4: Run the shell test and visual token checks.**

Run: `npm.cmd run test -- src/features/defense/components/app-shell.test.tsx`

Expected: PASS. Manually toggle both themes on `/dashboard`; background is pure white/near-black, no serif/copper/grid/gradient remains, and focus rings are visible.

- [ ] **Step 5: Commit only the shell files.**

```powershell
git add -- src/app/globals.css src/app/layout.tsx src/components/theme-toggle.tsx src/features/defense/components/app-shell.tsx src/features/defense/components/app-shell.test.tsx
git commit -m "feat: add neutral defense application shell"
```

## Task 2: Make defense sessions and evidence persistence explicit

**Files:**
- Modify: `src/features/defense/types.ts`
- Modify: `src/features/defense/session-schema.ts`
- Create: `src/features/defense/transcript.ts`
- Create: `src/features/defense/transcript.test.ts`
- Modify: `src/features/defense/session-schema.test.ts`
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/session/route.ts`
- Modify: `src/app/api/session/[id]/route.ts`

**Interfaces:**
- Produces `ExaminerStance`, `TranscriptSegment`, `ExaminerEvent`, and `DefenseReport` types.
- Produces `appendPresenterSegment(segments, segment): TranscriptSegment[]` and `spokenBySlide(segments): Record<number, string>`.
- Extends `createDefenseSessionSchema` with `stance: z.enum(['supportive', 'rigorous'])`.

- [ ] **Step 1: Write failing domain tests.**

```ts
it('joins only presenter speech for the active slide', () => {
  expect(spokenBySlide([
    { role: 'presenter', slideIndex: 7, text: 'The effect persisted.', startedAtMs: 0, endedAtMs: 1200 },
    { role: 'examiner', slideIndex: 7, text: 'What evidence?', startedAtMs: 1201, endedAtMs: 1800 },
    { role: 'presenter', slideIndex: 7, text: 'Across our sample.', startedAtMs: 1801, endedAtMs: 2600 },
  ])).toEqual({ 7: 'The effect persisted. Across our sample.' });
});

it('rejects a defense session without examiner stance', () => {
  expect(createDefenseSessionSchema.safeParse(validPayloadWithoutStance).success).toBe(false);
});
```

- [ ] **Step 2: Run the tests and confirm failure.**

Run: `npm.cmd run test -- src/features/defense/transcript.test.ts src/features/defense/session-schema.test.ts`

Expected: FAIL because the types/functions/schema field are absent.

- [ ] **Step 3: Implement typed data and persistence.**

```ts
export type ExaminerStance = 'supportive' | 'rigorous';
export type TranscriptRole = 'presenter' | 'examiner';

export interface TranscriptSegment {
  role: TranscriptRole;
  slideIndex: number;
  text: string;
  startedAtMs: number;
  endedAtMs: number;
}

export interface ExaminerEvent {
  kind: 'interrupt' | 'question' | 'follow_up';
  text: string;
  slideIndex: number;
  evidence: string;
  occurredAtMs: number;
}
```

Add `stance String @default("rigorous")`, `transcriptSegments String @default("[]")`, and `examinerEvents String @default("[]")` to `Session`. Update the defense branch of `POST /api/session` to store stance and initialize the JSON fields. Return parsed `deck`, `transcriptSegments`, `examinerEvents`, and `findings` in `GET /api/session/[id]`; do not change the legacy response shape for non-defense sessions.

- [ ] **Step 4: Generate/push Prisma and run domain tests.**

Run:

```powershell
npx.cmd prisma generate
npx.cmd prisma db push
npm.cmd run test -- src/features/defense/transcript.test.ts src/features/defense/session-schema.test.ts
```

Expected: Prisma completes and both test files PASS.

- [ ] **Step 5: Commit typed persistence.**

```powershell
git add -- prisma/schema.prisma src/features/defense/types.ts src/features/defense/session-schema.ts src/features/defense/session-schema.test.ts src/features/defense/transcript.ts src/features/defense/transcript.test.ts src/app/api/session/route.ts src/app/api/session/[id]/route.ts
git commit -m "feat: persist slide-aware defense sessions"
```

## Task 3: Make PowerPoint conversion reliable and testable

**Files:**
- Create: `src/features/defense/deck-conversion.ts`
- Create: `src/features/defense/deck-conversion.test.ts`
- Modify: `src/features/defense/upload.ts`
- Modify: `src/features/defense/upload.test.ts`
- Modify: `src/app/api/upload-presentation/route.ts`
- Create: `scripts/convert-presentation.ps1`

**Interfaces:**
- Produces `selectPowerPointConverter(input): 'libreoffice' | 'powerpoint' | null`.
- Produces `buildPowerPointConversionScript(inputPath, outputPath): string` with all paths passed as PowerShell parameters, not interpolated into executable code.
- `POST /api/upload-presentation` returns `{ deck: DeckContext; totalSlides: number; text: string }` on success and `{ error: string; retryable: boolean }` on conversion failure.

- [ ] **Step 1: Write converter selection and upload validation failures.**

```ts
it('uses Microsoft PowerPoint when LibreOffice is unavailable on Windows', () => {
  expect(selectPowerPointConverter({
    platform: 'win32', sofficePath: null,
    powerPointPath: 'C:/Program Files/Microsoft Office/root/Office16/POWERPNT.EXE',
  })).toBe('powerpoint');
});

it.each(['thesis.pptx', 'thesis.ppt', 'thesis.pdf'])('accepts %s', (name) => {
  expect(validateDeckUpload({ name, size: 1024 })).toEqual({ ok: true });
});
```

- [ ] **Step 2: Run the tests and confirm the converter test fails.**

Run: `npm.cmd run test -- src/features/defense/deck-conversion.test.ts src/features/defense/upload.test.ts`

Expected: FAIL with `selectPowerPointConverter is not a function`.

- [ ] **Step 3: Implement a conversion boundary.**

`deck-conversion.ts` must keep filesystem discovery and choice separate from `execFile`. Check `soffice` first, then the conventional Office paths on Windows. `convert-presentation.ps1` accepts `-InputPath` and `-OutputPath`, opens PowerPoint with COM automation, saves a PDF (`ppSaveAsPDF` format 32), closes the document, and always calls `Quit()` in `finally`. The route invokes it through `execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-InputPath', uploadPath, '-OutputPath', pdfPath])`; never concatenate user file names into a shell string.

Retain PDF rendering/extraction, but treat zero rendered pages as a conversion error. Keep temp cleanup in `finally`; return `retryable: true` for missing converter/timeouts and `retryable: false` for unsupported/malformed files.

- [ ] **Step 4: Run tests and a local PowerPoint smoke check.**

Run:

```powershell
npm.cmd run test -- src/features/defense/deck-conversion.test.ts src/features/defense/upload.test.ts
# Use a non-sensitive local .pptx fixture and verify the response has deck.slides.length > 0.
```

Expected: Tests PASS; installed PowerPoint is selected when `soffice` is absent; `.pptx`, `.ppt`, and `.pdf` responses contain ordered slide context.

- [ ] **Step 5: Commit converter support.**

```powershell
git add -- scripts/convert-presentation.ps1 src/features/defense/deck-conversion.ts src/features/defense/deck-conversion.test.ts src/features/defense/upload.ts src/features/defense/upload.test.ts src/app/api/upload-presentation/route.ts
git commit -m "feat: support PowerPoint defense deck import"
```

## Task 4: Build the overview and deck intake route

**Files:**
- Create: `src/features/defense/components/overview-workspace.tsx`
- Create: `src/features/defense/components/overview-workspace.test.tsx`
- Create: `src/features/defense/components/deck-intake.tsx`
- Create: `src/features/defense/components/deck-intake.test.tsx`
- Create: `src/app/decks/new/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- `OverviewWorkspace` consumes `{ activeDeck?: DeckContext; latestReport?: DefenseReport; onStartHref: string }`.
- `DeckIntake` calls `/api/upload-presentation`, exposes `onDeckReady(deck: DeckContext)`, and renders accepted formats in visible copy.

- [ ] **Step 1: Write route-component markup tests.**

```tsx
it('shows one current-defense action instead of dashboard KPI cards', () => {
  const html = renderToStaticMarkup(<OverviewWorkspace onStartHref="/decks/new" />);
  expect(html).toContain('Continue preparation');
  expect(html).toContain('Import a defense deck');
  expect(html).not.toContain('Overall Score');
});

it('names every supported deck format and exposes an upload input', () => {
  const html = renderToStaticMarkup(<DeckIntake onDeckReady={() => undefined} />);
  expect(html).toContain('PPTX');
  expect(html).toContain('PPT');
  expect(html).toContain('PDF');
  expect(html).toContain('type="file"');
});
```

- [ ] **Step 2: Run failing component tests.**

Run: `npm.cmd run test -- src/features/defense/components/overview-workspace.test.tsx src/features/defense/components/deck-intake.test.tsx`

Expected: FAIL because both components are missing.

- [ ] **Step 3: Implement continuous overview/intake UI.**

Use `AppShell`, semantic `section` headings, dividers, and one black/white primary action. `dashboard/page.tsx` must delete the early return that renders rejected `DefenseShell`/`ReadinessDesk`; map the latest defense session’s `deckContext`/findings into `OverviewWorkspace` and link to `/decks/new`.

`decks/new/page.tsx` must use `useAuth`, redirect unauthenticated users to `/login`, render `DeckIntake`, show a conversion progress state, then show the ordered deck receipt. Persist the selected deck in the next session creation request rather than adding another global configuration page.

- [ ] **Step 4: Run component tests and manual states.**

Run: `npm.cmd run test -- src/features/defense/components/overview-workspace.test.tsx src/features/defense/components/deck-intake.test.tsx`

Expected: PASS. Manually verify empty dashboard, upload-progress, converter-error, deck-receipt, and both themes at 390px and desktop.

- [ ] **Step 5: Commit the overview/intake slice.**

```powershell
git add -- src/app/dashboard/page.tsx src/app/decks/new/page.tsx src/features/defense/components/overview-workspace.tsx src/features/defense/components/overview-workspace.test.tsx src/features/defense/components/deck-intake.tsx src/features/defense/components/deck-intake.test.tsx
git commit -m "feat: add defense workbench and deck intake"
```

## Task 5: Implement focused practice setup

**Files:**
- Create: `src/features/defense/components/practice-setup.tsx`
- Create: `src/features/defense/components/practice-setup.test.tsx`
- Create: `src/app/practice/[sessionId]/page.tsx`
- Modify: `src/app/practice/page.tsx`
- Modify: `src/app/api/session/[id]/route.ts`

**Interfaces:**
- Deck intake already creates the session so `/decks/new` can retain a validated `DeckContext` through navigation. `PracticeSetup({ sessionId, deck, initialMode, initialStance, onReady })` updates `{ mode, stance }` through `PATCH /api/session/[id]`; it must never create a second session for the same intake.
- Route `/practice/[sessionId]?view=setup` renders setup and `/practice/[sessionId]?view=room` renders rehearsal; `/practice` redirects to `/decks/new` rather than rendering legacy templates.

- [ ] **Step 1: Write failing selection/validation tests.**

```tsx
it('defaults to diagnostic rigorous practice and exposes only four valid choices', () => {
  const html = renderToStaticMarkup(<PracticeSetup sessionId="s_1" deck={deck} onReady={() => undefined} />);
  expect(html).toContain('Diagnostic practice');
  expect(html).toContain('Mock defense');
  expect(html).toContain('Rigorous');
  expect(html).toContain('Supportive');
  expect(html).not.toContain('AI Panel Members');
});
```

- [ ] **Step 2: Run the test and confirm failure.**

Run: `npm.cmd run test -- src/features/defense/components/practice-setup.test.tsx src/features/defense/session-schema.test.ts`

Expected: FAIL because the component/setup route contract is absent.

- [ ] **Step 3: Implement the two-choice setup.**

Use accessible radio groups with `aria-checked`; `diagnostic` and `rigorous` are defaults. Explain the behavioral effect in normal-size body text. On success, `router.push('/practice/' + sessionId + '?view=room')`. Do not mount `ConfigureSection`, `QNASection`, or generic judges in this defense route.

- [ ] **Step 4: Run tests and verify the existing session is updated.**

Run: `npm.cmd run test -- src/features/defense/components/practice-setup.test.tsx src/features/defense/session-schema.test.ts`

Expected: PASS. Verify the request updates the intake session's `mode` and `stance`, retains its `deckContext`, and opens the room URL without creating another session.

- [ ] **Step 5: Commit setup.**

```powershell
git add -- src/features/defense/components/practice-setup.tsx src/features/defense/components/practice-setup.test.tsx src/app/api/session/[id]/route.ts src/app/practice/page.tsx src/app/practice/[sessionId]/page.tsx
git commit -m "feat: add focused defense practice setup"
```

## Task 6: Build the grounded examiner API and voice event state machine

**Files:**
- Create: `src/features/defense/examiner.ts`
- Create: `src/features/defense/examiner.test.ts`
- Create: `src/features/defense/hooks/use-examiner-voice.ts`
- Create: `src/features/defense/hooks/use-examiner-voice.test.ts`
- Create: `src/app/api/defense/examiner/route.ts`
- Modify: `src/lib/voice-engine.ts`
- Modify: `src/app/api/tts/route.ts`

**Interfaces:**
- `createExaminerEventSchema` validates `{ kind, text, slideIndex, evidence, occurredAtMs }` and rejects `NO_INTERRUPT` as an event.
- `useExaminerVoice({ pausePresenter, resumePresenter, appendSegment })` returns `speak(event)`, `replayLast()`, `state`, and `lastError`.
- `playAudioData` resolves `{ played: true }` or `{ played: false; error: 'autoplay' | 'playback' }`; it must no longer swallow failure.

- [ ] **Step 1: Write failing validation and ordering tests.**

```ts
it('rejects an interruption without a slide and evidence', () => {
  expect(createExaminerEventSchema.safeParse({
    kind: 'interrupt', text: 'Explain that.', occurredAtMs: 100,
  }).success).toBe(false);
});

it('pauses capture, speaks, stores examiner output, then resumes capture', async () => {
  const calls: string[] = [];
  const voice = createExaminerVoiceController({
    pausePresenter: async () => calls.push('pause'),
    play: async () => { calls.push('play'); return { played: true }; },
    appendSegment: () => calls.push('append'),
    resumePresenter: async () => calls.push('resume'),
  });
  await voice.speak(event);
  expect(calls).toEqual(['pause', 'play', 'append', 'resume']);
});
```

- [ ] **Step 2: Run tests and confirm failure.**

Run: `npm.cmd run test -- src/features/defense/examiner.test.ts src/features/defense/hooks/use-examiner-voice.test.ts`

Expected: FAIL because the schema/controller do not exist.

- [ ] **Step 3: Implement safe examiner generation and voice control.**

`POST /api/defense/examiner` loads the session, parses `deckContext`, receives only the current `TranscriptSegment`, calculates/receives reading evidence for that slide, and prompts the model for one JSON event or literal `NO_INTERRUPT`. The prompt must require the slide claim and spoken evidence in every interruption. Parse with Zod before responding; return `{ event: null }` for `NO_INTERRUPT`.

The voice controller must pause browser recognition/recording before TTS, append an examiner `TranscriptSegment` only after successful or caption-fallback playback, surface an actionable replay error, and resume presenter capture in `finally`. `tts/route.ts` validates a bounded non-empty string and voice id before calling Cartesia.

- [ ] **Step 4: Run tests, including TTS failure path.**

Run: `npm.cmd run test -- src/features/defense/examiner.test.ts src/features/defense/hooks/use-examiner-voice.test.ts`

Expected: PASS, including `played: false` retaining the caption and never resuming before the failure path completes.

- [ ] **Step 5: Commit examiner voice foundation.**

```powershell
git add -- src/features/defense/examiner.ts src/features/defense/examiner.test.ts src/features/defense/hooks/use-examiner-voice.ts src/features/defense/hooks/use-examiner-voice.test.ts src/app/api/defense/examiner/route.ts src/lib/voice-engine.ts src/app/api/tts/route.ts
git commit -m "feat: add grounded voice examiner events"
```

## Task 7: Replace the live room with the slide-first voice rehearsal

**Files:**
- Create: `src/features/defense/components/rehearsal-room.tsx`
- Create: `src/features/defense/components/rehearsal-room.test.tsx`
- Modify: `src/app/practice/[sessionId]/page.tsx`
- Modify: `src/features/defense/reading-analysis.ts`
- Modify: `src/features/defense/reading-analysis.test.ts`
- Modify: `src/app/api/session/[id]/route.ts`

**Interfaces:**
- `RehearsalRoom({ session, onComplete })` consumes `DeckContext`, `mode`, `stance`, and persisted segment/event arrays.
- It calls `POST /api/defense/examiner` only in Diagnostic mode after a minimum presenter segment threshold; Mock mode queues all questions until completion.
- It persists `{ transcriptSegments, examinerEvents, status: 'completed' | 'practicing' }` through an explicit `PATCH /api/session/[id]` handler added to the session route.

- [ ] **Step 1: Write failing room and reading-evidence tests.**

```tsx
it('shows a presentation-scale active slide and a captioned examiner rail', () => {
  const html = renderToStaticMarkup(<RehearsalRoom session={session} onComplete={() => undefined} />);
  expect(html).toContain('Slide 07 of 18');
  expect(html).toContain('Examiner listening');
  expect(html).toContain('Replay last question');
  expect(html).not.toContain('AI Panel Members');
});

it('does not create overlap evidence for a silent slide segment', () => {
  expect(analyseReading(slides, { 7: '' })[0]).toMatchObject({ hasSpeech: false, overlap: 0 });
});
```

- [ ] **Step 2: Run tests and confirm failure.**

Run: `npm.cmd run test -- src/features/defense/components/rehearsal-room.test.tsx src/features/defense/reading-analysis.test.ts`

Expected: FAIL because `RehearsalRoom` and session PATCH persistence are absent.

- [ ] **Step 3: Implement the room with no chat UI.**

Render the active rendered slide as the dominant left stage. Render only active slide claim, current spoken/captioned examiner question, and evidence on the right. Use `createSTT` through a small adapter that records `startedAtMs`/`endedAtMs` and current slide index for each committed presenter segment. On slide navigation, close the prior segment and open the next index; do not append `[Slide N]` marker text as the persisted source of truth.

Diagnostic calls the examiner route on valid new presenter evidence and sends accepted events to `useExaminerVoice`. Mock retains events/questions in state and speaks them only after the user ends presentation. Add replay, continue, answer-aloud, microphone-permission error, and end-session controls. Camera/screen-share, generic multi-judge overlays, and free-text response controls do not render in this room.

- [ ] **Step 4: Run targeted tests and manual voice smoke test.**

Run: `npm.cmd run test -- src/features/defense/components/rehearsal-room.test.tsx src/features/defense/reading-analysis.test.ts src/features/defense/hooks/use-examiner-voice.test.ts`

Expected: PASS. Manually verify: spoken Diagnostic interruption pauses presenter capture; replay replays audio; Mock does not interrupt; a TTS failure leaves a readable caption and retry control; light and dark remain structurally identical.

- [ ] **Step 5: Commit rehearsal room.**

```powershell
git add -- src/features/defense/components/rehearsal-room.tsx src/features/defense/components/rehearsal-room.test.tsx src/features/defense/reading-analysis.ts src/features/defense/reading-analysis.test.ts src/app/practice/[sessionId]/page.tsx src/app/api/session/[id]/route.ts
git commit -m "feat: add slide-first voice defense rehearsal"
```

## Task 8: Persist evidence-led reports and connect the report route

**Files:**
- Create: `src/features/defense/report.ts`
- Create: `src/features/defense/report.test.ts`
- Create: `src/features/defense/components/defense-report.tsx`
- Create: `src/features/defense/components/defense-report.test.tsx`
- Create: `src/app/api/defense/report/route.ts`
- Create: `src/app/reports/[sessionId]/page.tsx`
- Modify: `src/features/defense/evaluation.ts`
- Modify: `src/features/defense/evaluation.test.ts`
- Modify: `src/app/api/score/route.ts`

**Interfaces:**
- `buildDefenseReport({ deck, transcriptSegments, examinerEvents, findings }): DefenseReport` produces `highestLeverage`, `evidenceTrail`, `strengths`, `slideReliance`, and `nextDrill`.
- `POST /api/defense/report` loads session context, computes `spokenBySlide`, calls `analyseReading`, validates model output, persists `findings`/summary, and returns `DefenseReport`.

- [ ] **Step 1: Write failing evidence-chain tests.**

```ts
it('makes a reading-related finding traceable to slide and presenter speech', () => {
  const report = buildDefenseReport({ deck, transcriptSegments, examinerEvents, findings });
  expect(report.highestLeverage.slideIndex).toBe(7);
  expect(report.evidenceTrail[0]).toMatchObject({ slideIndex: 7, role: 'presenter' });
  expect(report.nextDrill).toContain('without looking at the slide');
});

it('does not expose a naked verbatim-reading score', () => {
  const html = renderToStaticMarkup(<DefenseReport report={report} />);
  expect(html).toContain('Slide reliance');
  expect(html).toContain('What you said');
  expect(html).not.toContain('verbatimReading');
});
```

- [ ] **Step 2: Run tests and confirm failure.**

Run: `npm.cmd run test -- src/features/defense/report.test.ts src/features/defense/components/defense-report.test.tsx src/features/defense/evaluation.test.ts`

Expected: FAIL because report builder/component/API are absent.

- [ ] **Step 3: Implement report production and UI.**

Update `buildDefenseEvaluationPrompt` to consume typed slide segments and require every finding to name a slide index (or explicitly state unavailable evidence), quoted presenter evidence, and a drill. Do not route defense sessions through the legacy generic `score` prompt; retain it only for legacy sessions.

The report API must parse stored JSON defensively, fail with a recoverable 422 when required deck/transcript context is unavailable, and write a compact serialized report to the session. The page uses `AppShell active="reports"`, starts with one highest-leverage issue, then shows the ordered evidence trail and a single retry action. It may show longitudinal trend only when two or more completed defense reports exist.

- [ ] **Step 4: Run tests and report route smoke test.**

Run: `npm.cmd run test -- src/features/defense/report.test.ts src/features/defense/components/defense-report.test.tsx src/features/defense/evaluation.test.ts`

Expected: PASS. POST a fixture defense session and verify response contains a slide claim, presenter phrase, examiner question, response gap, and drill.

- [ ] **Step 5: Commit reports.**

```powershell
git add -- src/features/defense/report.ts src/features/defense/report.test.ts src/features/defense/components/defense-report.tsx src/features/defense/components/defense-report.test.tsx src/app/api/defense/report/route.ts src/app/reports/[sessionId]/page.tsx src/features/defense/evaluation.ts src/features/defense/evaluation.test.ts src/app/api/score/route.ts
git commit -m "feat: add evidence-led defense reports"
```

## Task 9: Cut over the primary routes and verify the complete product

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/practice/page.tsx`
- Modify: `src/app/api/sessions/route.ts`
- Modify/Create: `src/features/defense/defense-flow.test.ts`

**Interfaces:**
- Dashboard/deck/practice/report navigation is the sole primary authenticated flow.
- `GET /api/sessions` returns latest defense session data required by `OverviewWorkspace` without exposing invalid JSON strings to UI consumers.

- [ ] **Step 1: Write the end-to-end flow contract test with pure API/domain fixtures.**

```ts
it('keeps a deck grounded from intake to report', async () => {
  const created = await createDefenseSession(fixturePayload);
  const persisted = await appendSegments(created.id, fixtureSegments);
  const report = await buildStoredDefenseReport(persisted);
  expect(report.highestLeverage.slideIndex).toBe(7);
  expect(report.nextDrill.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run it and confirm it fails before cutover helpers exist.**

Run: `npm.cmd run test -- src/features/defense/defense-flow.test.ts`

Expected: FAIL with missing helper/import error.

- [ ] **Step 3: Wire navigation and remove old-primary UI.**

Make `/` redirect authenticated users to `/dashboard` and guests to `/login`. Make dashboard CTA `/decks/new`; make `/practice` redirect to `/decks/new`; remove the generic setup/panel components from the defense route import graph. Keep the existing dirty legacy component files in place and unreachable until the user explicitly authorizes cleanup. Keep unrelated APIs only if another non-defense route still uses them.

`/api/sessions` must include/parse only the defense fields needed for the workbench and keep ordering by `createdAt desc`.

- [ ] **Step 4: Run full verification.**

Run:

```powershell
npm.cmd run test
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
```

Expected: all new defense tests PASS; lint/build PASS; if an existing type failure remains, capture exact file/line and distinguish it from the completed defense flow. Manually inspect the five route states in both themes at 1440px and 390px, then run one local `.pptx` upload, one Diagnostic spoken interruption, one Mock question round, and one report retry.

- [ ] **Step 5: Commit the cutover and verification notes.**

```powershell
git add -- src/app/page.tsx src/app/dashboard/page.tsx src/app/practice/page.tsx src/app/api/sessions/route.ts src/features/defense/defense-flow.test.ts
git commit -m "feat: cut over to defense workbench flow"
```

## Plan self-review

### Spec coverage

- Neutral shared light/dark shell and removal of rejected UI: Task 1.
- Typed deck/session/transcript/evidence persistence: Task 2.
- Reliable `.pptx`/`.ppt`/`.pdf` intake and Windows PowerPoint fallback: Task 3.
- Overview and full-width upload/review experience: Task 4.
- Diagnostic/Mock and Rigorous/Supportive setup only: Task 5.
- Voice-first spoken examiner, no synthesized-audio contamination, TTS failure/replay: Task 6.
- Slide-first diagnostic/mock room and fair slide-reliance evidence: Task 7.
- Traceable report and retry drill: Task 8.
- Primary-route cutover, cleanup, responsive/theme/manual/full verification: Task 9.

### Placeholder scan

The plan contains no deferred implementation markers. Each task lists exact paths, exported boundaries, failing tests, validation commands, expected outcomes, and a scoped commit command.

### Type consistency

`TranscriptSegment`, `ExaminerEvent`, `DeckContext`, `DefenseReport`, `ExaminerStance`, `spokenBySlide`, `createExaminerEventSchema`, and `useExaminerVoice` are defined before their later consumers. The report only receives persisted presenter/examiner segments; reading analysis consumes the presenter-only `spokenBySlide` output.
