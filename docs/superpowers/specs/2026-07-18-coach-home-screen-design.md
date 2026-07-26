# Coach Home Screen Design

## Purpose

Transform the existing dashboard into the daily home for Sparring Partner: a calm, voice-first personal speaking coach. Thesis defense is the first active programme, not the product's entire identity. The home screen should make a student want to return because it always answers one useful question: what should I practise next?

This work is intentionally limited to the home/front screen and the broken deck-to-practice continuation that feeds it. It does not redesign the deck intake, practice room, report, or build the full daily-challenge session engine.

## Product Position

Sparring Partner helps students become clearer, more confident speakers through short voice practice. The first programme is thesis defense preparation. Later programmes can include interviews, presentations, teaching, business communication, and storytelling without changing the home model.

The product must not resemble an AI chat surface, an analytics dashboard, or an unstructured collection of cards. It should feel like a composed coaching product with a clear point of view.

## Design Direction

Use the selected **Guided today** direction, borrowing only the hidden structure of the **Practice plan** direction.

### Tone

- Calm, specific, and quietly encouraging.
- Academically credible but not institutional or severe.
- Personal without being overly casual or gamified.
- Monochrome light and true dark themes only; no coloured modes, gradients, or novelty AI motifs.

### Visual Principles

- Make one action visually dominant.
- Use one continuous editorial flow, divided by rules and space rather than disconnected cards.
- Keep progress compact and explanatory; avoid score grids, circular dashboards, and decorative data.
- Use short, purposeful copy. Every line should help the student decide, begin, or reflect.
- Retain comfortable contrast and type hierarchy in both light and dark themes.

## Information Architecture

The dashboard is renamed in product language to **Today**. The brand is **Sparring Partner**. The active programme, for example **Thesis defense**, is shown as context rather than replacing the brand.

Primary navigation is reduced to:

1. Today
2. Practice
3. Progress

Deck access remains available inside the active programme context and practice setup; it should not dominate the main navigation.

## Home Layout

### Returning student with an active defence

1. **Personal opening**
   - A restrained greeting and one-line orientation.
   - Example: "Good afternoon, Michael. A short rehearsal will make your defense stronger today."

2. **Your next best practice**
   - The primary home module and the only filled primary action.
   - Names the concrete skill or risk to practise, duration, active programme, and examiner setting.
   - Example: "Make your opening claim defendable · 12 min".
   - Primary action begins or resumes the relevant voice practice flow.

3. **Your trajectory**
   - A quiet supporting block with weekly practice rhythm, one coach observation, and a next milestone.
   - It communicates improvement in plain language rather than a generic score.
   - Example: "Two practice sessions this week. Your explanations are becoming more specific."

4. **Current programme**
   - Compact continuation context: defense/deck title, slide count, and last-practised time.
   - A subtle link allows the student to view or replace the deck.

5. **Daily speaking challenge**
   - A secondary, lightweight invitation below the programme context.
   - It gives a 3–5 minute voice drill for days when a student has no slides or wants an extra repetition.
   - The challenge identifies a speaking skill such as clarity, concise explanation, storytelling, confidence, or response structure.
   - It must not compete visually with the student's next defence action.

### New student without an active defence

Use the same rhythm and avoid an empty dashboard. The primary module invites the student to create a first preparation plan by importing a deck. The daily speaking challenge remains available as a lower-commitment alternative.

## Daily Speaking Challenge Product Rule

Challenges are a retention system, not a random prompt list. Each challenge must eventually contain:

- A spoken prompt.
- One explicit speaking target.
- A short target duration.
- A voice-first attempt and replay.
- A coach observation that can draw on prior attempts.

For this front-screen scope, expose the challenge as a clearly labelled preview/action. Do not pretend that the full challenge engine is complete until it has a voice flow, persistence, and feedback contract.

## Component Boundaries

Create a focused home composition rather than extending the old overview shell:

- `CoachHome`: owns ordering and empty/returning states.
- `NextPractice`: presents the single recommended action.
- `Trajectory`: presents a brief progress narrative and milestone.
- `ActiveProgramme`: presents active defense/deck context.
- `DailyChallengePreview`: presents the secondary challenge invitation.

The dashboard route supplies authenticated session data and derives only deterministic display state. It must not call an LLM merely to render the home page.

## Continuation Reliability

The deck intake continuation must never fail silently.

- Disable the continuation control while a session is being created.
- Show a clear inline error if the required deck or authenticated user is missing, or if the session endpoint fails.
- Preserve the uploaded deck receipt until the student deliberately replaces it or successfully continues.
- On success, route to the existing defense practice setup with the created session ID.

## States and Accessibility

- Light and dark themes use the existing semantic tokens with verified readable contrast.
- Keyboard focus is visible on every interactive control.
- Buttons describe the outcome, not generic actions; for example, "Start guided rehearsal".
- Loading and errors are announced through appropriate status/alert regions.
- The layout remains a single clear column on smaller screens, with no hidden critical context.

## Out of Scope

- Rebuilding the deck intake visual design.
- Rebuilding the practice room, examiner voice, reports, or upload converter.
- Implementing full daily challenge voice sessions and adaptive recommendations.
- Adding a generic chatbot, social feed, streak mechanics, or score leaderboard.
- Changing unrelated legacy interview/configuration screens.

## Verification

- Dashboard component tests cover active-programme and no-programme home states.
- A continuation test proves that missing state and failed session creation produce visible recoverable feedback.
- Existing deck upload, practice setup, and session tests remain green.
- Manual browser review verifies both themes and desktop/mobile hierarchy.
- The production build and the full test suite pass before handoff.
