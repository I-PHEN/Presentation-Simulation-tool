# Investigation Analysis: CoachingRoom vs SimulatorRoom Architecture & Remediation

## Executive Summary
In Iteration 1 (commit `4b5277bb7f0ed2c6e4e902d5767ba22bd8fceb00`), `src/app/coaching/[sessionId]/page.tsx` was modified to render `<SimulatorRoom>` instead of `<CoachingRoom>`. This left `<CoachingRoom>` as unmounted dead code while unit tests in `coaching-room.test.tsx` mounted it in isolation. As a result, the live `/coaching/[sessionId]` route lacked the Live Speech WPM meter (`Optimal Cadence (130-150 WPM)`), lacked the Coach Rescue button and modal, mislabeled the primary action button as `✨ Ask Coach`, and rendered Defense Simulator widgets ("Room Mood", "Skepticism 35%/78%").

Restoring `/coaching/[sessionId]` to render `<CoachingRoom>` directly re-connects the complete Coaching Studio HUD, live WPM cadence gauge, Coach Rescue modal, and exact action buttons with zero Defense Simulator widgets, while leaving `/rehearse/[sessionId]` and `/practice/[sessionId]` unchanged as 4-examiner Defense Simulators.

---

## 1. Architectural & Component Difference Matrix

| Metric / Component | `CoachingRoom` (`src/features/coaching/components/coaching-room.tsx`) | `SimulatorRoom` (`src/features/simulator/SimulatorRoom.tsx`) |
| :--- | :--- | :--- |
| **Intended Route** | `/coaching/[sessionId]` (1-on-1 Executive Coaching) | `/rehearse/[sessionId]` & `/practice/[sessionId]` (Defense Simulator) |
| **Header Badge** | `<CoachingHeader>` with `🎓 1-on-1 Executive Coaching Studio` | `<SimulatorHeader>` |
| **Audience Panel / Roster** | Single Coach Persona Avatar (Sarah or Marcus) in `MasterGuiderHud` | 4-Person Panel Grid (Professor, Examiner, Peer + Presenter) in `AudiencePanel` |
| **Defense Simulator Widgets** | **NONE** (No "Room Mood" or "Skepticism" meters) | **PRESENT** ("Room Mood", "Skepticism 35%/78%") |
| **Speech WPM Meter** | `MasterGuiderHud` showing `Optimal Cadence (130-150 WPM)`, `Deliberate Pace (<130 WPM)`, `Fast Pace (>150 WPM)` | Missing in `SimulatorRoom` toolbar/aside |
| **Primary Action Button** | Exact text: `🎙️ Ask Coach for Live Advice` | Labeled `✨ Ask Coach` |
| **Secondary Action Button** | Exact text: `✨ Coach Rescue: Model Pitch Script` | Missing |
| **Coach Rescue Modal** | `CoachRescueModal` with Opening Hook, Full Script, Talking Points, Listen to Voiceover CTA, Copy CTA | Missing |
| **Teleprompter** | 2-row `CoachingTeleprompter` with delivery guide & talking points | 2-row `CoachingTeleprompter` |

---

## 2. Deep Dive into Required Features & State Management

### A. Routing & Route Isolation
- `/coaching/[sessionId]/page.tsx` must import and render `<CoachingRoom sessionId={sessionId} />`.
- `/rehearse/[sessionId]/page.tsx` continues to render `<SimulatorRoom session={session} ... />`.
- `/practice/[sessionId]/page.tsx` continues to render `<RehearsalRoom session={session} ... />` / `<SimulatorRoom>`.

### B. Header & Persona Roster (R1)
- `CoachingHeader` renders `data-testid="coaching-studio-badge"` containing `🎓 1-on-1 Executive Coaching Studio`.
- Active coach persona (`sarah` or `marcus`) is fetched from `useAppStore.getState().coachPersona`.
- `MasterGuiderHud` displays Coach Sarah (`Executive Presentation Strategist`) or Coach Marcus (`Senior Communication Coach`).
- No Defense Simulator widgets ("Room Mood" / "Skepticism") are rendered in `CoachingRoom`.

### C. Audio Engine & TTS Playback (R2)
- Auto-greeting on load: Generates TTS greeting via `generateTTS(greeting, voiceId)` and plays audio using `playAudioData(audio)`.
- Voice IDs:
  - Coach Sarah: `a7a59115-2425-4192-844c-1e98ec7d6877`
  - Coach Marcus: `533b2990-5b82-45a4-b9f2-367776972ca6`
- Spoken Coach Advice: `handleAskCoachAdvice` generates advice text, sets `coachSpeechBubble`, and plays spoken TTS.
- Rescue Audio: `handlePlayRescueAudio` speaks the `rescueScript` using the coach's TTS voice ID.
- Only the selected Coach persona speaks.

### D. HUD, Teleprompter, WPM & Rescue Modal (R3)
- `CoachingTeleprompter`: 2-row teleprompter displaying Hook (0-15s) and 3 talking points (Context, Solution, Impact).
- `MasterGuiderHud`:
  - Speech pacing gauge with label `Optimal Cadence (130-150 WPM)`.
  - Primary button: `🎙️ Ask Coach for Live Advice`.
  - Secondary button: `✨ Coach Rescue: Model Pitch Script`.
- `CoachRescueModal`:
  - State: `rescueModalOpen` boolean.
  - Renders model pitch script, opening hook, key talking points list, `Listen to Coach Voiceover` button, and `Copy Script` button.

---

## 3. Step-by-Step Fix Plan for Worker

### Step 1: Update `/coaching/[sessionId]/page.tsx`
Change line 75 of `src/app/coaching/[sessionId]/page.tsx` to mount `<CoachingRoom sessionId={sessionId} />` directly:
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

  if (!sessionId) return <p role="status" className="p-6 text-sm text-muted-foreground">Opening your Guided Coaching Room...</p>;

  return <CoachingRoom sessionId={sessionId} />;
}
```

### Step 2: Verify & Enhance `CoachingRoom` (`src/features/coaching/components/coaching-room.tsx`)
1. Ensure session loading from `/api/session/${sessionId}` works seamlessly.
2. Verify mic toggle, STT integration, and live WPM cadence meter updates.
3. Confirm exact text for primary button (`🎙️ Ask Coach for Live Advice`) and secondary button (`✨ Coach Rescue: Model Pitch Script`).
4. Confirm `CoachRescueModal` opens, displays script data, and plays TTS voiceover on CTA click.

### Step 3: Verify Preservation of Rehearsal & Practice Routes
- Check `src/app/rehearse/[sessionId]/page.tsx` and `src/app/practice/[sessionId]/page.tsx` to ensure zero changes were introduced.
- Confirm they continue to render `SimulatorRoom` / `RehearsalRoom` with the 4-examiner Defense Simulator panel grid.

### Step 4: Align Unit Tests
1. **`src/app/coaching/[sessionId]/page.test.tsx`**: Update expectation to assert that `page.tsx` renders `CoachingRoom`.
2. **`src/features/coaching/components/coaching-room.test.tsx`**: Verify all assertions pass for `🎓 1-on-1 Executive Coaching Studio`, `Optimal Cadence (130-150 WPM)`, `🎙️ Ask Coach for Live Advice`, and `✨ Coach Rescue: Model Pitch Script`.
3. **`src/features/simulator/room-verification.test.tsx` & `SimulatorRoom.test.tsx`**: Ensure test suites reflect strict room separation between `CoachingRoom` and `SimulatorRoom`.

### Step 5: Verification & Test Run
Run `npx vitest run` to verify 100% test suite pass rate.
