# Thesis Defense Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reliable, slide-grounded thesis Defense Simulator with PowerPoint support and evidence-based slide-reading detection.

**Architecture:** Move product rules into pure `src/features/defense` modules. A normalized deck context retains each slide's text and image from upload through evaluation, and deterministic phrase-overlap analysis supplies reading evidence to the LLM. The UI renders the explicit `prepare | present | challenge | brief` lifecycle for `diagnostic` and `mock` modes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, Prisma/SQLite, Zod, Vitest, LibreOffice, pdfplumber/pypdfium2.

## Global Constraints

- Thesis/capstone defense is the only primary experience; existing interview, impromptu, lecture, persona, screen-share, and multi-judge paths must not appear in the main journey.
- Accept `.pptx`, `.ppt`, and `.pdf`; preserve ordered per-slide extracted text and image URLs.
- Use a calm academic rehearsal-room visual system, not chat bubbles, avatar gimmicks, dark-neon gradients, or generic dashboard card grids.
- Do not persist raw audio by default.
- Every behavior change begins with a failing Vitest test and ends with the relevant tests passing.
- Stage only files from the stated task; preserve all unrelated user worktree changes.

---

### Task 1: Add tests and Defense contracts

**Files:** Create `vitest.config.ts`, `src/features/defense/types.ts`, `src/features/defense/session-schema.ts`, `src/features/defense/session-schema.test.ts`. Modify `package.json`.

**Produces:** `DefenseMode = 'diagnostic' | 'mock'`, `SlideContext`, `DeckContext`, `ReadingEvidence`, `DefenseFinding`, and `createDefenseSessionSchema`.

- [ ] **Step 1: Write a failing schema test**

```ts
it('requires at least one grounded slide', () => {
  expect(() => createDefenseSessionSchema.parse({ title: 'Thesis', mode: 'mock', deck: { sourceName: 'x.pptx', slides: [] } })).toThrow(/slide/i);
});
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/features/defense/session-schema.test.ts`

Expected: FAIL because the test command and schema do not exist.

- [ ] **Step 3: Implement the contract**

```ts
export const createDefenseSessionSchema = z.object({
  title: z.string().trim().min(1).max(180), mode: z.enum(['diagnostic', 'mock']),
  userId: z.string().nullable().optional(),
  deck: z.object({ sourceName: z.string().min(1), slides: z.array(z.object({ index: z.number().int().positive(), text: z.string(), imageUrl: z.string().min(1) })).min(1) }),
});
```

Add `"test": "vitest run"` and `vitest` as a development dependency.

- [ ] **Step 4: Verify green and commit**

Run: `npm run test -- src/features/defense/session-schema.test.ts`

Expected: PASS.

Commit: `git add package.json package-lock.json vitest.config.ts src/features/defense/types.ts src/features/defense/session-schema.ts src/features/defense/session-schema.test.ts && git commit -m "test: establish defense session contracts"`

### Task 2: Build deterministic slide-reading evidence

**Files:** Create `src/features/defense/reading-analysis.ts`, `src/features/defense/reading-analysis.test.ts`.

**Consumes:** `SlideContext`, `ReadingEvidence`. **Produces:** `analyseReading(slides, spokenBySlide)` and `readingScore(evidence)`.

- [ ] **Step 1: Write failing behavior tests**

