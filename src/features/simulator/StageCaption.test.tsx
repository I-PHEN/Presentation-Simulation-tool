import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StageCaption } from './StageCaption';

describe('StageCaption', () => {
  it('renders the revealed prefix on the stage with the speaker attributed', () => {
    const html = renderToStaticMarkup(
      <StageCaption text="Walk me through" fullText="Walk me through the method" speaker="Professor" speaking />,
    );
    expect(html).toContain('aria-label="Panel caption"');
    expect(html).toContain('Walk me through');
    expect(html).toContain('Professor');
    expect(html).toContain('absolute inset-x-0 bottom-0'); // overlaid on the stage, not in a sidebar
  });

  it('announces the whole line to assistive tech, not the partial reveal', () => {
    const html = renderToStaticMarkup(
      <StageCaption text="Walk me" fullText="Walk me through the method" speaker="Professor" speaking />,
    );
    expect(html).toMatch(/aria-live="polite"[^>]*class="sr-only">Walk me through the method</);
  });

  it('keeps the live region but shows no bubble before anyone has spoken', () => {
    const html = renderToStaticMarkup(<StageCaption text={null} fullText={null} speaker={null} speaking={false} />);
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('bg-popover');
  });
});
