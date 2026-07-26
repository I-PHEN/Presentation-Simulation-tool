import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecentSessionsCard } from './recent-sessions-card';
import type { PracticeRow } from '../studio-session-model';

const rows: PracticeRow[] = [
  { id: 's2', title: 'Dissertation walkthrough', status: 'upload', action: { label: 'Continue setup', href: '/practice/s2?view=setup' } },
  { id: 's3', title: 'Qualifying exam', status: 'completed', action: { label: 'Open review', href: '/reports/s3' } },
];

describe('RecentSessionsCard', () => {
  it('lists each session with its own action link', () => {
    const html = renderToStaticMarkup(<RecentSessionsCard recent={rows} />);
    expect(html).toContain('Recent sessions');
    expect(html).toContain('Dissertation walkthrough');
    expect(html).toContain('href="/practice/s2?view=setup"');
    expect(html).toContain('Open review');
  });

  it('renders nothing when there are no earlier sessions', () => {
    expect(renderToStaticMarkup(<RecentSessionsCard recent={[]} />)).toBe('');
  });
});
