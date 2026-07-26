import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';

interface JudgeFeedback {
  judgeType: string;
  icon: string;
  title: string;
  feedback: string;
}

interface ScoreResult {
  clarity: number;
  confidence: number;
  technical: number;
  storytelling: number;
  persuasiveness: number;
  conciseness: number;
  verbatimReading: number;
  eyeContact: number;
  posture: number;
  cameraPresence: number;
  overall: number;
  feedback: string;
  weaknesses: string[];
  recommendations: string[];
  knowledgeGaps: string[];
  judgeFeedback: JudgeFeedback[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, judges, cameraMetrics } = body as {
      sessionId: string;
      judges?: Array<{ id: string; icon: string; title: string; type: string }>;
      cameraMetrics?: { eyeContact: number; posture: number; presence: number; frames: number };
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Load the session with messages
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.practiceMode === 'defense') {
      return NextResponse.json(
        { error: 'Defense sessions use the evidence-led defense report.', reportUrl: `/api/defense/report` },
        { status: 409 },
      );
    }

    const isInterview = session.practiceMode === 'interview';

    let customCriteriaSection = '';
    if (session.customConfig) {
      try {
        const configObj = JSON.parse(session.customConfig);
        if (configObj) {
          if (configObj.focusAreas && configObj.focusAreas.length > 0) {
            customCriteriaSection += `\nVALUED FOCUS AREAS SPECIFIED BY USER:\nThe candidate specifically requested evaluation feedback on these dimensions:\n`;
            configObj.focusAreas.forEach((area: string) => {
              customCriteriaSection += `- Focus on: ${area}\n`;
            });
            customCriteriaSection += `Ensure the final "feedback", "weaknesses", and "recommendations" strongly target and evaluate these dimensions.\n`;
          }
          if (configObj.customPrompt) {
            customCriteriaSection += `\nUSER CUSTOM EVALUATION INSTRUCTIONS:\n${configObj.customPrompt}\n`;
          }
        }
      } catch (err) {
        console.error('Error parsing session customConfig in score/route:', err);
      }
    }

    // Build a transcript of the conversation
    const conversationTranscript = session.messages
      .map((msg) => `${msg.role === 'user' ? (isInterview ? 'Candidate' : 'Presenter') : (isInterview ? 'Interviewer' : 'Judge')}: ${msg.content}`)
      .join('\n\n');

    // Build the verbatim reading detection section
    const verbatimSection = isInterview
      ? `
VERBATIM READING DETECTION:
This is a job interview practice session. No slides are being presented. Please set verbatimReading to 100.`
      : session.content
      ? `
VERBATIM READING DETECTION:
The original presentation content is provided below. Compare the presenter's speech transcript against this material carefully. Detect whether the presenter was simply reading the slides verbatim instead of explaining or expanding on the content in their own words.

Original Presentation Content:
${session.content}

Scoring for verbatimReading:
- 100: Presenter explained all concepts in their own words, added context, examples, and insights not on the slides
- 80: Presenter mostly explained in own words with occasional slide-reading
- 60: Mixed — some sections explained, others read directly from slides
- 40: Presenter frequently read slides verbatim with minimal elaboration
- 20: Presenter mostly read slides with very little original explanation
- 0: Presenter read slides word-for-word throughout

If verbatim reading is detected (verbatimReading < 60), include a related weakness and recommendation.`
      : `
VERBATIM READING DETECTION:
No original presentation content was provided for comparison. Score verbatimReading based on whether the transcript sounds like slide-reading (repetitive, bullet-point style, lacking conversational flow) versus natural explanatory speech.`;

