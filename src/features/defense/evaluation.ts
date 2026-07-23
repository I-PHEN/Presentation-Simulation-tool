import type { DefenseMode, ExaminerEvent, ReadingEvidence } from './types';

interface DefenseEvaluationInput {
  title: string;
  mode: DefenseMode;
  deckText: string;
  transcript: string;
  readingEvidence: ReadingEvidence[];
  examinerEvents?: ExaminerEvent[];
}

export function buildDefenseEvaluationPrompt({
  title,
  mode,
  deckText,
  transcript,
  readingEvidence,
  examinerEvents = [],
}: DefenseEvaluationInput): string {
  return `You are a rigorous but supportive thesis-defense examiner.

Session title: ${title}
Simulation mode: ${mode === 'diagnostic' ? 'Diagnostic Defense Practice' : 'Mock Defense'}

Slide deck context:
${deckText}

Presenter transcript:
${transcript || 'No transcript was captured.'}

Calculated slide-reading evidence (deterministic, not a model guess):
${JSON.stringify(readingEvidence)}

Examiner events (typed session evidence):
${JSON.stringify(examinerEvents)}

Do not infer verbatim reading without this evidence. Treat a high overlap as copied slide phrasing, but do not penalize a presenter merely for using a necessary technical term. If hasSpeech is false, state that slide-reading evidence is unavailable for that slide.

Return only valid JSON with this structure:
{
  "findings": [
    { "title": "", "risk": "high"|"medium"|"low", "basis": "slide_reliance"|"response_explanation", "presenterQuote": "exact direct quote from that slide's presenter speech", "evidence": "response gap", "slideIndex": 1, "drill": "" }
  ],
  "personaVerdicts": [
    { "personaId": "the persona.id from an examiner event above", "line": "one sentence, in that examiner's voice, grounded in a question they actually asked" }
  ]
}

Provide 1-3 findings. Each finding must name a valid slide, include a quoted presenter source in presenterQuote as an exact direct quote from that slide's presenter speech, identify the response gap, and give one short drill. Use slide_reliance only where deterministic reading evidence for that same slide has actual speech and copied phrases/overlap; otherwise use response_explanation. An examiner event may be linked only when present above. For personaVerdicts, output at most one entry per distinct persona.id that appears in the examiner events above, each a single sentence tied to a question that persona actually raised; omit personaVerdicts entirely if there were no examiner events. Never judge slide reading without the deterministic evidence. Do not output camera, multi-judge, general scores, readiness, or generic coaching.`;
}
