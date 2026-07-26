import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SlideStage } from './SlideStage';

const slide = { index: 3, text: 'Our method compares A and B.', imageUrl: '/s/3.png' };

describe('SlideStage', () => {
  it('renders the active slide inside the examination frame with a mono index badge and nav', () => {
    const html = renderToStaticMarkup(<SlideStage slide={slide} position={2} total={5} onPrev={() => undefined} onNext={() => undefined} />);
    expect(html).toContain('aria-label="Active presentation slide"');
    expect(html).toContain('rounded-xl border border-border'); // flat framed stage (no glow)
    expect(html).toContain('03 / 05'); // mono index badge
    expect(html).toContain('aria-label="Previous slide"');
    expect(html).toContain('aria-label="Next slide"');
  });

  it('disables previous on the first slide and next on the last', () => {
    const first = renderToStaticMarkup(<SlideStage slide={slide} position={0} total={5} onPrev={() => undefined} onNext={() => undefined} />);
    expect(first).toMatch(/aria-label="Previous slide"[^>]*disabled/);
    const last = renderToStaticMarkup(<SlideStage slide={slide} position={4} total={5} onPrev={() => undefined} onNext={() => undefined} />);
    expect(last).toMatch(/aria-label="Next slide"[^>]*disabled/);
  });
});
