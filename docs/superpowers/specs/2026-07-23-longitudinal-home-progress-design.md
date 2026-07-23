# Phase 8 — Longitudinal: Home + Progress (Design)

**Status:** Approved (2026-07-23). Slice 1, Phase 8 (final) of the Sparring Partner simulator/coaching build.
**PRD:** `docs/superpowers/specs/2026-07-21-sparring-partner-product-prd.md` (§3 moat pillar 2, §4 Home/Progress, §5.4 longitudinal).
**Branch:** `simulator-coaching`, continuing from the Phase 7 tip.

---

## 1. Goal

Make the coach remember you across sessions. Feed each grounded report into the persistent `SpeakerProfile`, then surface it: **Home** shows the single "work on this next," and **Progress** shows per-dimension growth, the recurring-weakness profile, and session history. This delivers the moat sentence — *"fillers down over 3 sessions, but you still rush your closings"* — made visible.

## 2. What already exists (Phase 1 — reuse, do not rebuild)

`src/features/coaching/speaker-profile.ts` (pure, tested): `applyOutcomeToProfile(profile, outcome)` (running per-dimension baselines + recurring-weakness counting, sorted by count), `deriveNextFocus` (top recurring weakness, else lowest-average dimension). `speaker-profile-repository.ts`: `getOrCreateProfile(userId)`, `recordSessionOutcome(userId, outcome)`. The `SessionOutcome` shape is `{ sessionId, dimensions: Record<string, number>, weaknesses: string[], completedAt: string }`.

## 3. Decisions (binding)