    // Build the camera presence scoring section
    const cameraSection = `
CAMERA PRESENCE SCORING:
${cameraMetrics && cameraMetrics.frames > 0
  ? `The presenter used a webcam during their presentation. Based on AI frame analysis over ${cameraMetrics.frames} samples:
- Average eye contact score: ${cameraMetrics.eyeContact}/100
- Average posture score: ${cameraMetrics.posture}/100
- Average camera presence score: ${cameraMetrics.presence}/100

Score eyeContact based on the measured average. Score posture based on the measured average. Score cameraPresence based on the measured average and overall presentation professionalism on camera.`
  : `The presenter did not use a webcam during their presentation. Score eyeContact, posture, and cameraPresence as 0 since no camera data is available.`
}`;

    // Build the multi-judge feedback section
    const judgesList = judges && judges.length > 0 ? judges : [];
    const judgeSection = judgesList.length > 0
      ? `
MULTI-JUDGE FEEDBACK:
The following judges were present during this session. For each judge, provide a brief perspective-specific feedback comment (2-3 sentences) from their unique viewpoint:

${judgesList.map((j) => `- Judge type: "${j.type}", icon: "${j.icon}", title: "${j.title}"`).join('\n')}

The "judgeFeedback" array must contain one entry per judge with their specific perspective feedback.`
      : `
MULTI-JUDGE FEEDBACK:
No specific judges were provided. Return an empty array for "judgeFeedback".`;

