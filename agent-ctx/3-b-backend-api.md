# Worklog

## Task 3-b: Backend API Routes for AI Presentation Sparring Partner

### Completed Routes

1. **`/src/app/api/analyze/route.ts`** - POST
   - Accepts `{ content, title }` 
   - Uses LLM to generate summary, key points, and persona-specific questions
   - Creates a new Session with status="analyzed"
   - Returns structured analysis with sessionId

2. **`/src/app/api/chat/route.ts`** - POST
   - Accepts `{ sessionId, message }`
   - Loads session content, summary, and previous messages from DB
   - Constructs persona-specific system prompts (investor, professor, hackathon_judge, customer, executive)
   - AI actively challenges the presenter, asks follow-ups, points out weaknesses
   - Saves both user message and AI response to DB
   - Updates session status to "practicing" on first chat

3. **`/src/app/api/transcribe/route.ts`** - POST
   - Accepts FormData with `audio` field
   - Converts audio to base64 and uses ASR
   - Returns `{ text }`

4. **`/src/app/api/tts/route.ts`** - POST
   - Accepts `{ text, voice? }`
   - Handles 1000-char limit by splitting by sentences
   - Returns audio buffer with Content-Type: audio/mpeg

5. **`/src/app/api/score/route.ts`** - POST
   - Accepts `{ sessionId }`
   - Loads session with messages, builds conversation transcript
   - LLM evaluates across 7 dimensions (0-100): clarity, confidence, technical, storytelling, persuasiveness, conciseness, overall
   - Also generates feedback, weaknesses, recommendations
   - Saves to Score table, updates session status to "completed"
   - Handles upsert (deletes existing score before creating new one)

6. **`/src/app/api/sessions/route.ts`** - GET
   - Returns all sessions ordered by createdAt desc with scores

7. **`/src/app/api/session/route.ts`** - POST
   - Accepts `{ title, audienceType, content }`
   - Validates audienceType against allowed values
   - Creates session with status="upload"

8. **`/src/app/api/session/[id]/route.ts`** - GET
   - Returns session with messages (ordered asc) and scores

### Technical Details
- All routes use TypeScript with strict typing
- LLM calls use `thinking: { type: 'disabled' }` and `'assistant'` role for system prompts
- JSON responses from LLM are cleaned of markdown code blocks before parsing
- Error handling with try/catch and proper HTTP status codes
- Lint passes cleanly with no errors
