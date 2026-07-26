import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StatsSnapshot } from './stats-snapshot';
import { emptyProfile } from '@/features/coaching/speaker-profile';

describe('StatsSnapshot', () => {
  it('shows the rehearsal count and a link to the full trend', () => {
    const html = renderToStaticMarkup(
      <StatsSnapshot profile={{ recurringWeaknesses: [], dimensionBaselines: {}, totalSessions: 3, streak: 4, nextFocus: '' }} />,
    );
    expect(html).toContain('Your rehearsals');
    expect(html).toContain('3');
    expect(html).toContain('sessions logged');
    expect(html).toContain('4-day streak');
    expect(html).toContain('href="/review"');
  });

  it('handles the fresh, zero-session profile without a streak line', () => {
    const html = renderToStaticMarkup(<StatsSnapshot profile={emptyProfile} />);
    expect(html).toContain('0');
    expect(html).not.toContain('streak');
  });
});
