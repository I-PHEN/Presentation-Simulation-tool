# Slice 2 Part B — One Entry Point (IA Consolidation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Inline execution, checkpoints per task.

**Goal:** Collapse the redundant deck-intake entry points into one clear structure — Rehearse is the single place you START a rehearsal (with a Deck | Topic source step), Home is the single dashboard, Progress is review — and stop implying every rehearsal needs slides.

**Architecture:** `/decks/new` (already the real setup page) becomes the "Rehearse" nav destination and gains a Step-0 source picker. The redundant `/practice` PracticeHub is retired; its "resume active + recent sessions" folds into Home's `StudioDesk` via an extended `TodayModel`. The separate "New programme" sidebar button is removed (Rehearse now serves that role). Topic source renders an honest "coming next" placeholder that Part C replaces with the real `TopicSetup`.

**Tech Stack:** Next.js 16 App Router, React 19, TS, Tailwind v4 tokens, Vitest (`renderToStaticMarkup`, node env).

## Global Constraints
- Branch `slice-2-topic-mode`. Never stage unrelated dirty worktree files.
- Test edits are allowed here — the IA is intentionally changing — but only to OUR own copy/route locks, and only to reflect the new structure. Do not gut assertions; re-express them for the new IA. Keep every anti-fabrication / accessibility lock intact.
- `RehearseSetup` stays deck-only and must keep NOT rendering `Coming soon` / `Topic prompt` (rehearse-setup.test lock). The Topic placeholder is a SEPARATE component rendered by the page, never inside `RehearseSetup`.
- Route files stay free of the `Progress` / `CoachHome` / `dashboard#trajectory` substrings (app-shell.test ban list).

---

## Task 1: Rehearse source step (additive)

**Files:**
- Create: `src/features/defense/components/rehearse-source-picker.tsx`
- Create: `src/features/defense/components/rehearse-source-picker.test.tsx`
- Modify: `src/app/decks/new/page.tsx` (add source state + picker + conditional body)

**Interfaces:**
- Produces: `RehearseSourcePicker({ source, onSelect })` where `source: RehearseSource = 'deck' | 'topic'`; `TopicComingSoon()` placeholder.

- [ ] `RehearseSourcePicker` — presentational segmented control. Two options: **Deck** ("Present slides you'll defend") and **Topic** ("Speak to a topic — no slides"). `aria-pressed` on each; selected gets `border-primary bg-accent`. Emits `onSelect(value)`.
- [ ] `TopicComingSoon` — soft-depth card: heading "Topic mode is coming next", body explaining you'll be able to rehearse a spoken Q&A without slides, and that Deck is available now. Purely presentational.
- [ ] Test (`renderToStaticMarkup`): picker renders both `Deck` and `Topic` labels; the selected option carries `aria-pressed="true"`; placeholder renders "coming next".
- [ ] Wire `/decks/new/page.tsx`: `const [source, setSource] = useState<RehearseSource>('deck')`; render `<RehearseSourcePicker source={source} onSelect={setSource} />` above the body; body = `source === 'deck' ? <RehearseSetup .../> : <TopicComingSoon />`. Keep `active="rehearse"`, all existing deck handlers, `SignInRecovery`. Do NOT introduce the `Progress` substring.
- [ ] Run `npx vitest run` → all green (new tests pass, nothing breaks).
- [ ] Commit: `feat: Rehearse gains a Deck|Topic source step (Topic placeholder)`

## Task 2: Consolidate hubs into Home + Rehearse

**Files:**
- Modify: `src/features/defense/studio-session-model.ts` (add `recent` to `TodayModel`; rename intake label; delete `buildPracticeModel`/`PracticeModel`)
- Modify: `src/features/defense/studio-session-model.test.ts`
- Modify: `src/features/defense/components/studio-desk.tsx` (recent list + source-neutral empty copy)
- Modify: `src/features/defense/components/studio-desk.test.tsx`
- Modify: `src/features/defense/components/app-shell.tsx` (Rehearse → `/decks/new`; remove New programme)
- Modify: `src/features/defense/components/app-shell.test.tsx`
- Replace: `src/app/practice/page.tsx` → redirect to `/dashboard`
- Delete: `src/features/defense/components/practice-hub.tsx`, `practice-hub.test.tsx`

