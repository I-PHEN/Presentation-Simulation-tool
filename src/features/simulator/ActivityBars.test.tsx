import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActivityBars } from './ActivityBars';

describe('ActivityBars', () => {
  it('animates three bars while a voice is active', () => {
    const html = renderToStaticMarkup(<ActivityBars active />);
    expect(html.match(/animate-\[sp-eq/g)).toHaveLength(3);
    // Staggered, so the bars do not move as one block.
    expect(html).toContain('animation-delay:140ms');
    expect(html).toContain('animation-delay:280ms');
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
