import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StageCaption } from './StageCaption';

const speaking = { text: 'Walk me through', fullText: 'Walk me through the method', speaker: 'Professor', speaking: true };

describe('StageCaption', () => {
  it('renders the revealed prefix with the speaker attributed', () => {
    const html = renderToStaticMarkup(<StageCaption {...speaking} />);
    expect(html).toContain('aria-label="Panel caption"');
    expect(html).toContain('Walk me through');
    expect(html).toContain('Professor');
  });

  it('sits below the slide as a band rather than overlaying it', () => {
    const html = renderToStaticMarkup(<StageCaption {...speaking} />);
    expect(html).not.toContain('absolute');
    expect(html).toContain('h-16 shrink-0'); // a fixed band, so the slide never resizes
  });

  it('announces the whole line to assistive tech, not the partial reveal', () => {
    const html = renderToStaticMarkup(<StageCaption {...speaking} text="Walk me" />);
    expect(html).toMatch(/aria-live="polite"[^>]*class="sr-only">Walk me through the method</);
  });

  it('shows the idle line when the panel has not spoken, so the band is never empty', () => {
    const html = renderToStaticMarkup(
      <StageCaption text={null} fullText={null} speaker={null} speaking={false} idleText="Our method compares A and B." />,
    );
    expect(html).toContain('Our method compares A and B.');
    expect(html).toContain('aria-live="polite"');
  });

  it('floats over the slide in maximized mode, where there is no room below it', () => {
    const html = renderToStaticMarkup(<StageCaption {...speaking} overlay />);
    expect(html).toContain('absolute');
    expect(html).toContain('Walk me through');
    expect(html).not.toContain('h-16 shrink-0'); // not a band any more
  });

  it('takes no space at all in maximized mode while the panel is quiet', () => {
    const html = renderToStaticMarkup(
      <StageCaption text={null} fullText={null} speaker={null} speaking={false} idleText="Our method compares A and B." overlay />,
    );
    expect(html).not.toContain('Our method compares A and B.'); // no permanent bar over the slide
    expect(html).toContain('aria-live="polite"'); // the live region survives
  });

  it('prefers the caption over the idle line once someone speaks', () => {
    const html = renderToStaticMarkup(<StageCaption {...speaking} idleText="Our method compares A and B." />);
    expect(html).toContain('Walk me through');
    expect(html).not.toContain('Our method compares A and B.');
  });
});
