import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OverviewWorkspace } from './overview-workspace';

describe('OverviewWorkspace', () => {
  it('shows one current-defense action instead of dashboard KPI cards', () => {
    const html = renderToStaticMarkup(<OverviewWorkspace onStartHref="/decks/new" />);
    expect(html).toContain('Continue preparation');
    expect(html).toContain('Import a defense deck');
    expect(html).not.toContain('Overall Score');
  });

  it('shows only the drill CTA when a latest finding is present', () => {
    const html = renderToStaticMarkup(<OverviewWorkspace onStartHref="/decks/new" latestFinding={{ title: 'Evidence gap', evidence: 'The claim is unsupported.', drill: 'Rehearse the causal chain.' }} />);
    expect(html).toContain('Start the drill');
    expect(html.match(/href="\/decks\/new"/g)).toHaveLength(2);
    expect(html).not.toContain('Import a defense deck');
  });
});
