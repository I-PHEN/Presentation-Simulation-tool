import type { TranscriptSegment } from './types';

export function appendPresenterSegment(
  segments: TranscriptSegment[],
  segment: TranscriptSegment,
): TranscriptSegment[] {
  if (segment.role !== 'presenter') {
    throw new Error('Only presenter segments can be appended to presenter evidence');
  }

  if (
    !Number.isFinite(segment.startedAtMs) ||
    !Number.isFinite(segment.endedAtMs) ||
    segment.startedAtMs < 0 ||
    segment.endedAtMs < segment.startedAtMs
  ) {
    throw new Error('Transcript segment times must be non-negative and ordered');
  }

  return [...segments, segment];
}

export function spokenBySlide(segments: TranscriptSegment[]): Record<number, string> {
  return segments.reduce<Record<number, string>>((spoken, segment) => {
    const text = segment.text.trim();
    if (segment.role !== 'presenter' || !text) {
      return spoken;
    }

    spoken[segment.slideIndex] = spoken[segment.slideIndex]
      ? `${spoken[segment.slideIndex]} ${text}`
      : text;
    return spoken;
  }, {});
}
