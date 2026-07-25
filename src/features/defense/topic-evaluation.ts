import type { ExaminerEvent } from './types';

interface TopicEvaluationInput {
  topic: string;
  transcript: string;
  examinerEvents?: ExaminerEvent[];
}

/**
 * Deckless counterpart to buildDefenseEvaluationPrompt. There are no slides, so
 * findings are grounded in the presenter's own transcript (reasoning, evidence,
 * dodged questions) and must use basis "response_explanation" only - never
 * "slide_reliance". The JSON contract matches the deck prompt so the report
 * route's findings schema + anti-fabrication validation apply unchanged.
 */
export function buildTopicEvaluationPrompt({ topic, transcript, examinerEvents = [] }: TopicEvaluationInput): string {
  return `You are a rigorous but supportive examiner probing a spoken argument. There are no slides — the speaker is defending a topic out loud.

Topic: ${topic}

Presenter transcript:
${transcript || 'No transcript was captured.'}

Examiner events (typed session evidence):
${JSON.stringify(examinerEvents)}

Judge only the spoken reasoning: the clarity of the central claim, unsupported assertions, and questions that were dodged or answered thinly. There are NO slides, so never invoke slide reading.

Return only valid JSON with this structure:
{
  "findings": [
    { "title": "", "risk": "high"|"medium"|"low", "basis": "response_explanation", "presenterQuote": "exact direct quote from the presenter transcript", "evidence": "the reasoning or response gap", "slideIndex": 1, "drill": "" }
  ],
  "personaVerdicts": [
    { "personaId": "the persona.id from an examiner event above", "line": "one sentence, in that examiner's voice, grounded in a question they actually asked" }
  ]
}

Provide 1-3 findings. Every finding must set "basis" to "response_explanation" (slide_reliance is forbidden — there are no slides), set "slideIndex" to 1, quote the presenter's own words exactly in presenterQuote, name the reasoning gap in evidence, and give one short drill. For personaVerdicts, output at most one entry per distinct persona.id that appears in the examiner events above, each a single sentence tied to a question that persona actually raised; omit personaVerdicts entirely if there were no examiner events. Do not output camera, multi-judge, general scores, readiness, slide reading, or generic coaching.`;
}
