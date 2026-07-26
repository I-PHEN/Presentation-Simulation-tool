import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RemoveSessionButton } from './remove-session-button';

describe('RemoveSessionButton', () => {
  it('names the session it removes, so the control is unambiguous to screen readers', () => {
    const html = renderToStaticMarkup(<RemoveSessionButton title="Final thesis defense" onConfirm={() => undefined} />);
    expect(html).toContain('aria-label="Remove Final thesis defense"');
  });

  it('stays icon-only by default and spells out the action when asked', () => {
    const icon = renderToStaticMarkup(<RemoveSessionButton title="A session" onConfirm={() => undefined} />);
    expect(icon).not.toContain('>Remove<');
    const labelled = renderToStaticMarkup(<RemoveSessionButton title="A session" onConfirm={() => undefined} showLabel />);
    expect(labelled).toContain('Remove');
  });
});