**Interfaces:**
- Consumes: `PracticeRow`, `resolveAction` (existing, private).
- Produces: `TodayModel` now includes `recent: PracticeRow[]`.

- [ ] Model: rename `IMPORT_DECK_ACTION` label `'Import deck'` → `'Start rehearsing'` (href unchanged `/decks/new`). Add `recent: PracticeRow[]` to `TodayModel`; `buildTodayModel` maps `sessions.slice(1)` through `resolveAction` (mirrors the retired `buildPracticeModel`), returns `recent: []` in the empty case. Delete `PracticeModel` type + `buildPracticeModel`.
- [ ] Model test: update `buildTodayModel` empty + deck-less assertions to `'Start rehearsing'`; add a `recent` assertion; update `buildReviewRows` deck-less row to `'Start rehearsing'`; delete the entire `buildPracticeModel` describe block.
- [ ] `StudioDesk`: after the hero/deck sections, render a `Recent sessions` section (port PracticeHub markup: `<ul className="divide-y ...">`, each row title + status label + `ghost` action link) guarded by `model.recent.length > 0`. Soften empty-state copy so it does not imply slides are required (e.g. "Set up your next rehearsal — bring a deck or speak to a topic."). Keep all existing coach-note/report/preview logic and negative locks.
- [ ] `studio-desk.test`: `'Import deck'` → `'Start rehearsing'` in fixtures + assertions; add a fixture with `recent` and assert the recent title + its action href render; keep negative locks (`Daily speaking challenge`, `Your coach will leave a note here`, `Coach note` omission).
- [ ] `app-shell.tsx`: change the Rehearse nav item `href` `'/practice'` → `'/decks/new'`. Remove `NewProgrammeAction` from both the desktop rail footer and the mobile drawer; remove the now-unused `Plus` import and the footer `<div>` wrapper. Nav landmark, collapse control, ThemeToggle/AccountMenu placement all unchanged.
- [ ] `app-shell.test`: line asserting `href="/practice"` → `href="/decks/new"`. Rewrite the "New programme action outside primary navigation" test: the nav now legitimately links to `/decks/new` via Rehearse; assert the three destinations render and the shell no longer renders `New programme`. Keep all other locks (`aria-label="Primary navigation"`, `aria-current`, collapse, account menu, theme toggle, Progress ban list — `practice/page.tsx` stays in the list).
- [ ] `src/app/practice/page.tsx` → minimal server redirect: `import { redirect } from 'next/navigation'; export default function PracticePage() { redirect('/dashboard'); }`. (No `Progress`/`CoachHome` substrings; still readable by the ban-list test.)
- [ ] Delete `practice-hub.tsx` + `practice-hub.test.tsx`.
- [ ] Grep for stragglers: `Import deck`, `New programme`, `buildPracticeModel`, `PracticeHub` — resolve every reference.
- [ ] Run `npx vitest run` → all green.
- [ ] Commit: `feat: single Rehearse entry point; Home absorbs resume + recent, retire Practice hub`

## Task 3: Verify + finish

- [ ] `npx vitest run` → full suite green.
- [ ] `npm run build` → exit 0.
- [ ] Manual smoke (dev): Home shows dashboard + recent (if any); Rehearse nav lands on the setup page with Deck|Topic step; Topic shows the placeholder; Deck upload still works end-to-end; `/practice` redirects to Home.
- [ ] Update the ledger (`.superpowers/sdd/progress.md`) with the Part B section.
- [ ] Report; hand off to Part C.

## Reuse
`resolveAction`/`PracticeRow` (studio-session-model), `buttonVariants`/`cn`, `AppShell`, existing `RehearseSetup` + deck handlers, soft-depth token recipes (Card `rounded-xl border border-border bg-card p-6 shadow-e1`, radio-card selected `border-primary bg-accent`).
