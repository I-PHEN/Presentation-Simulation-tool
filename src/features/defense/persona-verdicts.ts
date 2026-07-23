import type { ExaminerEvent, PersonaChallenge, PersonaVerdict, TranscriptSegment } from './types';

export function buildPersonaVerdicts({ examinerEvents, transcriptSegments, verdictLines }: { examinerEvents: ExaminerEvent[]; transcriptSegments: TranscriptSegment[]; verdictLines: Record<string, string> }): PersonaVerdict[] {
  const presenter = transcriptSegments.filter((segment) => segment.role === 'presenter');
  const responded = (event: ExaminerEvent) => presenter.some((segment) => segment.slideIndex === event.slideIndex && segment.startedAtMs > event.occurredAtMs);

  const order: string[] = [];
  const groups = new Map<string, { title: string; challenges: PersonaChallenge[] }>();
  for (const event of examinerEvents) {
    if (!event.persona) continue;
    const id = event.persona.id;
    if (!groups.has(id)) { groups.set(id, { title: event.persona.title, challenges: [] }); order.push(id); }
    groups.get(id)!.challenges.push({ atMs: event.occurredAtMs, slideIndex: event.slideIndex, text: event.text, responded: responded(event) });
  }

  return order.map((id) => {
    const group = groups.get(id)!;
    const line = verdictLines[id];
    return { personaId: id, personaTitle: group.title, challenges: group.challenges, verdictLine: typeof line === 'string' && line.trim() ? line.trim() : null };
  });
}
