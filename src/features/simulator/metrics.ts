import type { TranscriptSegment } from '@/features/defense/types';

const FILLERS = ['um', 'uh', 'er', 'like', 'you know', 'basically', 'sort of', 'kind of', 'i mean', 'actually'];

export interface SpeechMetrics {
  wordCount: number;
  spokenMs: number;
  wpm: number;
  fillerCount: number;
  fillerRate: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function computeMetrics(segments: TranscriptSegment[]): SpeechMetrics {
  const presenter = segments.filter((segment) => segment.role === 'presenter');
  const text = presenter.map((segment) => segment.text).join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const spokenMs = presenter.reduce((sum, segment) => sum + Math.max(0, segment.endedAtMs - segment.startedAtMs), 0);
  const minutes = spokenMs / 60_000;
  const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;

  const haystack = text.toLowerCase();
  let fillerCount = 0;
  for (const filler of FILLERS) {
    const matches = haystack.match(new RegExp(`\\b${escapeRegExp(filler)}\\b`, 'g'));
    fillerCount += matches ? matches.length : 0;
  }
  const fillerRate = wordCount > 0 ? fillerCount / wordCount : 0;

  return { wordCount, spokenMs, wpm, fillerCount, fillerRate };
}
