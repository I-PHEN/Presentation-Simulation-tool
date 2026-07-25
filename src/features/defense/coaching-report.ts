import { buildDefenseReport } from './report';
import { computeCoachingMetrics } from './coaching-metrics';
import { buildTimeline } from './coaching-timeline';
import { buildPersonaVerdicts } from './persona-verdicts';
import type { CoachingReport, DeckContext, DefenseFinding, ExaminerEvent, TranscriptSegment } from './types';

export function validatePersonaVerdictLines(examinerEvents: ExaminerEvent[], raw: { personaId: string; line: string }[] | undefined): Record<string, string> {
  if (!raw) return {};
  const known = new Set(examinerEvents.map((event) => event.persona?.id).filter((id): id is string => Boolean(id)));
  const kept: Record<string, string> = {};
  for (const entry of raw) {
    if (entry && typeof entry.personaId === 'string' && typeof entry.line === 'string' && entry.line.trim() && known.has(entry.personaId)) {
      kept[entry.personaId] = entry.line.trim();
    }
  }
  return kept;
}

export function assembleCoachingReport({ deck, transcriptSegments, examinerEvents, findings, verdictLines, minimal, deckless = false }: { deck: DeckContext; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; findings: DefenseFinding[]; verdictLines: Record<string, string>; minimal: boolean; deckless?: boolean }): CoachingReport {
  // buildDefenseReport already orders findings, fills a grounded fallback, and computes strengths.
  const base = buildDefenseReport({ deck, transcriptSegments, examinerEvents, findings });
  const drills = findings.length ? [...findings].map((finding) => finding.drill) : [base.nextDrill];
  return {
    highestLeverage: base.highestLeverage,
    drills,
    metrics: computeCoachingMetrics({ deck, transcriptSegments, examinerEvents, deckless }),
    timeline: buildTimeline({ transcriptSegments, examinerEvents }),
    personaVerdicts: buildPersonaVerdicts({ examinerEvents, transcriptSegments, verdictLines }),
    strengths: base.strengths,
    minimal,
  };
}