- **Dimensions are grounded**, deterministic functions of `CoachingMetrics` — never model opinion. A dimension whose source metric is null/absent is **omitted**, never faked, so baselines average only real evidence.
- **Higher = better, 0–100** for every dimension (so `deriveNextFocus`'s "lowest average" is meaningful).
- **The diff runs once per session** — idempotent via an additive `Session.outcomeRecorded` flag; regeneration never double-counts.
- **Only sessions with real evidence are recorded** (at least one dimension or one weakness); a no-speech session doesn't inflate baselines or `totalSessions`.
- **Progress trends derive from each session's stored report** (no new per-session storage) — the profile gives the summary + next focus; the per-session series gives the growth lines.
- **Streak is NOT surfaced** this phase (PRD reserves it for the later daily-practice loop).
- Charts are **self-contained inline SVG** sparklines (no chart library), styled per the `dataviz` skill.

## 4. Grounded metric → dimension model — `src/features/coaching/session-outcome.ts` (pure, tested)

```
dimensionsFromMetrics(metrics: CoachingMetrics): Record<string, number>
```
Producing 0–100 scores, each omitted when its source is unavailable:
- **fluency** — `metrics.fillerPerMin === null` → omit; else `round(clamp(100 - fillerPerMin * 6, 0, 100))`. (0 fillers → 100; ~16.7/min → 0.)
- **ownWords** — `spoken = metrics.slideTimes.length`; `spoken === 0` → omit; else `round(100 - (metrics.verbatimSlides / spoken) * 100)`. (Judged only against slides actually presented — grounded and fair.)
- **questionHandling** — `metrics.questionsHandled.total === 0` → omit; else `round(handled / total * 100)`.
- **pace** — `metrics.paceWpm === null` → omit; else `paceScore(paceWpm)`: 100 inside the ideal band [110, 160]; linear falloff to 0 at 60 (slow) and at 220 (fast); clamped 0–100.

```
buildSessionOutcome(input: { sessionId; metrics: CoachingMetrics; weaknessLabels: string[]; completedAt: string }): SessionOutcome
```
Returns `{ sessionId, dimensions: dimensionsFromMetrics(metrics), weaknesses: weaknessLabels, completedAt }`. `weaknessLabels` are the validated finding **titles** (they become `recurringWeaknesses`). `hasEvidence(outcome)` helper → `Object.keys(dimensions).length > 0 || weaknesses.length > 0` gates recording.

## 5. Wiring the diff — `src/app/api/defense/report/route.ts` + schema

- **Schema (additive):** `Session.outcomeRecorded Boolean @default(false)`. Migration + the coaching schema-lock test updated.
- After the report is assembled and cached (both the full and minimal branches), if `!session.outcomeRecorded`:
  - build the outcome via `buildSessionOutcome({ sessionId, metrics: report.metrics, weaknessLabels: <validated finding titles>, completedAt: new Date().toISOString() })`;
  - if `hasEvidence(outcome)`: `await recordSessionOutcome(identity.userId, outcome)`, then (only on success) `await db.session.update({ where: { id }, data: { outcomeRecorded: true } })` — record first, flag second, so a failed record is retried on the next view rather than silently marked done;
  - the whole block is wrapped in try/catch and logged — non-fatal, so the report still returns even if the profile write fails.
- `weaknessLabels`: the full-report path passes `parsed.data.findings.map(f => f.title)`; the minimal path passes `[]`.

## 6. Read side

- **`GET /api/profile`** (new): auth-guarded; returns `getOrCreateProfile(identity.userId)` as JSON (`{ nextFocus, recurringWeaknesses, dimensionBaselines, totalSessions }`; omit/ignore `streak` in the UI). A small `useSpeakerProfile()` hook (mirrors `useDefenseSessions`) fetches it for Home + Progress.
- **`GET /api/sessions`** (extend, additive): add `dimensions?: Record<string, number>` per session, computed from that session's cached `coachingReport.metrics` via `dimensionsFromMetrics`. Existing consumers (Home `buildTodayModel`, Progress `buildReviewRows`) ignore the new field.

## 7. Progress model — `src/features/coaching/progress-model.ts` (pure, tested)

```
buildProgressModel(profile: SpeakerProfileData, sessions: Array<{ id; title; createdAt; status; dimensions?: Record<string,number> }>):
  { totalSessions; nextFocus; series: { dimension; points: { label; value }[]; delta: 'up'|'down'|'steady' }[]; recurringWeaknesses; history: { id; title; date; href }[] }
```
- `series`: for each dimension present across sessions, the chronological (oldest→newest) list of that dimension's per-session values (completed sessions with a value for it); `delta` = sign of (last − first) with a small deadband → steady. Dimensions with fewer than 2 points still render a flat/single-point spark.
- `recurringWeaknesses`: straight from `profile.recurringWeaknesses` (label, count, lastSeen).
- `history`: completed/loggable sessions newest-first, each linking to `/reports/[id]`.
- Empty state (no completed sessions) returns empty series/history and a friendly next-focus fallback.

## 8. Home — `src/app/dashboard/page.tsx` + a `NextFocusCard`

Above the existing `StudioDesk`, render a prominent **"Work on this next"** card from `profile.nextFocus` (with a short grounded subline, e.g. the top recurring weakness's count when present). When there's no profile yet (first-time user, empty `nextFocus`), show an inviting first-run line instead ("Run your first rehearsal to start building your coach profile"). `StudioDesk` is unchanged; the card is additive. Fetched via `useSpeakerProfile`.

## 9. Progress — `src/app/review/page.tsx` (the "Progress" nav) → `ProgressWorkspace`

Rebuild the page (currently `ReviewWorkspace`) into `ProgressWorkspace`, composed of:
- **Header** — sessions count + next focus.
- **Growth** — a `DimensionSparkline` per dimension (inline SVG polyline + ↑/↓/steady delta chip + current value), from `series`.
- **Recurring weaknesses** — label + count + last-seen, cobalt/amber dot per the soft-depth status recipe.
- **History** — the session list, reusing `buildReviewRows` (kept) rendered as rows linking to each report.
- Empty state — dashed card inviting a first rehearsal.

The page fetches sessions (`useDefenseSessions`, now carrying `dimensions`) + profile (`useSpeakerProfile`), keeps the existing `role="alert"`/`role="status"`/`shouldResyncAfterAuth` scaffolding, and renders `<AppShell active="progress">`. `ReviewWorkspace` is retired once `ProgressWorkspace` renders (check importers first); `buildReviewRows` stays (reused for history). The `/review` page test is updated to the new component (legitimate — Progress supersedes Review); the `shouldResyncAfterAuth` unit tests are unaffected.

## 10. Charts (`DimensionSparkline`, per `dataviz`)

A small presentational component: given `points: {label,value}[]` (0–100), render an inline `<svg>` polyline within a fixed viewBox, a baseline, and the latest point emphasized; a text delta chip (↑ improving / ↓ slipping / steady) and the current value. Accessible: `role="img"` + an `aria-label` summarizing the trend (e.g. "Fluency: 62 to 84 over 4 sessions, improving"). Theme-aware via existing tokens; cobalt stroke; no external library. Single-point series render a dot + "New" label rather than a line.

## 11. Testing

**Pure units (fully tested):**
- `session-outcome.test.ts` — each dimension's normalization + null-omission; `paceScore` band + falloff + clamp; `buildSessionOutcome` mapping; `hasEvidence`.
- `progress-model.test.ts` — series chronological ordering, delta sign + deadband, single-point handling, history mapping, empty state.
- Report-route wiring — idempotency (record-once given `outcomeRecorded`) and the evidence gate, where pure-extractable; if hard to unit-test in the route, extract the "should record?" decision into a tiny pure helper and test that.

**Component (`renderToStaticMarkup`):** `NextFocusCard` (focus text + first-run fallback), `DimensionSparkline` (svg + aria-label + delta + single-point), `ProgressWorkspace` (header, growth, weaknesses, history, empty state). Encoding gotcha `'`→`&#x27;`, `&`→`&amp;`.

**Route/hook:** `GET /api/profile` shape + auth; `/api/sessions` `dimensions` addition (source-substring or a small parse test). `useSpeakerProfile` follows the no-jsdom convention (source-substring where needed).

**Live (in-browser):** complete two sessions with speech → Home shows a real next-focus; Progress shows a growing sparkline, the recurring weakness with its count, and history rows linking to reports. Confirm a no-speech session does not increment `totalSessions`.

The existing full suite stays green; the only prior test updated is `/review/page.test.ts` (contract superseded by Progress).

## 12. Files

**New:** `src/features/coaching/session-outcome.ts` (+test), `src/features/coaching/progress-model.ts` (+test); `src/app/api/profile/route.ts` (+test); `src/hooks/use-speaker-profile.ts`; `src/features/defense/components/next-focus-card.tsx`, `progress-workspace.tsx`, `dimension-sparkline.tsx` (+tests).
**Edited:** `prisma/schema.prisma` (+ `Session.outcomeRecorded`) + `src/features/coaching/prisma-schema.test.ts`; `src/app/api/defense/report/route.ts` (record outcome, idempotent); `src/app/api/sessions/route.ts` (+`dimensions`) + its test; `src/app/dashboard/page.tsx` (NextFocusCard); `src/app/review/page.tsx` (+`ProgressWorkspace`) + `src/app/review/page.test.ts`.
**Retired when superseded:** `ReviewWorkspace` (`review-workspace.tsx`) + its test, once `ProgressWorkspace` renders (grep importers first; `buildReviewRows` stays).
**Reused unchanged:** the whole Phase-1 coaching engine (`speaker-profile.ts`, `speaker-profile-repository.ts`), `buildReviewRows`, `useDefenseSessions`, `authenticateRequest`, soft-depth recipes.

## 13. Out of scope (later phases)

- Streak / daily-practice loop / challenges; interview mode.
- Per-session dimension storage / a dedicated analytics warehouse (trends derive from stored reports for now).
- Timeline-synced deep analytics beyond the sparklines.