    const systemPrompt = isInterview
      ? `You are an expert technical and behavioral recruiter and hiring coach evaluating a mock job interview. This is a COACHING TOOL designed to help candidates genuinely improve their interview skills — not just score them. Your evaluation should feel like professional, personalized coaching feedback.

${customCriteriaSection}

You MUST return your response as a valid JSON object with the following structure:
{
  "clarity": <0-100>,
  "confidence": <0-100>,
  "technical": <0-100>,
  "storytelling": <0-100>,
  "persuasiveness": <0-100>,
  "conciseness": <0-100>,
  "verbatimReading": 100,
  "eyeContact": <0-100>,
  "posture": <0-100>,
  "cameraPresence": <0-100>,
  "overall": <0-100>,
  "feedback": "<detailed coaching feedback>",
  "weaknesses": ["weakness1", "weakness2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "knowledgeGaps": ["gap1", "gap2", ...],
  "judgeFeedback": [
    { "judgeType": "recruiter", "icon": "🤝", "title": "Recruiter", "feedback": "..." }
  ]
}

Scoring Criteria:
- Clarity (0-100): Communication/Clarity: How clear, structured, and easy to follow were the candidate's answers?
- Confidence (0-100): Poise/Confidence: Did the candidate speak with poise, conviction, and professionalism?
- Technical Understanding (0-100): Technical depth: How well did the candidate show their technical knowledge, coding background, or functional expertise for the target role?
- Storytelling (0-100): STAR Method: Did the candidate structure their examples well (Situation, Task, Action, Result)?
- Persuasiveness (0-100): Culture Fit: How convincing was the candidate? Did they demonstrate soft skills and cultural alignment?
- Conciseness (0-100): Conciseness: Did the candidate answer directly or ramble?
- Verbatim Reading (0-100): Always set to 100 (not applicable for interviews).
- Eye Contact (0-100): How well did the candidate maintain eye contact with the camera? 100 = consistent eye contact, 0 = no eye contact or camera not used.
- Posture (0-100): How was the candidate's posture on camera? 100 = upright, confident, professional, 0 = poor posture or camera not used.
- Camera Presence (0-100): Overall camera presence and professionalism. 100 = excellent on-camera presence, well-framed, engaging, 0 = camera not used.
- Overall (0-100): A weighted average of the interview performance metrics.

${verbatimSection}

${cameraSection}

${judgeSection}

KNOWLEDGE GAP DETECTION:
Compare the candidate's answers against the target role requirements and their CV/Resume. Identify areas where they struggled to answer, showed technical gaps, or lacked depth. List 1-3 specific gaps in "knowledgeGaps".

Additional requirements:
- feedback: A detailed coaching paragraph (4-6 sentences) that feels like a supportive but honest interviewer/coach talking to them. Mention what they did well (e.g. structured answers, technical clarity) AND what needs work.
- weaknesses: 2-4 specific weaknesses. Be specific, not generic.
- recommendations: 2-4 actionable, specific recommendations for improvement (e.g., "Use concrete metrics when describing your impact in past coding projects").
- knowledgeGaps: 1-3 specific topics or skills the candidate should study or prepare more on.
- judgeFeedback: One entry per interviewer present with perspective-specific coaching feedback (2-3 sentences each), or empty array if no interviewers.

Return ONLY the JSON object, no other text.`
      : `You are an expert presentation coach evaluating a practice session. This is a COACHING TOOL designed to help people genuinely improve their presentation skills — not just score them. Your evaluation should feel like personalized coaching feedback.

${customCriteriaSection}

You MUST return your response as a valid JSON object with the following structure:
{
  "clarity": <0-100>,
  "confidence": <0-100>,
  "technical": <0-100>,
  "storytelling": <0-100>,
  "persuasiveness": <0-100>,
  "conciseness": <0-100>,
  "verbatimReading": <0-100>,
  "eyeContact": <0-100>,
  "posture": <0-100>,
  "cameraPresence": <0-100>,
  "overall": <0-100>,
  "feedback": "<detailed coaching feedback>",
  "weaknesses": ["weakness1", "weakness2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "knowledgeGaps": ["gap1", "gap2", ...],
  "judgeFeedback": [
    { "judgeType": "investor", "icon": "💰", "title": "Investor", "feedback": "..." }
  ]
}

Scoring Criteria:
- Clarity (0-100): How clear and understandable was the presentation? Could a layperson follow the main points?
- Confidence (0-100): How confident did the presenter sound? Did they show conviction or hesitate?
- Technical Understanding (0-100): How well did the presenter understand the technical aspects? Could they explain technical details accurately when pressed?
- Storytelling (0-100): How engaging was the narrative structure? Did the presentation flow logically with a compelling story?
- Persuasiveness (0-100): How convincing were the arguments? Did the presenter effectively address objections?
- Conciseness (0-100): How concise and focused was the presentation? Did the presenter stay on point or ramble?
- Verbatim Reading (0-100): How well did the presenter explain in their own words vs. just reading slides? 100 = fully explained in own words with examples and insights, 0 = just read slides verbatim
- Eye Contact (0-100): How well did the presenter maintain eye contact with the camera? 100 = consistent eye contact throughout, 0 = no eye contact or no camera used
- Posture (0-100): How was the presenter's posture during the presentation? 100 = upright, confident, professional, 0 = poor posture or no camera used
- Camera Presence (0-100): Overall camera presence and professionalism. 100 = excellent on-camera presence, well-framed, engaging, 0 = no camera used
- Overall (0-100): A weighted average considering all the above dimensions

${verbatimSection}

${cameraSection}

${judgeSection}

KNOWLEDGE GAP DETECTION:
Compare the presentation content against what the presenter actually said. Identify topics they skipped, glossed over, or couldn't explain when asked. These are knowledge gaps — areas where the presenter needs to study more before presenting for real. List 2-4 specific gaps in "knowledgeGaps".

Additional requirements:
- feedback: A detailed coaching paragraph (4-6 sentences) that feels like a real coach talking to them. Be specific, not generic. Mention what they did well AND what needs work. Use a supportive but honest tone.
- weaknesses: 3-5 specific weaknesses (include verbatim reading and knowledge gaps if detected). Be specific, not generic.
- recommendations: 3-5 actionable, specific recommendations for improvement. Not generic advice like "practice more" — give them specific things to work on (e.g., "Prepare a 30-second explanation of your competitive advantage that doesn't use any jargon")
- knowledgeGaps: 2-4 specific topics or areas the presenter should study more
- judgeFeedback: One entry per judge with perspective-specific coaching feedback (2-3 sentences each), or empty array if no judges

Return ONLY the JSON object, no other text.`;

