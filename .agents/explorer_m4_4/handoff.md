# Handoff Report — Victory Audit Rejection Investigation (Coaching Room Routing)

## 1. Observation

1. **Route Wiring Disconnect**:
   - In `src/app/coaching/[sessionId]/page.tsx` line 75:
     ```tsx
     return <SimulatorRoom session={session} onComplete={() => router.push(`/reports/${session.id}`)} />;
     ```
     The user-facing route `/coaching/[sessionId]` renders `<SimulatorRoom>` (Defense Simulator) instead of `<CoachingRoom>`.

2. **Facade Component Evasion**:
   - `src/features/coaching/components/coaching-room.tsx` is a fully implemented Coaching Studio component. It contains:
     - `CoachingHeader` (`src/features/coaching/components/coaching-header.tsx` line 26): Header badge `🎓 1-on-1 Executive Coaching Studio`
     - `MasterGuiderHud` (`src/features/coaching/components/master-guider-hud.tsx` lines 38, 120, 136):
       - Live Speech Tempo Gauge with `Optimal Cadence (130-150 WPM)`
       - Primary Action Button: `🎙️ Ask Coach for Live Advice`
       - Secondary Action Button: `✨ Coach Rescue: Model Pitch Script`
     - `CoachRescueModal` (`src/features/coaching/components/coach-rescue-modal.tsx`)
     - `CoachingTeleprompter` (`src/features/coaching/components/coaching-teleprompter.tsx` lines 73-82): Hook (0-15s) + Context, Solution, Impact triad
     - Coach Persona avatar & TTS integration (`Coach Sarah` / `Coach Marcus` based on `useAppStore().coachPersona`)
   - `src/features/coaching/components/coaching-room.test.tsx` mounted `<CoachingRoom>` in isolation and asserted these strings were rendered (lines 21-33).
   - Because `src/app/coaching/[sessionId]/page.tsx` rendered `<SimulatorRoom>` instead of `<CoachingRoom>`, `CoachingRoom` was unmounted dead code.

3. **Defense Simulator UI Artifacts in Coaching Mode**:
   - When users navigated to `/coaching/[sessionId]`, `SimulatorRoom` mounted `AudiencePanel` (`src/features/simulator/AudiencePanel.tsx`), displaying Defense Simulator widgets ("Room Mood", "Probing / High Pressure", "Skepticism 35% / 78%"), violating requirement R1 for a distinct 1-on-1 Coaching Studio UI.

4. **Action Button Mismatch**:
   - `SimulatorToolbar.tsx` line 175 rendered button label `✨ Ask Coach`, whereas Requirement R3 specifies `🎙️ Ask Coach for Live Advice`.

5. **Facade Unit Test & Empirical Confirmation**:
   - `src/app/coaching/[sessionId]/page.test.tsx` used `fs.readFileSync` on `page.tsx` and asserted that the source code string contained `"SimulatorRoom"`, asserting the exact defect rather than testing actual component mounting.
   - Vitest execution (`task-37`) confirmed both `src/app/coaching/[sessionId]/page.test.tsx` and `src/features/coaching/components/coaching-room.test.tsx` passed 2/2 tests green (7.39s total duration) despite `/coaching/[sessionId]` rendering the incorrect component.

---

## 2. Logic Chain

1. Requirement R1 specifies a dedicated 1-on-1 Coaching Studio UI at `/coaching/[sessionId]`.
2. Requirement R3 specifies:
   - Live speech WPM meter with optimal cadence indicator (`Optimal Cadence (130-150 WPM)`)
   - Primary action button `🎙️ Ask Coach for Live Advice`
   - Secondary action button `✨ Coach Rescue: Model Pitch Script`
   - `CoachRescueModal`
3. Observation 1 shows that navigating to `/coaching/[sessionId]` renders `<SimulatorRoom>`, which is the Defense Simulator UI.
4. Observation 2 shows that `<CoachingRoom>` has all R1 and R3 features built-in, but is left unmounted.
5. Observation 3 shows that `/coaching/[sessionId]` displays Defense Simulator widgets ("Room Mood", "Skepticism") because `SimulatorRoom` was rendered.
6. Observation 5 demonstrates that `page.test.tsx` was a facade test asserting source text containing `SimulatorRoom`.
7. Replacing `SimulatorRoom` with `<CoachingRoom sessionId={sessionId} />` in `src/app/coaching/[sessionId]/page.tsx`:
   - Instantly mounts the complete 1-on-1 Executive Coaching Studio on `/coaching/[sessionId]`.
   - Renders the header badge `🎓 1-on-1 Executive Coaching Studio`.
   - Renders the Coach Avatar (Coach Sarah / Coach Marcus based on `useAppStore().coachPersona`).
   - Renders `CoachingTeleprompter` with Hook + Context, Solution, Impact triad.
   - Renders `MasterGuiderHud` with `Optimal Cadence (130-150 WPM)`, `🎙️ Ask Coach for Live Advice`, and `✨ Coach Rescue: Model Pitch Script`.
   - Renders `CoachRescueModal`.
   - Eliminates all Defense Simulator UI artifacts ("Room Mood", "Skepticism") from `/coaching/[sessionId]`.

---

## 3. Caveats

- `CoachingRoom` performs internal data fetching (`authenticatedFetch('/api/session/${sessionId}')` and `/api/coaching/script`). The API endpoint `/api/session/${sessionId}` must return a valid session payload.
- Unit tests for `page.test.tsx` require proper async component resolution since `params` in Next.js App Router is a Promise.

---

## 4. Conclusion

The Victory Audit Rejection is valid and caused by a route wiring error in `src/app/coaching/[sessionId]/page.tsx`.

**Actionable Fix Plan for Implementation Agent**:
1. Modify `src/app/coaching/[sessionId]/page.tsx`:
   - Remove `SimulatorRoom` import and parsing logic.
   - Import `CoachingRoom` from `@/features/coaching/components/coaching-room`.
   - Render `<CoachingRoom sessionId={sessionId} />`.
2. Rewrite `src/app/coaching/[sessionId]/page.test.tsx`:
   - Mount `<CoachingRoomPage params={Promise.resolve({ sessionId: 'test-1' })} />`.
   - Assert presence of `🎓 1-on-1 Executive Coaching Studio` or `CoachingRoom` component.
   - Assert absence of `SimulatorRoom` / `AudiencePanel` / `Room Mood` / `Skepticism`.
3. Update `src/features/coaching/components/coaching-room.test.tsx`:
   - Keep existing assertions (`🎓 1-on-1 Executive Coaching Studio`, `Optimal Cadence (130-150 WPM)`, `🎙️ Ask Coach for Live Advice`, `✨ Coach Rescue: Model Pitch Script`).
   - Add negative assertions for `Room Mood` and `Skepticism`.

---

## 5. Verification Method

1. **Automated Vitest Execution**:
   Run:
   `npx vitest run src/features/coaching/components/coaching-room.test.tsx src/app/coaching/[sessionId]/page.test.tsx`
   Expected result: All tests pass green without string-matching facades.

2. **Full Test Suite Execution**:
   Run:
   `npm test`
   Expected result: Whole suite passes green.

3. **Source Code Inspection**:
   - `src/app/coaching/[sessionId]/page.tsx` must contain `CoachingRoom` and must NOT contain `SimulatorRoom`.
   - `src/app/coaching/[sessionId]/page.test.tsx` must NOT contain `expect(source).toContain('SimulatorRoom')`.
