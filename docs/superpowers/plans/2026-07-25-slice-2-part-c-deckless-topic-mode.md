# Slice 2 Part C — Deckless Topic Mode + Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Inline, commit per task, keep the suite green.

**Goal:** Capture interests at first run, recommend tailored speaking topics, and run a slide-free rehearsal (spoken Q&A with the AI panel) that flows into the *same* grounded coaching report and longitudinal profile as deck rehearsals — with the deck-only signals honestly omitted.

**Architecture:** Reuse the Slice-1 simulator engine, report pipeline, and longitudinal diff unchanged. A topic session is a normal `practiceMode: 'defense'` row discriminated by a new `source: 'topic'` column and modeled to the engine as a synthetic one-card deck (card text = the topic). Branch on `source` only where behaviour must differ: the room stage (TopicStage vs SlideStage), the report's evaluation prompt (transcript-validated reasoning findings, never slide_reliance), the metrics honesty (`deckless` omits ownWords/verbatimSlides), and Home framing.

**Tech Stack:** Next.js 16 App Router, React 19, TS, Prisma+SQLite, Zod, getZAI (OpenAI-compatible), Vitest (renderToStaticMarkup + vi.mock, node env).

## Global Constraints
- Branch `slice-2-topic-mode`. Never stage unrelated dirty worktree files.
- **Discriminator decision (deviates from spec §C5 on purpose):** topic sessions keep `practiceMode: 'defense'` so they flow through `/api/sessions`, `/api/session/[id]`, and `/api/defense/report` without widening those guards; `source` ('deck' | 'topic') is the discriminator. Set `source='deck'` on deck sessions explicitly.
- **Honesty (non-negotiable):** a topic session must never display or record deck-only signals. `ownWords`/`verbatimSlides` OMIT via an explicit `deckless` flag (not via empty inputs — the synthetic card has speech). Topic findings validate `presenterQuote` against the transcript and use `basis: 'response_explanation'` only. Home must not show a "Slide N" cue or slide preview for a topic session.
- Route files stay free of `Progress` / `CoachHome` / `dashboard#trajectory` (app-shell.test ban list; `/welcome` is NOT in that list but keep it clean anyway).
- getZAI failures are non-fatal where the spec says so (`/api/topics` → default set; report → existing minimal-report fallback).

## Interfaces produced (cross-task contract)
- `CoachingMetrics` gains `deckless: boolean`.
- `computeCoachingMetrics({ deck, transcriptSegments, examinerEvents, deckless })` — `deckless` defaults `false`.
- `dimensionsFromMetrics(metrics)` — omits `ownWords` when `metrics.deckless`.
- `assembleCoachingReport({ ..., deckless })`.
- `Session.source`, `Session.topic`; topic session synthetic deck: `{ sourceName: topic, slides: [{ index: 1, text: topic, imageUrl: 'topic' }] }`.
- `INTEREST_OPTIONS: string[]`, `normalizeInterests(list)`, `toggleInterest(set, label)`, `addCustomInterest(set, raw)`.
- `buildTopicsPrompt(interests)`, `parseTopicsResponse(raw)`, `DEFAULT_TOPICS`.
- `buildTopicEvaluationPrompt({ topic, transcript, examinerEvents })`.
- `buildTopicSessionPayload({ topic, mode, stance })` → `{ topic, mode, stance }`.

---

## Task 1: Schema — interests, onboarding, session source/topic

**Files:** Modify `prisma/schema.prisma`; Modify `src/features/coaching/prisma-schema.test.ts`.

- [ ] Add to `User`: `interests String @default("[]")`, `onboardedAt DateTime?`.
- [ ] Add to `Session`: `source String @default("deck")`, `topic String?`.
- [ ] Extend schema-lock test: assert `interests`, `onboardedAt`, `Session` has `source ... @default("deck")` and `topic`.
- [ ] Run `npm run db:push` then `npm run db:generate`. (Additive; existing rows default `deck`/empty.)
- [ ] `npx vitest run src/features/coaching/prisma-schema.test.ts` → green. Commit `feat: schema adds user interests/onboardedAt + session source/topic`.

