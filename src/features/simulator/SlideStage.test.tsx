import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SlideStage } from './SlideStage';

const slide = { index: 3, text: 'Our method compares A and B.', imageUrl: '/s/3.png' };

describe('SlideStage', () => {
  it('renders the active slide inside the examination frame with a mono index badge', () => {
    const html = renderToStaticMarkup(<SlideStage slide={slide} position={2} total={5} />);
    expect(html).toContain('aria-label="Active presentation slide"');
    expect(html).toContain('border border-border'); // flat framed stage (no glow)
    expect(html).toContain('03 / 05'); // mono index badge
  });

  it('sizes the frame to the image rather than the column, so no dead gutters remain', () => {
    const html = renderToStaticMarkup(<SlideStage slide={slide} position={0} total={5} />);
    // The frame takes the image's own aspect ratio instead of spanning the column.
    // (The image itself only appears client-side; SSR renders its loading state.)
    expect(html).toContain('h-full w-fit');
    expect(html).not.toContain('aspect-video');
  });

  it('carries no navigation or caption of its own - both live outside the slide now', () => {
    const html = renderToStaticMarkup(<SlideStage slide={slide} position={2} total={5} />);
    expect(html).not.toContain('Previous slide');
    expect(html).not.toContain('Next slide');
    expect(html).not.toContain('aria-label="Panel caption"');
    // Nothing is absolutely positioned over the image except the index badge.
    expect(html.match(/absolute/g)).toHaveLength(1);
  });
});
