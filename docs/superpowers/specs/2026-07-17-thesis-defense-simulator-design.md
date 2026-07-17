# Thesis Defense Simulator - Product and Refactor Design

## Decision

Refocus the product around students preparing for a thesis or capstone defense. The primary product is a slide-grounded **Defense Simulator**, not a generic AI presentation coach. Slides are required for its core experience.

The product promise is: **Know what your examiner will question before your examiner does.**

## Why this is defensible

Generic voice chat can discuss a project, but it cannot reliably compare a presentation's source material, spoken explanation, omissions, answers under pressure, and improvement across practice sessions. This product uses uploaded slides as a reference standard and turns practice into an evidence-based readiness loop.

For each session, the system should connect:

1. claims and concepts present in the slide deck;
2. what the student actually explains aloud;
3. questions a credible examiner would ask about missing, vague, or unsupported material;
4. the student's answer quality and a precise next drill.

## Core modes

### Diagnostic Defense Practice

This is the default learning mode. The student presents for two to three minutes. At the first material weakness, the examiner pauses the presentation, asks a grounded question, explains the gap briefly after the answer, and lets the student retry. It optimizes for a useful improvement within minutes.

### Mock Defense

This is the readiness test. The student gives an uninterrupted, timed presentation, then receives examiner questions. The report identifies the highest-risk questions, underexplained slides, and specific rehearsal work. It does not coach during the presentation.

Diagnostic Practice teaches and repairs. Mock Defense simulates and evaluates readiness.

## Product journey

1. **Prepare** - Upload a PDF or PowerPoint deck, confirm its title, and choose Diagnostic Practice or Mock Defense.
2. **Ground** - The system extracts the deck's claims, concepts, and likely defense topics. The student sees a concise confirmation, not raw AI analysis.
3. **Present** - A calm stage screen gives the student the active slide, time, microphone state, and a single visible examiner presence.
4. **Challenge** - In Diagnostic Practice, the examiner interrupts only for a material gap. In Mock Defense, questions follow the presentation.
5. **Improve** - The report surfaces three risks with quoted evidence, relevant slides, a better-answer structure, and a one-tap retry drill.
6. **Track** - The dashboard shows preparation progress and recurring risks, not a generic analytics wall.

## Experience and visual direction

The product must not resemble a generic AI dashboard. Its visual character is a **calm academic rehearsal room**:

- Warm paper and deep ink surfaces rather than a dark, neon, glass-card SaaS aesthetic.
- A restrained single accent color reserved for action, readiness, and the live state.
- Editorial typography, generous whitespace, and strong hierarchy rather than dense metric cards.
- A focused stage environment during practice, with the examiner expressed through timing, language, and audio rather than a gimmicky chatbot avatar.
- Feedback as a marked-up defense brief: claims, evidence, risk, and drill - not anonymous score gauges.

The interface should feel credible to students and faculty: rigorous, calm, and specific.

## Scope for the next release

In scope:

- Thesis/capstone defense as the primary use case.
- Slide upload and slide-grounded examiner behavior.
- Diagnostic Defense Practice and Mock Defense.
- One supportive expert examiner who is rigorous during simulation.
- Evidence-based feedback, retry drills, session persistence, and progress history.
- A production-quality visual overhaul of the primary flow.

Out of the primary experience for now:

- Generic interviews, impromptu prompts, lecture mode, investor/customer personas, and generic presentation presets.
- Multiple simultaneous judges, screen-share mode, and decorative real-time camera metrics.

Existing supporting code may remain temporarily, but these features will not compete with Defense Simulator in navigation or onboarding.

## Technical refactor boundaries

The implementation will move from a broad global practice store toward bounded modules:

| Boundary | Responsibility |
| --- | --- |
| `defense-session` | Session lifecycle, selected mode, progress, persistence, recovery. |
| `slide-context` | Upload validation, extraction, slide references, and deck-grounding data. |
| `simulation` | Examiner behavior, question selection, turn-taking, timers, and voice orchestration. |
| `evaluation` | Claims, evidence, risks, answer assessment, drills, and readiness output. |
| `ui` | Screens and components that render typed session contracts without owning product logic. |

The data model will evolve from generic score storage toward structured findings with source evidence and drill status. Scores can remain secondary summaries, but cannot be the main product output.

## Reliability and quality bar

- Establish automated tests before behavior refactors, beginning with slide upload/session lifecycle and mode contracts.
- Make upload, microphone permissions, failed network requests, interrupted sessions, and empty states explicit and recoverable.
- Validate input and API payloads at boundaries.
- Ensure no session is lost when a user refreshes or returns to the dashboard.
- Check responsive behavior, keyboard access, loading states, and error states across the complete primary journey.

## Success criteria

The release is successful when a student can upload slides, complete a meaningful Diagnostic Practice in one sitting, understand their three greatest defense risks, retry one answer, and later use Mock Defense to see evidence of improved readiness. A first-time observer should immediately understand that this is an examiner simulation system, not a chat interface with voice enabled.
