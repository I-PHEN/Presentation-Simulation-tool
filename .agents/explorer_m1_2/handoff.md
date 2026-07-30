# Handoff Report — Explorer M1 2 (Coach Persona & Voice Logic Explorer)

## 1. Observation
- **Coach Persona Store & Selection State**:
  - `src/lib/store.ts` (lines 211-212, 262): `coachPersona: 'marcus' | 'sarah'`, defaulting to `'marcus'`, set via `setCoachPersona`.
  - `src/features/coaching/types.ts` (line 1): `export type CoachPersona = 'marcus' | 'sarah';`.
  - `src/features/coaching/components/coaching-setup.tsx` (lines 201-229): Selection UI for Coach Marcus vs Coach Sarah.
- **Cartesia TTS Voice ID Mapping**:
  - Coach Sarah (Female - Presentation Strategist): Cartesia Sonic Voice ID `'a7a59115-2425-4192-844c-1e98ec7d6877'` (Amber).
  - Coach Marcus (Male - Executive Delivery Specialist): Cartesia Sonic Voice ID `'533b2990-5b82-45a4-b9f2-367776972ca6'` (Reed).
  - Referenced in `src/features/coaching/components/coaching-room.tsx` (lines 72-74, 158-160, 190-192, 208-210) and `src/components/present-section.tsx` (line 136).
- **Defense Examiner Panel & Audience Roster**:
  - `src/features/simulator/personas.ts` (lines 13-42): Defines 3 panel personas (`professor`, `examiner`, `peer`) with default voice `'d46abd1d-2d02-43e8-819f-51fb652c1c61'` (Grant).
  - `src/features/simulator/AudiencePanel.tsx` (lines 64-128): Renders 1 presenter row ("You") + 3 examiner rows (`professor`, `examiner`, `peer`) + 1 tension meter = 4 participant cards total.
- **Simulation Engine & Event Loops**:
  - `src/features/simulator/use-simulation-engine.ts` (lines 31, 80-109, 165-205):
    - `panel` is hardcoded to `assemblePanel()` (3 examiners).
    - `askCoachForAdvice()` enqueues advice for `panel[0]` ('professor') using Grant's default voice, ignoring `coachPersona`.
  - `src/features/simulator/simulation-controller.ts` (lines 66-82): `commit(segment)` triggers `examine(segment)` and sends `POST /api/defense/examiner` unless mode is `'uninterrupted'`. Mode `'guided'` currently triggers examiner question/interruption loops.
- **Coaching Room Page Routing**:
  - `src/app/coaching/[sessionId]/page.tsx` (line 75) renders `<SimulatorRoom session={session} />` with `mode: 'guided'`.

---

## 2. Logic Chain
1. **Observation**: `CoachingRoomPage` (`src/app/coaching/[sessionId]/page.tsx`) renders `SimulatorRoom` with `mode: 'guided'`.
2. **Observation**: `SimulatorRoom` uses `useSimulationEngine`, which calls `assemblePanel()` and creates a 3-examiner panel array (`[professor, examiner, peer]`).
3. **Reasoning**: Because `useSimulationEngine` hardcodes `assemblePanel()`, `AudiencePanel` renders the 4-participant roster grid (1 presenter + 3 examiners) even when in guided coaching mode.
4. **Observation**: `simulation-controller.ts` executes `examine(segment)` during segment commit unless mode is `'uninterrupted'`.
5. **Reasoning**: In `guided` coaching mode, `commit(segment)` currently triggers examiner interruptions and backend `/api/defense/examiner` queries.
6. **Observation**: `askCoachForAdvice` in `use-simulation-engine.ts` uses `panel[0]` ('professor') and default voice `'d46abd1d...'` rather than `coachPersona` ('sarah' / 'marcus') and its associated Cartesia voice ID (`'a7a59115...'` / `'533b2990...'`).
7. **Conclusion**: To implement R1 & R2, `useSimulationEngine` must dynamically construct a 1-persona panel array (`assembleCoachPanel(coachPersona)`) when `mode === 'guided'`, `AudiencePanel` must render only that single Coach avatar + presenter, `askCoachForAdvice` & intro must use the selected coach's voice ID, and `simulation-controller.ts` must suppress examiner turn execution when `mode === 'guided'`.

---

## 3. Caveats
- **External Cartesia API Key**: Cartesia TTS synthesis requires `CARTESIA_API_KEY` in environment variables; fallback voice behavior is provided when key is absent or in offline test environments.
- **Legacy Coaching Room**: `src/features/coaching/components/coaching-room.tsx` exists as an earlier standalone implementation, whereas active routes use `SimulatorRoom` (`src/app/coaching/[sessionId]/page.tsx`). Implementation should focus on `SimulatorRoom` and its underlying hooks (`useSimulationEngine`, `simulation-controller.ts`, `personas.ts`, `AudiencePanel.tsx`).

---

## 4. Conclusion
The requirements R1 & R2 can be cleanly implemented without breaking existing defense modes by making `useSimulationEngine` mode-aware:
1. **R1 (Single Coach Avatar)**: Supply a 1-item coach panel (`assembleCoachPanel(coachPersona)`) to `useSimulationEngine` and `AudiencePanel` when `mode === 'guided'`.
2. **R2 (Coach Voice & Elimination of Interruptions)**: Ensure room intro and live advice speak via the selected coach's Cartesia voice ID, and update `simulation-controller.ts` to skip `examine(segment)` when `mode === 'guided'`.

---

## 5. Verification Method
1. **Run Vitest Tests**:
   ```bash
   npx vitest run src/features/simulator
   ```
2. **Files to Inspect**:
   - `src/features/simulator/personas.ts`
   - `src/features/simulator/use-simulation-engine.ts`
   - `src/features/simulator/simulation-controller.ts`
   - `src/features/simulator/AudiencePanel.tsx`
   - `src/lib/store.ts`
3. **Invalidation Conditions**:
   - If `mode === 'guided'` still displays 3 examiner cards in `AudiencePanel`.
   - If `askCoachForAdvice()` uses Grant's voice ID instead of Sarah (`a7a591...`) or Marcus (`533b29...`).
   - If `POST /api/defense/examiner` is called during a guided coaching session.
