# Project: 1-on-1 AI Executive Coaching Studio & Room Separation

## Architecture
- Routes: `/coaching/[sessionId]` (1-on-1 Coaching Studio), `/rehearse/[sessionId]` & `/practice/[sessionId]` (4-examiner Defense Simulator)
- Components: `CoachingRoom` (1 coach avatar, single coach persona logic, delivery guide teleprompter, WPM meter, live advice actions), `SimulatorRoom` (4-examiner panel)
- Coaching Features: Single Coach (Coach Sarah or Coach Marcus), distinct header badge `🎓 1-on-1 Executive Coaching Studio`, 2-row teleprompter (Hook + Triad Talking Points: Context, Solution, Impact), WPM meter (130-150 WPM optimal), "Ask Coach for Live Advice", "Coach Rescue: Model Pitch Script".

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Codebase investigation of routing, CoachingRoom, SimulatorRoom, voice/speech logic, teleprompter, unit test suite | None | DONE |
| 2 | Coaching Studio UI & Room Separation | Routing (`/coaching/[id]` vs `/rehearse/[id]` & `/practice/[id]`), `CoachingRoom` component with 1 coach avatar, header badge, single coach event loop | M1 | IN_PROGRESS |
| 3 | Teleprompter, WPM Meter & Live Advice Actions | 2-row delivery guide, live WPM meter (130-150 optimal), "Ask Coach for Live Advice" & "Coach Rescue" buttons + handlers | M2 | PLANNED |
| 4 | Verification, Unit Testing & Forensic Audit | Unit tests for `CoachingRoom` and `SimulatorRoom`, E2E/component route testing, Reviewer, Challenger, Forensic Auditor verification | M2, M3 | PLANNED |

## Interface Contracts
### Routing Interface
- `/coaching/[id]` -> Renders `CoachingRoom` (1 coach avatar)
- `/rehearse/[id]` & `/practice/[id]` -> Renders `SimulatorRoom` (4-examiner panel)

### Coaching Room Props / State
- `coach`: 'sarah' | 'marcus' (User preference or default)
- `headerBadge`: '🎓 1-on-1 Executive Coaching Studio'
- `teleprompter`: { hook: string, triad: { context: string, solution: string, impact: string } }
- `wpmMeter`: current WPM rate, status indicator (optimal 130-150 WPM)
- Actions: `onAskLiveAdvice()`, `onCoachRescue()`

## Code Layout
- Target repository root: `c:/Users/Michael/Downloads/sparring-partner`