```ts
it('flags copied slide phrases', () => {
  const [item] = analyseReading([{ index: 1, imageUrl: '/1', text: 'A randomized controlled trial measured learning gains across 120 students.' }], { 1: 'A randomized controlled trial measured learning gains across 120 students.' });
  expect(item.overlap).toBeGreaterThan(0.8);
});
it('credits an original explanation', () => {
  expect(readingScore(analyseReading([{ index: 1, imageUrl: '/1', text: 'A randomized controlled trial measured learning gains across 120 students.' }], { 1: 'We split 120 students into two groups to see whether our method helped them learn more.' }))).toBeGreaterThan(75);
});
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/features/defense/reading-analysis.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement n-gram overlap**

Normalize to lowercase alphanumeric terms, remove common stop words, calculate five-word grams from slide text and speech, and report matching phrases, overlap ratio, and explanatory connectors (`because`, `for example`, `which means`, `in practice`). Calculate `readingScore` as `clamp(100 - averageOverlap * 100 + explanationBonus, 0, 100)`.

- [ ] **Step 4: Verify green and commit**

Run: `npm run test -- src/features/defense/reading-analysis.test.ts`

Expected: PASS.

Commit: `git add src/features/defense/reading-analysis.ts src/features/defense/reading-analysis.test.ts && git commit -m "feat: detect slide reading with evidence"`

### Task 3: Normalize PowerPoint and PDF uploads

**Files:** Create `src/features/defense/upload.ts`, `src/features/defense/upload.test.ts`. Modify `src/app/api/upload-presentation/route.ts`.

**Consumes:** Existing LibreOffice/Python conversion tools. **Produces:** `DeckContext` response `{ deck: { sourceName, slides } }`.

- [ ] **Step 1: Write failing validation tests**

```ts
expect(validateDeckUpload({ name: 'defense.PPTX', size: 2_000_000 })).toEqual({ ok: true });
expect(validateDeckUpload({ name: 'notes.docx', size: 2_000_000 })).toMatchObject({ ok: false });
expect(validateDeckUpload({ name: 'large.pdf', size: 26 * 1024 * 1024 })).toMatchObject({ ok: false });
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/features/defense/upload.test.ts`

Expected: FAIL because validation is missing.

- [ ] **Step 3: Implement secure deck ingestion**

```ts
export function validateDeckUpload(file: Pick<File, 'name' | 'size'>) {
  if (!/\.(pptx|ppt|pdf)$/i.test(file.name)) return { ok: false as const, error: 'Upload a PowerPoint or PDF deck.' };
  if (file.size > 25 * 1024 * 1024) return { ok: false as const, error: 'Decks must be 25 MB or smaller.' };
  return { ok: true as const };
}
```

Convert `.ppt`/`.pptx` with `soffice --headless --convert-to pdf`, validate that a PDF exists, then extract and render every PDF page (maximum 30) as `{ index, text, imageUrl }`. Return `400` for invalid files and `503` with `PowerPoint conversion is temporarily unavailable.` when LibreOffice fails. Delete temp files in `finally`.

- [ ] **Step 4: Verify green and commit**

Run: `npm run test -- src/features/defense/upload.test.ts && npx tsc --noEmit`

Expected: PASS and zero TypeScript errors.

Commit: `git add src/features/defense/upload.ts src/features/defense/upload.test.ts src/app/api/upload-presentation/route.ts && git commit -m "feat: preserve slide context from deck uploads"`

### Task 4: Persist Defense sessions and evidence-based results

**Files:** Modify `prisma/schema.prisma`, `src/app/api/session/route.ts`, `src/app/api/score/route.ts`. Create `src/features/defense/evaluation.ts`, `src/features/defense/evaluation.test.ts`.

**Consumes:** Session contract, stored `DeckContext`, transcript, reading evidence. **Produces:** Three structured defense findings with direct evidence and drills.

- [ ] **Step 1: Write a failing prompt test**

```ts
const prompt = buildDefenseEvaluationPrompt({ title: 'Thesis', mode: 'mock', deckText: 'Methods', transcript: 'Methods', readingEvidence: [{ slideIndex: 1, overlap: 0.9, copiedPhrases: ['the methods'], explanationSignals: [] }] });
expect(prompt).toContain('Do not infer verbatim reading without this evidence');
expect(prompt).toContain('0.9');
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/features/defense/evaluation.test.ts`

Expected: FAIL because evaluation builder does not exist.

- [ ] **Step 3: Implement persistence and strict evaluation**

Add `mode String @default("diagnostic")`, `deckContext String @default("{}")`, and `findings String @default("[]")` to `Session`. Parse session creation with `createDefenseSessionSchema`. `buildDefenseEvaluationPrompt` must require `{ readiness, readingScore, summary, findings }`, exactly three `{ title, risk, evidence, slideIndex, drill }` findings, and state `Do not infer verbatim reading without this evidence.` Validate the response with Zod before persisting it. Keep legacy score fields populated until the report migration completes.

- [ ] **Step 4: Verify green and commit**

Run: `npx prisma generate && npm run test -- src/features/defense/evaluation.test.ts && npx tsc --noEmit`

Expected: PASS.

Commit: `git add prisma/schema.prisma src/app/api/session/route.ts src/app/api/score/route.ts src/features/defense/evaluation.ts src/features/defense/evaluation.test.ts && git commit -m "feat: save evidence-based defense findings"`

### Task 5: Replace generic setup with Defense preparation

**Files:** Create `src/features/defense/components/prepare-defense.tsx`, `mode-choice.tsx`, and tests. Modify `src/app/practice/page.tsx`, `src/components/upload-section.tsx`, `src/lib/store.ts`.

**Consumes:** Upload response and `DefenseMode`. **Produces:** One slide-required preparation flow.

- [ ] **Step 1: Write failing mode-copy test**

```tsx
render(<ModeChoice value="diagnostic" onChange={() => {}} />);
expect(screen.getByText('Pause at the first material weakness.')).toBeInTheDocument();
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/features/defense/components/mode-choice.test.tsx`

Expected: FAIL because the component is absent.

- [ ] **Step 3: Implement prepare UI**

Install React Testing Library and jsdom. Limit client state to `mode`, `deck`, `sessionId`, and `phase`. Render this exact copy: `Upload your PowerPoint or PDF deck. Your examiner uses it to test what you explained - and what you did not.` Render a compact receipt with filename, slide count, and three thumbnails. Disable the primary action until title and deck are valid. Its label is `Begin diagnostic practice` or `Begin mock defense`.

- [ ] **Step 4: Verify green and commit**

Run: `npm run test -- src/features/defense/components/mode-choice.test.tsx && npm run lint && npx tsc --noEmit`

Expected: PASS.

Commit: `git add package.json package-lock.json vitest.config.ts src/features/defense/components src/app/practice/page.tsx src/components/upload-section.tsx src/lib/store.ts && git commit -m "feat: add defense preparation flow"`

### Task 6: Implement Diagnostic Practice and Mock Defense stage behavior

**Files:** Create `defense-stage.tsx`, `examiner-challenge.tsx`, tests under `src/features/defense/components`. Modify `src/components/present-section.tsx`, `src/components/qna-section.tsx`.

**Consumes:** mode, slide, transcript events, voice engine. **Produces:** Single-examiner stage.

- [ ] **Step 1: Write failing mode behavior tests**

```tsx
render(<DefenseStage mode="diagnostic" activeSlide={slide} challenge={challenge} onFinish={() => {}} />);
expect(screen.getByRole('heading', { name: 'Examiner challenge' })).toBeInTheDocument();
render(<DefenseStage mode="mock" activeSlide={slide} challenge={challenge} onFinish={() => {}} />);
expect(screen.queryByRole('heading', { name: 'Examiner challenge' })).not.toBeInTheDocument();
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/features/defense/components/defense-stage.test.tsx`

Expected: FAIL because `DefenseStage` does not exist.

- [ ] **Step 3: Implement the focused stage**

Use a top bar (mode, timer, mic), main slide, narrow progress rail, and recording control. In Diagnostic mode, pause once on a material weakness and show `Examiner challenge` with `Answer the question` and `Continue presenting`. In Mock mode suppress interruptions until presentation end, then run one professor-led Q&A. Do not render a panel of avatars or chat bubbles.

- [ ] **Step 4: Verify green and commit**

Run: `npm run test -- src/features/defense/components/defense-stage.test.tsx && npm run build`

Expected: PASS and production build success.

Commit: `git add src/features/defense/components src/components/present-section.tsx src/components/qna-section.tsx && git commit -m "feat: add diagnostic and mock defense stages"`

### Task 7: Build the defense brief, progress history, and unique visual system

**Files:** Create `defense-brief.tsx` and tests. Modify `src/components/scoring-dashboard.tsx`, `src/app/dashboard/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`.

**Consumes:** `readiness`, `readingScore`, and findings. **Produces:** A marked-up defense brief and academic rehearsal-room visual language.

- [ ] **Step 1: Write failing report and token tests**

```tsx
render(<DefenseBrief readiness={72} readingScore={54} findings={[{ title: 'Defend your baseline', risk: 'high', evidence: 'You named no comparison method.', slideIndex: 6, drill: 'Give a 30-second baseline answer.' }]} />);
expect(screen.getByText('Highest-risk defense question')).toBeInTheDocument();
```

```ts
expect(fs.readFileSync('src/app/globals.css', 'utf8')).toContain('--paper:');
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/features/defense/components/defense-brief.test.tsx src/features/defense/visual-system.test.ts`

Expected: FAIL because brief and tokens do not exist.

- [ ] **Step 3: Implement the brief and visual design**

Show `Readiness`, `Highest-risk defense question`, `What your examiner heard`, and `Rehearse next`. Present reading evidence as `Explained in your own words`, never as an unexplained numeric verbatim score. Link findings to slide number and offer `Practice this answer`. Replace generic white/black/indigo SaaS variables with `--paper`, `--ink`, `--muted-ink`, `--line`, and `--signal`; use warm off-white, charcoal, one restrained deep signal color, editorial display type, and high-contrast focus states. The dashboard lists latest readiness and recurring risks per deck instead of eye-contact/posture cards.

- [ ] **Step 4: Run full verification and commit**

Run: `npm run test && npm run lint && npx tsc --noEmit && npm run build`

Expected: every command exits 0.

Manually verify `.pptx` upload, diagnostic interruption, mock no-interruption behavior, evidence-to-slide linking, dashboard persistence after refresh, and 390px responsive layout.

Commit: `git add src/features/defense src/components/scoring-dashboard.tsx src/app/dashboard/page.tsx src/app/globals.css src/app/layout.tsx && git commit -m "feat: polish thesis defense simulator experience"`
