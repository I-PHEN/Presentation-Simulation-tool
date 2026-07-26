import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActivityBars } from './ActivityBars';

describe('ActivityBars', () => {
  it('animates four bars while a voice is active', () => {
    const html = renderToStaticMarkup(<ActivityBars active />);
    expect(html.match(/animate-\[sp-eq/g)).toHaveLength(4);
    // Staggered, so the bars do not move as one block.
    expect(html).toContain('animation-delay:120ms');
    expect(html).toContain('animation-delay:240ms');
  });

  it('sits flat and unanimated when nothing is being said', () => {
    const html = renderToStaticMarkup(<ActivityBars active={false} />);
    expect(html).not.toContain('animate-[sp-eq');
    expect(html).not.toContain('animation-delay');
  });

  it('is decorative only, never announced', () => {
    expect(renderToStaticMarkup(<ActivityBars active />)).toContain('aria-hidden="true"');
  });
});
