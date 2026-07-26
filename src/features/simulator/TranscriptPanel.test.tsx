import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TranscriptPanel } from './TranscriptPanel';
import type { TranscriptSegment } from '@/features/defense/types';

const segments: TranscriptSegment[] = [
  { role: 'presenter', slideIndex: 1, text: 'We measured retention.', startedAtMs: 0, endedAtMs: 2000 },
  { role: 'examiner', slideIndex: 1, text: 'How was it measured?', startedAtMs: 2000, endedAtMs: 4000 },
];
const metrics = { wordCount: 3, spokenMs: 2000, wpm: 90, fillerCount: 1, fillerRate: 0.33 };

describe('TranscriptPanel', () => {
  it('shows running metrics chips and both roles of committed lines', () => {
    const html = renderToStaticMarkup(<TranscriptPanel segments={segments} interim="" metrics={metrics} />);
    expect(html).toContain('90'); // wpm value
    expect(html).toContain('WPM');
    expect(html).toContain('Fillers');
    expect(html).toContain('We measured retention.');
    expect(html).toContain('How was it measured?');
    expect(html).toContain('aria-label="Live transcript"');
  });

  it('shows the live interim line while speaking', () => {
    const html = renderToStaticMarkup(<TranscriptPanel segments={[]} interim="and the results show" metrics={metrics} />);
    expect(html).toContain('and the results show');
  });

  it('says what the empty panel is for, rather than reading as a void', () => {
    const empty = renderToStaticMarkup(<TranscriptPanel segments={[]} interim="" metrics={metrics} />);
    expect(empty).toContain('Your words appear here as you speak.');
    // Gone as soon as there is anything real to show.
    expect(renderToStaticMarkup(<TranscriptPanel segments={segments} interim="" metrics={metrics} />)).not.toContain('Your words appear here');
    expect(renderToStaticMarkup(<TranscriptPanel segments={[]} interim="uh" metrics={metrics} />)).not.toContain('Your words appear here');
  });
});