## Task 2: `GET/PUT /api/me`

**Files:** Create `src/app/api/me/route.ts`; Create `src/app/api/me/route.test.ts`; Create `src/features/onboarding/interests.ts` (pure) + `src/features/onboarding/interests.test.ts`.

**Interfaces:** Produces `INTEREST_OPTIONS`, `normalizeInterests(list: unknown): string[]` (trim, dedupe case-insensitively, drop empties, cap length 12 items / 40 chars each), `toggleInterest`, `addCustomInterest`.

- [ ] `interests.ts`: `INTEREST_OPTIONS` (curated ~12: e.g. 'Artificial intelligence','Climate & sustainability','Startups & entrepreneurship','Public health','Education','Economics & finance','Space & astronomy','Psychology','Design & product','Ethics & philosophy','History','Sports'). `normalizeInterests(list)` accepts unknown, returns clean string[]. `toggleInterest(current: string[], label): string[]`. `addCustomInterest(current: string[], raw: string): string[]` (normalize + append if new).
- [ ] `interests.test.ts`: normalize dedupes case-insensitively + caps; toggle adds/removes; addCustom trims + ignores dup/empty.
- [ ] `/api/me` GET: auth; upsert user row; return `{ interests: string[], onboardedAt: string | null }` (parse stored JSON via normalizeInterests).
- [ ] `/api/me` PUT: auth; body `{ interests?: unknown, onboarded?: boolean }`; normalize interests; if `onboarded` true and `onboardedAt` currently null, stamp `new Date()`; persist; return the updated `{ interests, onboardedAt }`.
- [ ] `route.test.ts` (vi.mock `@/lib/db`, `@/lib/server-auth`): GET returns normalized interests; PUT saves normalized interests + stamps onboardedAt once (idempotent); auth failure short-circuits.
- [ ] Suite green. Commit `feat: /api/me reads+writes interests and onboarding stamp`.

## Task 3: Onboarding — InterestsPicker + `/welcome` + first-run guard

**Files:** Create `src/features/onboarding/interests-picker.tsx` + `.test.tsx`; Create `src/app/welcome/page.tsx`; Create `src/features/onboarding/use-onboarding.ts` (hook); Modify `src/features/defense/components/app-shell.tsx` (mount the guard).

