import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ReadinessDesk } from './readiness-desk';

describe('ReadinessDesk', () => {
  it('centers one focused rehearsal action and a compact defense record', () => {
    const markup = renderToStaticMarkup(
      <ReadinessDesk
        userName="Michael"
        latestSession={{ title: 'Adaptive tutoring thesis', readiness: 72, audience: 'professor', date: 'Today' }}
      />,
    );

    expect(markup).toContain('Begin focused practice');
    expect(markup).toContain('Highest-risk defense question');
    expect(markup).toContain('Latest mock defense');
  });
});
