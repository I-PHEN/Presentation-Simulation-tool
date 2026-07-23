import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NextFocusCard } from './next-focus-card';
import { emptyProfile } from '@/features/coaching/speaker-profile';

describe('NextFocusCard', () => {
  it('shows the next focus and a grounded subline when a profile exists', () => {
    const html = renderToStaticMarkup(<NextFocusCard profile={{ recurringWeaknesses: [{ label: 'Rushing closings', count: 3, firstSeen: 'x', lastSeen: 'y' }], dimensionBaselines: {}, totalSessions: 3, streak: 0, nextFocus: 'Rushing closings' }} />);
    expect(html).toContain('Work on this next');
    expect(html).toContain('Rushing closings');
    expect(html).toContain('3');
  });

  it('shows a first-run invitation when there is no profile yet', () => {
    const html = renderToStaticMarkup(<NextFocusCard profile={emptyProfile} />);
    expect(html).toContain('Run your first rehearsal');
  });
});
