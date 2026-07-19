# Studio Desk product shell design

**Status:** visual direction approved by Michael on 2026-07-19.

## Purpose

Replace the framework-like dashboard with **Studio Desk**, a real personal speaking-coach workspace. The initial programme is a thesis defense, but the shell must naturally support interviews and other speaking programmes later.

The product’s job is not to display generic progress. Its job is to make the next useful voice rehearsal obvious, preserve the deck evidence behind it, and make past coaching actionable.

## Scope

This redesign covers the authenticated application shell and its three primary destinations:

| Destination | Route | User job |
| --- | --- | --- |
| Today | `/dashboard` | Resume or begin the one rehearsal with the highest leverage. |
| Practice | `/practice` | Manage the active programme and begin, resume, or set up a real rehearsal. |
| Review | `/review` | Find real prior sessions and open their evidence-led reports or resume unfinished work. |

It also replaces the existing top navigation, removes the fake `Progress` destination, and sets dark mode as the deliberate default.

Out of scope: a new AI coach model, a new scoring system, billing, generic social profiles, or a pretend daily-challenge flow. Daily challenges can appear only after they have a real practice route and feedback loop.

## Product structure

### App shell

`AppShell` becomes a persistent Studio Desk frame instead of a header plus centered content.

- On desktop it has a dark, collapsible left rail. Expanded state shows product identity, the active programme, `Today`, `Practice`, `Review`, `New programme`, and the signed-in account. Collapsed state preserves accessible icon labels/tooltips and does not hide navigation capability.
- The collapse preference is persisted client-side under a dedicated key such as `sparring-shell-collapsed`; it starts expanded for a new user.
- On narrow screens, the rail becomes an accessible drawer opened from a compact application header. The current route remains visible; no icon-only bottom bar is introduced.
- The main workspace uses one connected canvas with structural dividers and deliberate asymmetry. It does not use a grid of rounded dashboard cards, synthetic KPI tiles, decorative gradients, or generic “AI assistant” panels.
- Dark is the initial theme for the application: `defaultTheme="dark"` and no system-theme override. The existing toggle still offers a real, fully styled light mode.

### Today — `/dashboard`

Today is the active-programme desk, not a greeting page.

It consumes the existing authenticated `/api/sessions` response through a deterministic view model. The model selects in priority order:

1. a practicing session to resume in `/practice/:id?view=room`;
2. the most recently configured/analyzed defense session to continue setup;
3. deck import at `/decks/new` when no active programme exists.

The connected workspace includes:

- a single “next rehearsal” statement with the actual voice-session action and duration;
- deck evidence context when a deck exists: title, slide count, current slide/cue if present, and a real link into the programme/setup;
- a short coaching note sourced from the latest finding or report drill, never fabricated;
- an honest run sequence (deck, baseline, rehearsal, defense) whose state reflects the active session; and
- a link to the latest actual report if one exists.

Empty state language directs the user to import a deck and explains why it is needed. It must not show fabricated scores, trend charts, completion streaks, or coach quotes.

### Practice — `/practice`

`/practice` stops redirecting to `/decks/new`. It becomes the programme operating page and reuses the same session data source as Today.

- If an active defense session exists, show its title, deck context, current status, and one primary action: `Resume rehearsal` or `Continue setup`.
- `Start a new defense programme` routes to the existing `/decks/new` intake. It is a real action, not a blank placeholder.
- Recent sessions are shown as a concise, actionable list: unfinished sessions resume; completed/analyzed sessions open their report.
- The page has an explicit empty state for a first-time user, with import as the only primary action.

No separate “mode picker” is shipped unless it starts a real backed session. The existing deck intake remains the source of truth for PDF and PowerPoint import.

### Review — `/review`

`/review` is a real history and coaching destination, not an anchor on the home page.

- It reads the authenticated session collection already exposed by `/api/sessions`.
- Each row presents the real session title, programme/mode, date, status, and the one valid next action: `Open review` for a reportable session or `Resume` for an unfinished session.
- Report links use the existing `/reports/:sessionId` page. If report creation/loading fails, that page keeps its visible, actionable error state.
- The list has clear empty and loading states. A first-time user is directed to Practice rather than shown fake progress.

The existing `/reports/:sessionId` route remains supported. “Review” is the collection route; “report” is an individual session artifact.

## Visual language

The approved visual target is Studio Desk:

- **Dark default:** charcoal-black app rail and dark workspace surfaces with high-contrast text; light mode is a true inverse surface system, not a tinted theme.
- **Accent:** one restrained functional cobalt for active navigation, focus, and primary actions; status colours appear only where status requires them.
- **Typography:** a precise sans-serif hierarchy with tight display tracking, readable body copy, and compact uppercase utility labels. Large type appears only where it names a real rehearsal decision.
- **Signature element:** the defense run/cue ladder. It represents a user’s preparation sequence through real states rather than a generic score or gamified streak.
- **Density:** purposeful and calm. Deck evidence, a current voice rehearsal, and a coaching note share one workspace with dividers, not floating “islands.”

The design must work in both themes, at desktop and narrow mobile widths, with visible focus states and reduced-motion-safe interactions.

## Data and error handling

- Use existing authenticated session endpoints and types; this redesign does not introduce new APIs or schema changes.
- Treat failed session fetches as visible, retryable states where the route otherwise cannot make a safe recommendation. Do not silently render invented default insight.
- Keep the already-fixed deck continuation recovery: missing deck is deck-first guidance; expired authentication is visible sign-in recovery; rejected session creation preserves the receipt and sign-in action; non-auth server errors remain retryable.
- The shell must never use static links to a route that does not exist.

## Test and acceptance criteria

1. `AppShell` renders Today, Practice, Review, a collapse control, and no `Progress` label or `/dashboard#trajectory` navigation.
2. Sidebar expanded/collapsed preference survives remount; its navigation remains accessible in both desktop states and in the mobile drawer.
3. Dark theme is the default; the user can switch to a real light theme.
4. `/practice` renders an active-session action, a first-time import state, and valid resume/report links instead of redirecting.
5. `/review` renders empty, loading, completed/reportable, and unfinished/resume states from real session data.
6. Today renders only data-backed session, deck, and finding information; no fabricated score, streak, report, or quote appears.
7. All primary calls to action resolve to real existing routes and are verified by route/component tests.
8. Existing PowerPoint/PDF intake and continuation recovery tests remain green.
9. Full test suite and production build pass; browser checks cover desktop and 390px mobile in dark and light modes.

## Implementation boundaries

Build the app shell, view models, Today, Practice, and Review as focused modules with route-level tests. Preserve existing session room, deck intake, report generation, and voice behaviour. Do not combine this redesign with unrelated backend refactoring.
