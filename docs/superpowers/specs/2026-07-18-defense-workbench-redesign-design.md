# Defense Workbench Redesign

## Status and decision

**Approved design direction:** rebuild the authenticated product as a neutral, coherent Defense Workbench for thesis and capstone students. The home screen is a focused workbench for one active defense, not a generic dashboard or a collection of cards. The product is slide-grounded: it uses the deck, the presentation transcript, and the examiner interaction to produce evidence-led practice and feedback.

This document supersedes the visual direction in `2026-07-18-defense-studio-ui-design.md`. The rejected paper/ink/copper/editorial-serif treatment and its Readiness Desk presentation are not implementation targets.

## Product promise

> Know what your examiner will question before your examiner does.

The product is voice-first, not text-first. The examiner is a spoken presence throughout rehearsal; on-screen text supports captions, replay, orientation, and later evidence review. Its durable value comes from combining:

1. the claims in a student's specific deck,
2. the student’s actual spoken explanation by slide,
3. examiner challenges tied to those claims, and
4. a history of evidence-backed drills and improvements.

The first supported audience is students preparing for a thesis or capstone defense. Generic project coaching and job-interview experiences are outside this redesign.

## Core experience

```text
Overview → Import deck → Review deck → Set practice → Rehearse → Evidence-led report → Focused retry
```

The normal path has five primary screen families. Deck intake has two short states (import, then review) within the same screen family. The persistent shell makes the flow one product rather than isolated pages.

### 1. Overview — current-defense workbench

The default authenticated screen focuses on the active defense:

- A compact top navigation: Overview, Decks, Practice, Reports.
- Active deck name and time-to-defense, when supplied.
- Preparation progress described as concrete tasks, not decorative KPI cards.
- One primary next action: start the recommended rehearsal.
- A small, specific insight grounded in the latest session.

The page uses a continuous canvas, thin separators, and vertical rhythm. Surfaces are reserved for a true object or action, not used as containers for every section.

### 2. Decks — import and review

Import is a full workspace, not a tiny upload widget. It accepts:

- PowerPoint `.pptx`
- legacy PowerPoint `.ppt`
- PDF `.pdf`

The upload state explains that slides become examiner context. It must not promise unsupported analysis.

After conversion/extraction, the student reviews a deck receipt containing source name, title, slide count, slide order/thumbnails, and extracted claims or an honest processing warning. They can replace the deck or continue directly to practice.

On Windows, presentation ingestion must work when LibreOffice is not installed. The conversion layer will select an available converter and use installed Microsoft PowerPoint automation as the Windows fallback. A conversion failure must explain the problem, preserve the uploaded file when safe, and offer a recoverable next step rather than appearing to accept a deck that cannot be used.

### 3. Practice setup — two decisions

The existing stage templates, panel-member builder, evaluation focus checklist, custom instructions, audience controls, and microphone sidebar are removed from the primary thesis-defense flow.

The selected deck is shown as compact context. The student chooses only:

| Choice | Options | Effect |
|---|---|---|
| Session type | Diagnostic practice; Mock defense | Diagnostic can interrupt at a grounded weakness. Mock remains uninterrupted through presentation, then moves to Q&A. |
| Examiner stance | Rigorous; Supportive | Rigorous presses on evidence, limits, and trade-offs. Supportive makes the same challenges but helps the student recover and understand the correction. |

Default target durations are eight minutes for Diagnostic and fifteen minutes for Mock. Timing is presented as a session expectation, not a false precision guarantee.

### 4. Live rehearsal — deck-first simulation

The active slide remains the visual center. The session frame contains only:

- mode and examiner stance,
- elapsed/target time,
- slide position and navigation,
- microphone state and accessible session controls,
- one examiner context region.

#### Room visual contract

