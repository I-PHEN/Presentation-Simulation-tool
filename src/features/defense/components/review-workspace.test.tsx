import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReviewWorkspace } from './review-workspace';
import type { ReviewRow } from '../studio-session-model';

const reviewRows: ReviewRow[] = [
  { id: 'session-1', title: 'Final thesis defense', status: 'completed', sourceName: 'Final-defense.pptx', action: { label: 'Open review', href: '/reports/session-1' } },
  { id: 'session-2', title: 'Dissertation walkthrough', status: 'practicing', sourceName: 'Dissertation.pdf', action: { label: 'Resume rehearsal', href: '/practice/session-2?view=room' } },
  { id: 'session-3', title: 'Qualifying exam', status: 'upload', sourceName: 'Qual.pptx', action: { label: 'Continue setup', href: '/practice/session-3?view=setup' } },
  { id: 'session-4', title: 'Untitled programme', status: 'upload', action: { label: 'Import deck', href: '/decks/new' } },
];

describe('ReviewWorkspace', () => {
  it('maps completed and unfinished sessions to different Review actions', () => {
    const html = renderToStaticMarkup(<ReviewWorkspace rows={reviewRows} />);
    expect(html).toContain('Open review');
    expect(html).toContain('Resume');
  });

  it('renders a chronological semantic list of the model rows', () => {
    const html = renderToStaticMarkup(<ReviewWorkspace rows={reviewRows} />);
    expect(html).toMatch(/<ol[ >]/);
    expect(html).toContain('Final thesis defense');
    expect(html).toContain('Dissertation walkthrough');
    expect(html).toContain('Qualifying exam');
  });

  it('shows the true session status and optional deck source per row', () => {
    const html = renderToStaticMarkup(<ReviewWorkspace rows={reviewRows} />);
    expect(html).toContain('Reviewed');
    expect(html).toContain('In progress');
    expect(html).toContain('Final-defense.pptx');
    const separatorCount = (html.match(/ · /g) ?? []).length;
    expect(separatorCount).toBe(3);
  });

  it('gives each row exactly one action link resolving to an existing route', () => {
    const html = renderToStaticMarkup(<ReviewWorkspace rows={reviewRows} />);
    expect(html).toContain('href="/reports/session-1"');
    expect(html).toContain('href="/practice/session-2?view=room"');
    expect(html).toContain('href="/practice/session-3?view=setup"');
    expect(html).toContain('href="/decks/new"');
  });

  it('renders an empty state that links back to Practice when there is no history yet', () => {
    const html = renderToStaticMarkup(<ReviewWorkspace rows={[]} />);
    expect(html).toContain('href="/practice"');
    expect(html).not.toMatch(/<ol[ >]/);
  });
});