- [ ] `InterestsPicker` (presentational): props `{ selected: string[], onToggle, onAddCustom, onContinue, onSkip, saving }`. Renders `INTEREST_OPTIONS` as pressable chips (`aria-pressed`), a free-text add field, Skip + Continue. renderToStaticMarkup test: chips render, selected carries `aria-pressed="true"`, Continue/Skip present.
- [ ] `/welcome/page.tsx` ('use client'): auth-gated (redirect `/login` if signed-out once resolved). Local selected state seeded from `GET /api/me`. Continue → `PUT /api/me { interests, onboarded: true }` → `router.replace('/dashboard')`. Skip → `PUT /api/me { interests: [], onboarded: true }` → `/dashboard`. Uses the soft-depth card recipe + `font-display` headline "What do you want to get better at speaking about?".
- [ ] `use-onboarding.ts`: `useOnboardingGuard()` — after auth resolves to a signed-in user, fetch `GET /api/me` once; if `onboardedAt === null` and not already on `/welcome`, `router.replace('/welcome')`. Guests included (they have a `guest_user_id` User row). Never loops (guard with a ref/state like `shouldResyncAfterAuth`).
- [ ] Mount `useOnboardingGuard()` inside `AppShell` (covers Home/Rehearse/Progress). `/welcome` itself is outside AppShell so no redirect loop. Do not disturb existing app-shell tests (hook is client-only; SSR render is unaffected — verify).
- [ ] Suite green (add a small unit test for the guard's pure decision function, mirroring `shouldResyncAfterAuth`). Commit `feat: first-run /welcome interests screen + onboarding guard`.

## Task 4: Topic recommendation — prompt/parse + `POST /api/topics`

**Files:** Create `src/features/onboarding/topics.ts` + `.test.ts`; Create `src/app/api/topics/route.ts` + `route.test.ts`.

**Interfaces:** `buildTopicsPrompt(interests: string[]): string`; `parseTopicsResponse(raw: string): string[]` (strip code fences, JSON parse, keep string items, trim, dedupe, cap 6, drop >120 chars); `DEFAULT_TOPICS: string[]` (~4 general defensible topics).

- [ ] `topics.ts`: prompt asks for ~4 specific, defensible, *speakable* topics grounded in the interests (or general if none), JSON array of strings only. `parseTopicsResponse` robust to fences/garbage. `DEFAULT_TOPICS` fallback.
- [ ] `topics.test.ts`: prompt includes each interest; parse handles fenced JSON, ignores non-strings, caps, trims; empty/garbage → `[]`.
- [ ] `/api/topics` POST: auth; load caller interests (`normalizeInterests`), fall back to general when none; one `getZAI` chat call with `buildTopicsPrompt`; `parseTopicsResponse`; if empty → `DEFAULT_TOPICS`. Return `{ topics }`. Any thrown error → `{ topics: DEFAULT_TOPICS }` (200, non-fatal).
- [ ] `route.test.ts` (vi.mock db/auth/zai): interests→topics happy path; zai throws → DEFAULT_TOPICS; empty parse → DEFAULT_TOPICS.
- [ ] Suite green. Commit `feat: /api/topics recommends speakable topics from interests`.

## Task 5: TopicSetup + wire into Rehearse (replace placeholder)

**Files:** Create `src/features/defense/components/topic-setup.tsx` + `.test.tsx`; Create `src/features/defense/components/topic-session.ts` (`buildTopicSessionPayload`) + `.test.ts`; Modify `src/app/decks/new/page.tsx` (Topic branch → TopicSetup); Modify `src/features/defense/components/rehearse-source-picker.tsx` (drop `TopicComingSoon` export once unused, or keep harmless).

**Interfaces:** `buildTopicSessionPayload({ topic, mode, stance }): { topic, mode, stance }` (trims topic; the presence of `topic` + absence of `deck` is the session route's topic-branch signal).

- [ ] `TopicSetup`: props `{ creating, startError, onStart, topicsFetcher? }`. On mount fetch `POST /api/topics` → selectable topic cards; a **Refresh topics** button (re-fetch); a **type-your-own** input; the same mode/stance step as RehearseSetup (reuse the MODES/STANCES copy + radio-card recipe). Start disabled until a topic is chosen/typed. Start → `onStart(buildTopicSessionPayload(...))`.
- [ ] Tests: renders topic cards from an injected fetcher; type-your-own enables Start; mode/stance radios present (2 each); Start disabled with no topic.
- [ ] `/decks/new/page.tsx`: Topic branch renders `<TopicSetup creating startError onStart={config => void startTopic(config)} />`. Add `startTopic` mirroring `start` but POSTing `buildTopicSessionPayload` to `/api/session`, then `router.push('/rehearse/'+sessionId)`. Keep deck path intact.
- [ ] Suite green. Commit `feat: TopicSetup (recommended topics + type-your-own) replaces the placeholder`.

## Task 6: `/api/session` topic branch + synthetic card

**Files:** Modify `src/app/api/session/route.ts`; Modify `src/features/defense/session-schema.ts` (add `createTopicSessionSchema`); Modify `src/app/api/session/route.test.ts` if present (add topic-branch case).

- [ ] `createTopicSessionSchema = z.object({ topic: z.string().trim().min(1).max(300), mode: z.enum(['diagnostic','mock']), stance: z.enum(['supportive','rigorous']) })`.
- [ ] `syntheticTopicDeck(topic): DeckContext` = `{ sourceName: topic.slice(0,180), slides: [{ index: 1, text: topic, imageUrl: 'topic' }] }` (helper, exported + unit-tested; satisfies `defenseDeckSchema` min(1)/imageUrl min(1)).
- [ ] Route: add branch **before** the legacy branch — `if (body.mode && body.topic)` → parse `createTopicSessionSchema`; create session `{ title: topic.slice(0,180), userId, audienceType: 'professor', practiceMode: 'defense', source: 'topic', topic, mode, stance, content: topic, deckContext: JSON.stringify(syntheticTopicDeck(topic)), transcriptSegments: '[]', examinerEvents: '[]', status: 'upload' }`. Return `{ sessionId }`. Keep the existing deck branch but set `source: 'deck'` explicitly.
- [ ] Tests (if route test exists): topic branch creates a `source:'topic'` session; deck branch still works + sets `source:'deck'`.
- [ ] Suite green. Commit `feat: /api/session creates deckless topic sessions (synthetic one-card deck)`.

## Task 7: Room — TopicStage + source-aware SimulatorRoom

**Files:** Create `src/features/simulator/TopicStage.tsx` + `.test.tsx`; Modify `src/features/simulator/SimulatorRoom.tsx`; Modify `src/app/rehearse/[sessionId]/page.tsx` (parseSession learns `source`).

- [ ] `TopicStage`: props `{ topic: string }`. Immersive soft-depth hero: eyebrow "Your topic", the topic as `font-display` headline, and a short static list of angle prompts ("State your claim in one sentence.", "Name the strongest evidence for it.", "Address the sharpest counter-argument."). No image, no slide nav. renderToStaticMarkup test: topic + angle prompts render.
- [ ] `parseSession` (room page + SimulatorRoom `SimSession` type): add `source: 'deck' | 'topic'` (default `'deck'` when absent). The GET already spreads `...session` so `source` is present.
- [ ] `SimulatorRoom`: when `session.source === 'topic'` render `<TopicStage topic={session.deck.slides[0].text} />` instead of `<SlideStage>`, and hide the header "Slide N / total" (show the topic title instead). Keep the entire engine/voice/turn loop untouched (engine still sees a one-card deck).
- [ ] Suite green (SlideStage test unaffected; add TopicStage test). Commit `feat: deckless rehearsal room renders the topic stage`.

## Task 8: Deckless metrics honesty

**Files:** Modify `src/features/defense/types.ts` (`CoachingMetrics.deckless`); Modify `src/features/defense/coaching-metrics.ts`; Modify `src/features/coaching/session-outcome.ts`; Modify `src/features/defense/coaching-report.ts`; Modify `src/features/defense/components/MetricsStrip.tsx`; update the corresponding tests.

- [ ] `CoachingMetrics` add `deckless: boolean`.
- [ ] `computeCoachingMetrics({ ..., deckless = false })` → include `deckless` in the returned object (leave verbatimSlides computed; it's simply not surfaced when deckless).
- [ ] `dimensionsFromMetrics`: guard `if (!metrics.deckless && spoken > 0) dimensions.ownWords = ...`.
- [ ] `assembleCoachingReport({ ..., deckless })` → pass into `computeCoachingMetrics`.
- [ ] `MetricsStrip`: hide/relabel the slide-time ("longest slide") chip when `metrics.deckless` (there are no slides). Keep pace/fluency/questionHandling.
- [ ] Update `coaching-metrics.test.ts` (+ `session-outcome.test.ts`, `MetricsStrip` test if present): deckless omits ownWords + hides slide chip; non-deckless unchanged. Update `coachingReportSchema`/`CoachingMetrics` fixtures that now need `deckless`.
- [ ] Suite green. Commit `feat: deckless metrics omit ownWords and the slide-time chip`.

## Task 9: Report — topic evaluation branch

**Files:** Create `src/features/defense/topic-evaluation.ts` (`buildTopicEvaluationPrompt`) + `.test.ts`; Modify `src/app/api/defense/report/route.ts`; extend `src/app/api/defense/report/route.test.ts`.

- [ ] `buildTopicEvaluationPrompt({ topic, transcript, examinerEvents })`: asks for 1-3 reasoning/evidence findings (clarity of claim, unsupported assertions, dodged questions), each with `presenterQuote` = exact quote from the transcript, `basis: "response_explanation"` ONLY (explicitly forbid slide_reliance — there are no slides), `slideIndex: 1`, a drill; plus personaVerdicts as today. Same JSON contract as the deck prompt so `findingsSchema` parses unchanged.
- [ ] `topic-evaluation.test.ts`: prompt includes the topic + transcript, names response_explanation, forbids slides.
- [ ] Report route: read `session.source`. When `'topic'`, use `buildTopicEvaluationPrompt` instead of `buildDefenseEvaluationPrompt`; pass `deckless: true` to `assembleCoachingReport`. The existing `findingsUnsupported` check already validates `presenterQuote` against `spoken[slideIndex]` (all topic speech is on card 1) and the `slide_reliance` sub-clause is inert because topic findings use `response_explanation`. Deck path passes `deckless: false`.
- [ ] `route.test.ts`: topic-source session → report with transcript-validated findings and NO ownWords dimension / no slide chip; deck path unchanged.
- [ ] Suite green. Commit `feat: topic-aware coaching report (transcript-validated, deck-agnostic)`.

## Task 10: Home — source-aware framing + "Today's topic" card

**Files:** Modify `src/app/api/sessions/route.ts` (emit `source`); Modify `src/features/defense/studio-session-model.ts` (`StudioSession.source`; suppress deck cue for topic); Modify `src/features/defense/components/studio-desk.tsx` (topic framing + Today's-topic card); Create `src/features/defense/components/todays-topic-card.tsx` + `.test.tsx`; update model + studio-desk tests.

- [ ] `/api/sessions`: add `source: session.source === 'topic' ? 'topic' : 'deck'` to each mapped row.
- [ ] `StudioSession` gains `source?: 'deck' | 'topic'`. `cueFor`/preview: when `source === 'topic'`, omit the "Slide N" cue and the slide preview; the active card shows the topic + "Reviewed/In progress" status instead of "Deck in play". (Honesty: no deck-only chrome for topic.)
- [ ] `TodaysTopicCard`: props `{ topic?: string, hasInterests: boolean }`. With a topic → shows it + "Rehearse this" → `/decks/new` (Topic prefilled via query or just the Topic tab). Without interests → invites to pick interests → `/welcome`. Purely additive; renderToStaticMarkup test.
- [ ] Dashboard page: fetch one recommended topic (reuse `/api/topics`, take `[0]`, cached) + `GET /api/me` for `hasInterests`; render `<TodaysTopicCard .../>` above/below the StudioDesk. Keep NextFocusCard.
- [ ] Update studio-desk + model tests for `source` + topic framing; keep negative locks.
- [ ] Suite green. Commit `feat: Home shows Today's topic and drops deck chrome for topic sessions`.

## Task 11: Verify + finish
- [ ] `npx vitest run` full suite green; `npm run build` exit 0.
- [ ] Manual smoke: fresh guest → `/welcome` interests → Home Today's-topic → Rehearse ▸ Topic → pick/refresh/type a topic → deckless room (TopicStage) → speak → End → report shows grounded pace/fluency/questionHandling + reasoning findings + persona verdicts + audio replay, and NO ownWords/slide chip → session appears in Progress moving only the dimensions it legitimately measures. Deck path still fully works.
- [ ] Update `.superpowers/sdd/progress.md` with the Part C section.
- [ ] `finishing-a-development-branch`: verify + present merge options.

## Reuse
Slice-1 engine (`useSimulationEngine`, `SimulatorRoom`, voice loop), report pipeline (`assembleCoachingReport`, `buildDefenseReport`, timeline, persona verdicts, minimal-report fallback), longitudinal diff (`recordSessionOutcome`, `buildSessionOutcome`), `getZAI`, `authenticateRequest`, soft-depth token recipes, RehearseSetup MODES/STANCES copy, `buttonVariants`/`cn`.
