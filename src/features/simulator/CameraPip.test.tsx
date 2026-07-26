import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CameraPip } from './CameraPip';

describe('CameraPip', () => {
  it('renders a labelled, mirrored, muted self-view', () => {
    const html = renderToStaticMarkup(<CameraPip attach={() => undefined} />);
    expect(html).toContain('aria-label="Your camera"');
    expect(html).toContain('aria-label="Camera self-view"');
    expect(html).toContain('-scale-x-100'); // mirrored, so moving left looks like left
    expect(html).toContain('muted');
    expect(html).toContain('playsInline'); // no audio feedback loop, no iOS takeover
  });

  it('floats over the stage and is draggable', () => {
    const html = renderToStaticMarkup(<CameraPip attach={() => undefined} />);
    expect(html).toContain('absolute');
    expect(html).toContain('cursor-grab');
    expect(html).toContain('touch-none'); // so dragging does not scroll on touch
  });
});
