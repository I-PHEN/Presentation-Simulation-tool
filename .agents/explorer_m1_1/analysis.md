# Milestone 1 Analysis Report: Route & Room Architecture

**Explorer**: Explorer M1 1 (Route & Room Explorer)  
**Repository**: `c:\Users\Michael\Downloads\sparring-partner`  
**Date**: 2026-07-30  

---

## 1. Executive Summary

This investigation analyzed Next.js App Router routes (`/coaching/[sessionId]`, `/rehearse/[sessionId]`, `/practice/[sessionId]`), room components (`CoachingRoom`, `SimulatorRoom`, `RehearsalRoom`), and header badge configurations.

### Key Finding:
1. **`/coaching/[sessionId]` Routing Bug**: `src/app/coaching/[sessionId]/page.tsx` currently imports and renders `SimulatorRoom` (the 4-examiner Defense Simulator) instead of `CoachingRoom` (the 1-on-1 Coaching Studio with 1 coach avatar).
2. **Header Badge**: `src/features/coaching/components/coaching-header.tsx` displays `<GraduationCap className="size-4 text-primary" /> Delivery Coaching` instead of `🎓 1-on-1 Executive Coaching Studio`.
3. **`/practice/[sessionId]` Legacy Room**: `src/app/practice/[sessionId]/page.tsx` currently renders `RehearsalRoom` (single examiner text rail) when `view === 'room'`. Replacing `RehearsalRoom` with `SimulatorRoom` ensures `/practice/[id]` opens the 4-examiner Defense Simulator.
4. **`/rehearse/[sessionId]`**: Already correctly renders `SimulatorRoom` (the 4-examiner Defense Simulator).

---

## 2. Next.js Routing Architecture Analysis

### A. `/coaching/[sessionId]`
- **File**: `src/app/coaching/[sessionId]/page.tsx`
- **Current Lines 5, 75**:
  ```tsx
  import { SimulatorRoom } from '@/features/simulator/SimulatorRoom';
  ...
  return <SimulatorRoom session={session} onComplete={() => router.push(`/reports/${session.id}`)} />;
  ```
- **Issue**: Renders the 4-examiner panel (`SimulatorRoom`) when users enter a coaching session.
- **Remediation**: Must import `CoachingRoom` from `@/features/coaching/components/coaching-room` and render `<CoachingRoom sessionId={sessionId} />`.

### B. `/coaching/new`
- **File**: `src/app/coaching/new/page.tsx`
- **Component**: Renders `CoachingSetup` (`src/features/coaching/components/coaching-setup.tsx`).
- **Flow**: Upon creation, `handleStartCoaching` performs a POST to `/api/session` and executes `router.push(/coaching/${data.sessionId})`. Once `app/coaching/[sessionId]/page.tsx` renders `CoachingRoom`, this setup flow correctly transitions into the 1-on-1 Coaching Studio.

### C. `/rehearse/[sessionId]`
- **File**: `src/app/rehearse/[sessionId]/page.tsx`
- **Current Lines 5, 54**:
  ```tsx
  import { SimulatorRoom } from '@/features/simulator/SimulatorRoom';
  ...
  return <SimulatorRoom session={session} onComplete={() => router.push(`/reports/${session.id}`)} />;
  ```
- **Assessment**: Correctly loads `SimulatorRoom` (4-examiner Defense Simulator).

### D. `/practice/[sessionId]`
- **File**: `src/app/practice/[sessionId]/page.tsx`
- **Current Line 7, 81**:
  ```tsx
  import { RehearsalRoom } from '@/features/defense/components/rehearsal-room';
  ...
  if (view === 'room') {
    return session ? <RehearsalRoom session={session} onComplete={() => router.push(`/reports/${session.id}`)} /> : ...;
  }
  ```
- **Issue**: Renders the legacy single-examiner layout `RehearsalRoom`.
- **Remediation**: Change `RehearsalRoom` to `SimulatorRoom` so navigating to `/practice/[id]?view=room` (or `/practice/[id]`) opens the 4-examiner Defense Simulator.

---

## 3. Component Roster & Avatar Setup

