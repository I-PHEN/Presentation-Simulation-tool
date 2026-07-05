# Task 4 - Score API Enhancement Agent

## Task: Enhance the Score API with Verbatim Reading Detection and Multi-Judge Scoring

### Changes Made

#### 1. Prisma Schema Update (`prisma/schema.prisma`)
- Added `verbatimReading Float @default(0)` field to Score model
- Added `judgeFeedback String @default("[]")` field to Score model (stored as JSON string)
- Ran `bun run db:push` to apply changes

#### 2. Score API Update (`src/app/api/score/route.ts`)

**Verbatim Reading Detection:**
- Added `verbatimReading` dimension (0-100) to the ScoreResult interface
- If session has `content` (uploaded presentation material), it is included in the LLM prompt with explicit instructions to compare the transcript against the original content
- Detailed scoring rubric: 100 = explained in own words, 0 = read slides word-for-word
- If no content available, the LLM is instructed to detect slide-reading patterns from transcript style
- If verbatim reading is detected (score < 60), weaknesses and recommendations are expected to mention it

**Multi-Judge Scoring:**
- Request body now accepts optional `judges` array with `{ id, icon, title, type }` per judge
- LLM prompt includes section listing all judges and requesting perspective-specific feedback (2-3 sentences each)
- Response includes `judgeFeedback` array with `{ judgeType, icon, title, feedback }` per judge
- After LLM response, judgeFeedback entries are matched/merged with provided judge metadata to ensure all icons/titles are correct
- If no judges provided, judgeFeedback is empty array

**Updated JSON Response Structure:**
```json
{
  "clarity": <0-100>,
  "confidence": <0-100>,
  "technical": <0-100>,
  "storytelling": <0-100>,
  "persuasiveness": <0-100>,
  "conciseness": <0-100>,
  "verbatimReading": <0-100>,
  "overall": <0-100>,
  "feedback": "...",
  "weaknesses": ["..."],
  "recommendations": ["..."],
  "judgeFeedback": [{ "judgeType": "...", "icon": "...", "title": "...", "feedback": "..." }]
}
```

**DB Persistence:**
- `verbatimReading` stored as Float
- `judgeFeedback` stored as JSON string (serialized with JSON.stringify)
- Both new fields included in Score creation
- Response unwraps `weaknesses`, `recommendations`, and `judgeFeedback` from parsed JSON (not raw DB strings)

### Verification
- Lint passes cleanly
- Dev server running without errors
- All existing code style and conventions preserved
