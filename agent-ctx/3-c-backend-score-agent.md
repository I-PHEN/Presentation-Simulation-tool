# Task 3-c: Update /api/score to include camera presence metrics

## Agent: backend-score-agent

## Work Log
- Added `cameraMetrics` to request body type: `{ eyeContact: number; posture: number; presence: number; frames: number }`
- Added `eyeContact`, `posture`, `cameraPresence` to `ScoreResult` interface
- Added camera presence scoring section (`CAMERA PRESENCE SCORING`) to the system prompt after the verbatim section
- When `cameraMetrics.frames > 0`: includes measured averages in prompt for LLM to base scores on
- When no camera data: instructs LLM to score all three as 0
- Added `eyeContact`, `posture`, `cameraPresence` to the JSON schema in the system prompt
- Added scoring criteria for all three camera metrics
- Updated `requiredFields` array to include 'eyeContact', 'posture', 'cameraPresence'
- Updated `db.score.create` data to include `eyeContact`, `posture`, `cameraPresence` with clamp

## Stage Summary
- Score API now accepts and stores camera metrics (eyeContact, posture, cameraPresence)
- Lint passes clean
