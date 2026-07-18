# Defense Studio UI Redesign

## Decision

Replace the current feature-island interface with one continuous Defense Studio experience for thesis and capstone presenters. The default home is a **Readiness Desk**: it gives the student one highest-value preparation action, a short rehearsal record, and direct access to their deck history.

## Experience model

```text
Readiness Desk -> Prepare deck -> Rehearsal room -> Examiner challenge -> Defense brief -> Focused retry
```

The product has no primary navigation for generic practice types. Diagnostic Practice and Mock Defense appear only where the student chooses a rehearsal method for their uploaded deck.

## Screen responsibilities

### Readiness Desk

Show the student their next action first: the selected deck, time to defense if supplied, a specific risk, and one action button. Below it, show only the three most useful records: highest-risk question, latest readiness result, and most recent improvement. Older sessions live in a compact deck history view, not a dashboard grid.

### Prepare Deck

Accept PowerPoint and PDF decks. Once a deck is selected, show a receipt with name, slide count, and thumbnails. The student chooses Diagnostic Practice or Mock Defense through plain-language cards. There are no persona, panel-building, screen-share, interview, or generic audience controls.

### Rehearsal Room

The active slide is the visual center. The persistent frame contains only mode, timer, microphone state, slide position, and one examiner presence. Diagnostic Practice may stop at a grounded weakness; Mock Defense remains uninterrupted until Q&A. Transcript capture records slide boundaries so findings are evidence-linked.

### Defense Brief

Replace score-card grids with a structured brief: readiness, highest-risk defense question, what the examiner heard, and the next drill. Reading feedback identifies copied phrases and associated slide numbers; it never presents unexplained abstract scores.

## Visual system

The design should feel like an academic defense record, not an AI product.

- **Palette:** library ink `#15262D`, paper `#E9ECE7`, card paper `#F6F7F3`, rule `#C5CECA`, signal copper `#B94C2C`, muted ink `#66757A`.
- **Typography:** Georgia (or an equivalent classic serif) for restrained display headings; Geist for body/UI; Geist Mono only for metadata such as elapsed time and slide numbers.
- **Structure:** thin rules, asymmetric but stable editorial columns, generous whitespace, compact labels, and a single primary action per screen.
- **Components:** accessible buttons, inputs, dialogs, tooltips, progress indicators, empty states, and toast feedback built on the existing shadcn/Radix primitives. Do not invent unfamiliar controls when a conventional component is clearer.
- **Motion:** one purposeful room-transition or challenge-interruption moment; respect reduced-motion preferences. No ambient gradients, bouncing widgets, typing effects, or decorative assistant avatars.
- **Iconography:** Lucide icons only where a label benefits from a quick visual cue. Icon-only controls require accessible names and tooltips.

## Explicit exclusions

- No generic AI chat panes, prompt-style input fields, animated orb/robot branding, or assistant avatars.
- No dense generic KPI card grids, neon gradients, glassmorphism, or decorative score gauges.
- Remove the current custom favicon. Do not add a replacement until a dedicated Defense Studio mark is designed.

## Quality requirements

- Keyboard-visible focus states and semantic labels on all interactive controls.
- Clear loading, upload conversion, microphone-permission, no-session, and recoverable-error states.
- Responsive layout down to 390px with the rehearsal slide and primary action remaining usable.
- Preserve the current authentication/session behavior while migrating presentation UI.
- UI components consume typed session/evaluation data; presentation and scoring business logic must not be embedded in visual components.

## Success criteria

A first-time student can identify the product purpose, upload a deck, begin a rehearsal, understand the examiner's evidence-backed feedback, and start the next drill without encountering a generic dashboard or chat-style interface. The system should look credible beside university tooling and deliberate enough to demonstrate in a hackathon final.
