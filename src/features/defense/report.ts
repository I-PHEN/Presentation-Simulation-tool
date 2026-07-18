import { analyseReading } from './reading-analysis';
import { spokenBySlide } from './transcript';
import type { DeckContext, DefenseFinding, DefenseReport, ExaminerEvent, TranscriptSegment } from './types';

const unavailable = 'Presenter speech unavailable for this slide.';

export function buildDefenseReport({ deck, transcriptSegments, examinerEvents, findings }: { deck: DeckContext; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; findings: DefenseFinding[] }): DefenseReport {
  const spoken = spokenBySlide(transcriptSegments);
  const readingEvidence = analyseReading(deck.slides, spoken);
  const fallback: DefenseFinding = { title: 'Build your explanation around the claim', risk: 'medium', basis: 'response_explanation', presenterQuote: spoken[deck.slides[0]?.index ?? 1] || unavailable, evidence: 'No validated finding was returned.', slideIndex: deck.slides[0]?.index ?? 1, drill: 'Explain the main claim in your own words, then give one supporting reason.' };
  const riskOrder = { high: 0, medium: 1, low: 2 } as const;
  const ordered = [...findings].sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);
  const highestLeverage = ordered[0] ?? fallback;
  const sourceFindings = ordered.length ? ordered : [fallback];
  const evidenceTrail = sourceFindings.map((finding) => {
    const slide = deck.slides.find((item) => item.index === finding.slideIndex);
    const event = examinerEvents.find((item) => item.slideIndex === finding.slideIndex);
    return { slideIndex: finding.slideIndex, slideClaim: slide?.text || 'Slide claim unavailable.', presenterSpeech: spoken[finding.slideIndex] || unavailable, ...(event ? { examinerEvent: event.text } : {}), responseGap: finding.evidence, drill: finding.drill };
  });
  const available = Object.keys(spoken).length > 0;
  const copied = readingEvidence.filter((item) => item.hasSpeech && item.overlap > 0).length;
  return {
    highestLeverage,
    evidenceTrail,
    strengths: available ? ['You provided presenter speech that can be reviewed against the deck.'] : [],
    slideReliance: { available, summary: available ? (copied ? `Evidence shows copied phrasing on ${copied} slide${copied === 1 ? '' : 's'}; use the trail below to rehearse an explanation.` : 'Speech evidence does not show copied slide phrasing.') : 'Available only when presenter speech was captured.', evidence: readingEvidence.filter((item) => item.hasSpeech) },
    nextDrill: highestLeverage.drill,
  };
}
