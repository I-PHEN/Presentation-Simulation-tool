import type { ExaminerEvent, TimelineMoment, TranscriptSegment } from './types';

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function buildTimeline({ transcriptSegments, examinerEvents }: { transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[] }): TimelineMoment[] {
  const fromSpeech: TimelineMoment[] = transcriptSegments
    .filter((segment) => segment.role === 'presenter' && segment.text.trim())
    .map((segment) => ({ atMs: segment.startedAtMs, kind: 'presenter' as const, slideIndex: segment.slideIndex, text: segment.text.trim() }));
  const fromEvents: TimelineMoment[] = examinerEvents.map((event) => ({
    atMs: event.occurredAtMs,
    kind: event.kind,
    slideIndex: event.slideIndex,
    text: event.text,
    ...(event.persona ? { personaTitle: event.persona.title } : {}),
  }));
  return [...fromSpeech, ...fromEvents].sort((a, b) => a.atMs - b.atMs);
}
