# Victory Audit Rejection Analysis: Coaching Room Route Wiring & UI Facade Remediation

## Executive Summary
This analysis addresses the Victory Audit Rejection for the Coaching Studio interface under `/coaching/[sessionId]`. 

During the audit, it was discovered that:
1. `src/app/coaching/[sessionId]/page.tsx` rendered `<SimulatorRoom>` (Defense Simulator) instead of `<CoachingRoom>` (1-on-1 Coaching Studio).
2. `<CoachingRoom>` contained all required R1/R3 features (`🎓 1-on-1 Executive Coaching Studio` badge, `Optimal Cadence (130-150 WPM)` meter, `🎙️ Ask Coach for Live Advice` primary action, `✨ Coach Rescue: Model Pitch Script` secondary action, and `CoachRescueModal`), but was left as unmounted dead code.
3. `/coaching/[sessionId]` rendered Defense Simulator widgets (`AudiencePanel` displaying "Room Mood" and "Skepticism").
4. Unit test `page.test.tsx` was a facade test asserting file string contents (`SimulatorRoom`) rather than verifying actual user route UI rendering.

---

## 1. Analysis of Current Codebase

### A. Route Wiring Disconnect (`src/app/coaching/[sessionId]/page.tsx`)
- **Current Behavior**: Line 75 returns `<SimulatorRoom session={session} onComplete={() => router.push(`/reports/${session.id}`)} />`.
- **Impact**: `SimulatorRoom` renders Defense Simulator panels (`AudiencePanel`, `SimulatorHeader`, `SimulatorToolbar`).
- **Defects Introduced on `/coaching/[sessionId]`**:
  - Defense Simulator widgets ("Room Mood", "Probing / High Pressure", "Skepticism 35% / 78%") are displayed in Guided Coaching mode.
  - Toolbar displays action button `✨ Ask Coach` instead of `🎙️ Ask Coach for Live Advice`.
  - Missing Live Speech WPM meter (`Optimal Cadence (130-150 WPM)`).
  - Missing `✨ Coach Rescue: Model Pitch Script` button.
  - Missing `CoachRescueModal`.

### B. Facade Component Analysis (`src/features/coaching/components/coaching-room.tsx`)
`<CoachingRoom>` is a fully implemented, feature-complete component containing:
- **Coach Avatar & Persona**: Displays Coach Sarah or Coach Marcus depending on `useAppStore().coachPersona` inside `MasterGuiderHud`. Plays TTS auto-greeting upon loading.
- **Header Badge**: `🎓 1-on-1 Executive Coaching Studio` inside `CoachingHeader`.
- **Delivery Guide & Teleprompter**: `CoachingTeleprompter` rendering Opening Hook (0-15s) and 3-point triad (Context, Solution, Impact).
- **Speech Pacing WPM Meter**: `MasterGuiderHud` rendering `Optimal Cadence (130-150 WPM)`.
- **Primary Action Button**: `🎙️ Ask Coach for Live Advice` (triggers AI speech analysis & advice).
- **Secondary Action Button**: `✨ Coach Rescue: Model Pitch Script` (opens `CoachRescueModal`).
- **Coach Rescue Modal**: `CoachRescueModal` with executive pitch script view, copy-to-clipboard, and voiceover playback.
- **Clean UI Boundaries**: Completely free of `AudiencePanel`, "Room Mood", and "Skepticism" widgets.

### C. Unit Test Evasion Analysis (`page.test.tsx` & `coaching-room.test.tsx`)
- `coaching-room.test.tsx` mounted `<CoachingRoom sessionId="test-session-1" />` in isolation, passing tests while the component was unused in the app route.
- `page.test.tsx` used `fs.readFileSync` to read source code and asserted `source.includes("SimulatorRoom")`, masking the fact that the live route was rendering the wrong component.
- **Empirical Test Run Confirmation (Task-37)**: Running `npx vitest run src/features/coaching/components/coaching-room.test.tsx src/app/coaching/[sessionId]/page.test.tsx` resulted in 2 passed tests (12ms / 107ms). Both passed green despite the critical route defect on `/coaching/[sessionId]`.

---

## 2. Proposed Exact Fix Strategy

### A. Route Rewiring (`src/app/coaching/[sessionId]/page.tsx`)
Replace `SimulatorRoom` import and rendering with `CoachingRoom`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { CoachingRoom } from '@/features/coaching/components/coaching-room';
import { useOnboardingGuard } from '@/features/onboarding/use-onboarding';

export default function CoachingRoomPage({ params }: { params: Promise<{ sessionId: string }> }) {
  useOnboardingGuard();
  const [sessionId, setSessionId] = useState<string>();

  useEffect(() => {
    void params.then(({ sessionId: value }) => setSessionId(value));
  }, [params]);

  if (!sessionId) {
    return <p role="status" className="p-6 text-sm text-muted-foreground">Opening your Guided Coaching Room...</p>;
  }

  return <CoachingRoom sessionId={sessionId} />;
}
```

### B. Integration Verification Matrix

| Required Feature / Component | Source Component | Verification Criterion | Status in `CoachingRoom` |
|---|---|---|---|
| 1 Coach Avatar | `master-guider-hud.tsx` | Displays Coach Sarah / Coach Marcus based on `useAppStore().coachPersona` | ✅ Fully implemented |
| Header Badge | `coaching-header.tsx` | Renders `🎓 1-on-1 Executive Coaching Studio` | ✅ Fully implemented |
| Coaching Teleprompter | `coaching-teleprompter.tsx` | Opening Hook + Context, Solution, Impact triad | ✅ Fully implemented |
| Live Speech WPM Meter | `master-guider-hud.tsx` | `Optimal Cadence (130-150 WPM)` indicator | ✅ Fully implemented |
| Primary Action Button | `master-guider-hud.tsx` | `🎙️ Ask Coach for Live Advice` | ✅ Fully implemented |
| Secondary Action Button | `master-guider-hud.tsx` | `✨ Coach Rescue: Model Pitch Script` | ✅ Fully implemented |
| Coach Rescue Modal | `coach-rescue-modal.tsx` | Script display & TTS playback modal | ✅ Fully implemented |
| Defense Widget Removal | `coaching-room.tsx` | No "Room Mood" or "Skepticism" rendered | ✅ Fully implemented |

---

## 3. Unit Test Remediation Strategy

### A. `src/app/coaching/[sessionId]/page.test.tsx`
Rewrite test to mount/verify the route component:
1. Mock `next/navigation` and `authenticatedFetch`.
2. Render `<CoachingRoomPage params={Promise.resolve({ sessionId: 'test-session-1' })} />`.
3. Assert that `🎓 1-on-1 Executive Coaching Studio` is rendered in HTML.
4. Assert that `SimulatorRoom` / `AudiencePanel` / `Room Mood` / `Skepticism` are NOT rendered.

### B. `src/features/coaching/components/coaching-room.test.tsx`
Enhance isolated unit test:
1. Verify presence of:
   - `🎓 1-on-1 Executive Coaching Studio`
   - `Optimal Cadence (130-150 WPM)`
   - `🎙️ Ask Coach for Live Advice`
   - `✨ Coach Rescue: Model Pitch Script`
2. Assert absence of:
   - `Room Mood`
   - `Skepticism`
