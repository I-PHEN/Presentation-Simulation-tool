import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DefenseShell } from './defense-shell';

describe('DefenseShell', () => {
  it('renders the page context, main landmark, and labelled primary action', () => {
    const markup = renderToStaticMarkup(
      <DefenseShell eyebrow="Defense Studio" title="Your readiness desk" action={{ label: 'Begin focused practice', href: '/practice' }}>
        <p>Session content</p>
      </DefenseShell>,
    );

    expect(markup).toContain('Defense Studio');
    expect(markup).toContain('<main');
    expect(markup).toContain('Begin focused practice');
  });
});