The presentation room defaults to the real dark theme (while respecting a user's saved light preference). It is a stable three-part stage: a thin session header, a large slide stage on the left, and a narrow examiner rail on the right; quiet microphone/slide/end controls sit along the bottom. The slide is displayed at presentation scale and is never reduced to a thumbnail beside a chat feed. The examiner rail contains only the active slide claim, the current spoken/captioned question, and the evidence that caused a Diagnostic interruption. On narrow screens, the slide keeps priority and the rail stacks below it.

#### Voice-first examiner contract

- Every examiner interruption, question, follow-up, and transition is synthesized and played aloud. A student must never need to read a chat-style panel to receive the examiner's challenge.
- On-screen examiner text mirrors the most recent spoken utterance for captions, replay, accessibility, and evidence review. It is secondary to audio, visually quiet, and never rendered as a text conversation.
- When an examiner speaks, microphone capture/transcription pauses or marks the audio interval as examiner output. Student capture resumes only after playback completes, so the examiner's synthesized speech cannot be treated as student evidence.
- The room exposes clear, compact controls to replay the last question, continue, or answer aloud. There is no text reply field in the primary experience.
- A playback/TTS failure shows the exact question, announces the failure accessibly, and offers replay/retry; it must not silently lose an examiner intervention.

Diagnostic behavior:

- An interruption may happen only when a detectable issue is linked to a deck claim and spoken evidence.
- The examiner names the concrete challenge, for example an unsupported conclusion, missing method boundary, or repeated slide phrase without explanation.
- The concrete challenge is spoken before its caption/evidence support is displayed.
- The student can answer, retry, continue, or end the session without losing the recording/transcript.

Mock behavior:

- The app does not interrupt the presentation merely to display coaching.
- It preserves slide/context evidence during delivery and uses it to drive the question round and report after the student ends presentation.
- In the question round, every question and follow-up is spoken aloud, with the caption retained in the examiner rail and session transcript.

### 5. Report — evidence, then drill

The report begins with one highest-leverage improvement instead of a score-card grid. It shows the chain that produced that recommendation:

```text
slide claim → spoken phrase / timestamp → examiner question → response gap → next drill
```

The report additionally presents:

- clear strengths that the student should retain,
- slide reliance as context rather than an opaque punishment,
- a pinned five-minute retry drill, and
- longitudinal progress where enough sessions exist.

Readiness may be summarized over time, but no conclusion may appear without accessible supporting evidence.

## Evidence model

### Deck context

`DeckContext` is the common input to rehearsal and report. It holds a stable source name and ordered slides with text and rendered image URL. The upload/conversion route owns creation of this data. UI components consume it; they do not parse presentation files themselves.

### Slide-aware transcript

Recording must persist slide transitions with the transcript. Each segment requires at least:

```ts
{
  slideIndex: number;
  text: string;
  startedAtMs: number;
  endedAtMs: number;
}
```

The session service saves the ordered deck context, selected mode/stance, transcript segments, findings, and report data. The report reads stored data rather than re-inferring a session from the visual UI.

### Fair slide-reliance detection

Reading detection compares meaningful phrases from the active slide with the matching spoken segment. It reports overlap as evidence, along with whether the student supplied explanation signals such as causality, interpretation, example, or limitation.

It must not:

- flag a silent or near-empty transcript;
- treat a short slide title as proof of reading;
- penalize unavoidable technical terms;
- call a student a reader from one overlap measurement; or
- present a numeric overlap score without showing its related slide and phrase.

An examiner interruption or report finding created from overlap must cite the relevant slide and speech evidence. The deterministic analysis is an input to evaluation, not the sole decision maker.

## Visual and interaction system

### Themes

The product has real light and dark modes. Theme changes visual tokens only; information hierarchy and layout remain the same.

| Token | Light | Dark |
|---|---|---|
| Canvas | `#FFFFFF` | `#09090B` |
| Raised/action surface | `#F4F4F5` | `#16161A` |
| Primary text | `#18181B` | `#FAFAFA` |
| Secondary text | `#52525B` | `#A1A1AA` |
| Divider | `#E4E4E7` | `#29292D` |

The interface uses grayscale as its product palette. There are no tinted page backgrounds, gradient treatments, copper accents, neon signals, or a themed “colored” dark mode. Black/near-black and white/near-white primary actions supply hierarchy.

### Typography and components

- Use one professional sans-serif UI family already supported by the application (Geist where available, then a high-quality system sans fallback). Do not use the rejected editorial serif treatment.
- Use a restrained type scale with legible body text (14px minimum for normal explanatory copy). Compact metadata may be smaller only when it is supplementary, never when it controls an action or communicates a requirement.
- Use existing accessible shadcn/Radix primitives where they fit. Controls must look conventional, have clear labels, visible keyboard focus, and sufficient contrast.
- Use simple line-based structure, not every-section cards. Rounded surfaces are limited to controls, upload target, dialogs, or true selectable objects.
- Avoid chat panes, assistant avatars, AI-orb decoration, generic gradient hero sections, and decorative score gauges.
- Do not provide a primary free-text response field in the presentation room. The examiner experience is listening and speaking; visible text is assistive and evidentiary.
- Remove the current favicon and do not add a replacement mark until one is deliberately designed.

### Responsive behavior

The shell remains usable at 390px wide. Top navigation can collapse to a conventional compact navigation control; the deck remains usable in rehearsal; the primary session action is never hidden. In the live room, the slide takes precedence and examiner context stacks below it on narrow screens.

## Component boundaries

| Unit | Responsibility | Depends on |
|---|---|---|
| `AppShell` | Navigation, theme toggle, account affordance, shared canvas/layout | route state, theme provider |
| `OverviewWorkspace` | Active deck, preparation state, next recommended action | typed sessions/decks |
| `DeckIntake` | file selection, upload state, conversion state, deck receipt | upload validation/API, `DeckContext` |
| `PracticeSetup` | select type/stance and start a typed session | selected deck, session schema |
| `RehearsalRoom` | slide presentation, transcript/slide boundary capture, session controls, examiner event rendering | typed session, deck, streaming/transcription services |
| `DefenseReport` | evidence chain, strengths, slide reliance, next drill | persisted findings/evaluation |
| Defense domain services | upload validation, conversion selection, reading analysis, evaluation prompt/result validation | server-side data only |

Business rules stay in the domain services and API routes. Visual components do not assemble prompts, parse deck files, or infer findings.

## Error and empty states

- Unsupported/oversize upload: say which formats and size are allowed; do not clear the chosen file before an error is acknowledged.
- Conversion failure: identify whether the file could not be opened, converted, or analyzed; allow retry or a new file.
- No active deck: direct the student to import one, not to a generic configuration screen.
- Microphone permission/transcription outage: describe the condition and offer retry, input/device selection when available, and an option to end safely.
- Examiner voice playback outage: preserve and caption the question, announce the unavailable audio accessibly, and offer retry/replay before asking the student to answer.
- Incomplete session: preserve it as incomplete and keep the recorded evidence/retry path explicit.
- No findings: state what was observed and guide the next mock/diagnostic session without fabricating weaknesses.

## Quality and verification requirements

- Unit tests cover deck upload acceptance for `.pptx`, `.ppt`, and `.pdf`, converter selection/failure handling, session setup validation, transcript slide-boundary persistence, and fairness cases in reading analysis.
- Component tests cover theme rendering, primary route states, accessible names, selected setup options, and report evidence visibility.
- Rehearsal tests cover spoken examiner event order: pause student capture, play the examiner utterance, retain its caption, then resume student capture. They also cover TTS failure/replay behavior.
- An integration test covers deck upload → session creation → persisted slide-aware transcript → report evidence chain.
- TypeScript and targeted test suites must pass before claiming completion. Existing unrelated type errors must be either fixed in scope or explicitly reported with their source.
- Visual review at desktop and 390px validates both themes, contrast, focus states, and the absence of the old configuration/panel UI from the primary flow.

## Explicit non-goals for this implementation

- A generic ChatGPT-style voice tutor.
- Non-thesis interview templates, sales-pitch templates, or multi-panel persona builders.
- Arbitrary user-authored examiner prompts in the primary UI.
- Decorative AI branding.
- A design-only change that leaves PowerPoint unsupported or report findings ungrounded.

## Success criteria

A student can sign in, see their active defense and next action, upload a PowerPoint/PDF deck, confirm the extracted context, select practice type and stance, complete a deck-grounded rehearsal, understand exactly why an examiner challenged a claim or identified slide reliance, and start a focused retry. The same complete flow looks intentional and legible in true light and true dark mode.