| Component | File Path | Avatar & Panel Configuration |
| --- | --- | --- |
| `CoachingRoom` | `src/features/coaching/components/coaching-room.tsx` | Renders `MasterGuiderHud`, which displays **1 single Coach Avatar** (Coach Sarah or Coach Marcus), vocal pacing telemetry (WPM, pitch), coach speech bubbles, and coach rescue modal. |
| `SimulatorRoom` | `src/features/simulator/SimulatorRoom.tsx` | Renders `AudiencePanel`, which displays the **4-examiner panel** (Professor, Examiner, Peer, and Presenter "You"). |
| `RehearsalRoom` | `src/features/defense/components/rehearsal-room.tsx` | Legacy component with a single text-based examiner rail on the right side. |
| `CoachingHeader` | `src/features/coaching/components/coaching-header.tsx` | Header component inside `CoachingRoom`. Currently contains `Delivery Coaching` badge on line 26. |

---

## 4. Discrepancy & Acceptance Criteria Verification Matrix

| Requirement / Acceptance Criteria | Current Code State | Pass/Fail | Proposed Fix |
| --- | --- | --- | --- |
| **AC 1**: Navigating to `/coaching/[id]` opens 1-on-1 Coaching Studio with 1 coach avatar, NOT 4-examiner panel | Renders `SimulatorRoom` (4-examiner panel) in `src/app/coaching/[sessionId]/page.tsx` | **FAIL** | Update `src/app/coaching/[sessionId]/page.tsx` to render `<CoachingRoom sessionId={sessionId} />` |
| **AC 2**: Navigating to `/rehearse/[id]` or `/practice/[id]` opens 4-examiner Defense Simulator | `/rehearse/[id]` renders `SimulatorRoom` (PASS). `/practice/[id]` renders `RehearsalRoom` (FAIL). | **PARTIAL** | Update `src/app/practice/[sessionId]/page.tsx` to render `SimulatorRoom` when `view === 'room'` |
| **AC 3**: Header badge in Coaching Studio reads `🎓 1-on-1 Executive Coaching Studio` | Line 26 of `src/features/coaching/components/coaching-header.tsx` displays `Delivery Coaching` | **FAIL** | Update header badge string in `src/features/coaching/components/coaching-header.tsx` to `🎓 1-on-1 Executive Coaching Studio` |

---

## 5. Recommended Code Modifications for Worker

### Change 1: `src/app/coaching/[sessionId]/page.tsx`
Replace the contents of `src/app/coaching/[sessionId]/page.tsx` with:
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

### Change 2: `src/features/coaching/components/coaching-header.tsx`
Update line 25-27 of `src/features/coaching/components/coaching-header.tsx`:
```tsx
// Before:
<span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
  <GraduationCap className="size-4 text-primary" /> Delivery Coaching
</span>

// After:
<span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
  🎓 1-on-1 Executive Coaching Studio
</span>
```

### Change 3: `src/app/practice/[sessionId]/page.tsx`
Update line 5 & line 81 of `src/app/practice/[sessionId]/page.tsx`:
```tsx
import { SimulatorRoom } from '@/features/simulator/SimulatorRoom';

// Inside PracticeSessionPage:
if (view === 'room') {
  if (error) return <p role="alert" className="m-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>;
  return session ? (
    <SimulatorRoom
      session={{ ...session, source: session.deck ? 'deck' : 'topic' }}
      onComplete={() => router.push(`/reports/${session.id}`)}
    />
  ) : (
    <p role="status" className="p-6 text-sm text-muted-foreground">Loading rehearsal room...</p>
  );
}
```

---

## 6. Risk Assessment & Side Effects
- **Backward Compatibility**: `CoachingRoom` already handles API fetch (`/api/session/${sessionId}`), presentation scripts, TTS voice output, and `MasterGuiderHud`. Updating `/coaching/[sessionId]` to render `CoachingRoom` restores intended design.
- **Route Consistency**: Unifying `/rehearse/[sessionId]` and `/practice/[sessionId]` on `SimulatorRoom` ensures all simulation modes feature the 4-examiner panel.
