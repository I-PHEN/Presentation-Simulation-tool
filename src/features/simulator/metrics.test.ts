import { describe, expect, it } from 'vitest';
import { computeMetrics } from './metrics';
import type { TranscriptSegment } from '@/features/defense/types';

const seg = (text: string, startedAtMs: number, endedAtMs: number): TranscriptSegment => ({
  role: 'presenter', slideIndex: 1, text, startedAtMs, endedAtMs,
});

describe('computeMetrics', () => {
  it('is all-zero for an empty transcript', () => {
    expect(computeMetrics([])).toEqual({ wordCount: 0, spokenMs: 0, wpm: 0, fillerCount: 0, fillerRate: 0 });
  });

  it('counts only presenter words and computes words-per-minute over spoken time', () => {
    // 6 presenter words across 60_000ms => 6 wpm. Examiner speech is excluded.
    const segments = [seg('one two three four five six', 0, 60_000), { ...seg('examiner talk here', 0, 60_000), role: 'examiner' as const }];
    const metrics = computeMetrics(segments);
    expect(metrics.wordCount).toBe(6);
    expect(metrics.spokenMs).toBe(60_000);
    expect(metrics.wpm).toBe(6);
  });

  it('counts filler words case-insensitively on word boundaries, including multi-word fillers', () => {
    const metrics = computeMetrics([seg('Um, this is basically, you know, a Uman result', 0, 1_000)]);
    // 'Um' + 'basically' + 'you know' = 3. 'Uman' must NOT match 'um'.
    expect(metrics.fillerCount).toBe(3);
    expect(metrics.fillerRate).toBeCloseTo(3 / metrics.wordCount, 5);
  });

  it('reports zero wpm when no spoken time elapsed', () => {
    expect(computeMetrics([seg('instant words here', 5_000, 5_000)]).wpm).toBe(0);
  });
});