    const userMessage = isInterview
      ? `Target Job & Company: ${session.title}
Interviewer Types: ${judgesList.map(j => j.title).join(', ')}

Candidate's CV/Resume:
${session.content || 'None provided'}

Conversation Transcript:
${conversationTranscript || 'No conversation recorded yet.'}

Please evaluate this mock job interview practice session. Focus on coaching them to improve their answers — be specific, honest, and supportive.`
      : `Session Title: ${session.title}
Audience Type: ${session.audienceType}

${session.summary ? `Presentation Summary: ${session.summary}` : ''}

Conversation Transcript:
${conversationTranscript || 'No conversation recorded yet.'}

Please evaluate this presentation practice session. Focus on coaching them to improve — be specific, honest, and supportive.`;

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      thinking: { type: 'disabled' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json(
        { error: 'Failed to generate score' },
        { status: 500 }
      );
    }

    // Parse the JSON response - handle potential markdown code blocks
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    const scoreResult: ScoreResult = JSON.parse(cleanedResponse);

    // Validate required fields
    const requiredFields = [
      'clarity',
      'confidence',
      'technical',
      'storytelling',
      'persuasiveness',
      'conciseness',
      'verbatimReading',
      'eyeContact',
      'posture',
      'cameraPresence',
      'overall',
      'feedback',
      'weaknesses',
      'recommendations',
      'knowledgeGaps',
      'judgeFeedback',
    ];

    for (const field of requiredFields) {
      if (scoreResult[field as keyof ScoreResult] === undefined) {
        return NextResponse.json(
          { error: `Missing field in score result: ${field}` },
          { status: 500 }
        );
      }
    }

    // Clamp scores to 0-100
    const clamp = (n: number) => Math.max(0, Math.min(100, n));

    // Delete existing score if any (upsert)
    const existingScore = await db.score.findUnique({
      where: { sessionId },
    });

    if (existingScore) {
      await db.score.delete({ where: { sessionId } });
    }

    // Ensure judgeFeedback entries match the provided judges
    const finalJudgeFeedback: JudgeFeedback[] = judgesList.length > 0
      ? judgesList.map((judge) => {
          const matched = scoreResult.judgeFeedback?.find(
            (jf) => jf.judgeType === judge.type
          );
          return {
            judgeType: judge.type,
            icon: judge.icon,
            title: judge.title,
            feedback: matched?.feedback || `No specific feedback from ${judge.title} perspective.`,
          };
        })
      : [];

    // Save to database
    const score = await db.score.create({
      data: {
        sessionId,
        clarity: clamp(scoreResult.clarity),
        confidence: clamp(scoreResult.confidence),
        technical: clamp(scoreResult.technical),
        storytelling: clamp(scoreResult.storytelling),
        persuasiveness: clamp(scoreResult.persuasiveness),
        conciseness: clamp(scoreResult.conciseness),
        verbatimReading: clamp(scoreResult.verbatimReading),
        eyeContact: clamp(scoreResult.eyeContact),
        posture: clamp(scoreResult.posture),
        cameraPresence: clamp(scoreResult.cameraPresence),
        overall: clamp(scoreResult.overall),
        feedback: scoreResult.feedback,
        weaknesses: JSON.stringify(scoreResult.weaknesses),
        recommendations: JSON.stringify(scoreResult.recommendations),
        knowledgeGaps: JSON.stringify(scoreResult.knowledgeGaps || []),
        judgeFeedback: JSON.stringify(finalJudgeFeedback),
      },
    });

    // Update session status to completed
    await db.session.update({
      where: { id: sessionId },
      data: { status: 'completed' },
    });

    return NextResponse.json({
      score: {
        ...score,
        weaknesses: scoreResult.weaknesses,
        recommendations: scoreResult.recommendations,
        knowledgeGaps: scoreResult.knowledgeGaps || [],
        judgeFeedback: finalJudgeFeedback,
      },
    });
  } catch (error) {
    console.error('Error generating score:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse LLM response as JSON' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate score' },
      { status: 500 }
    );
  }
}
