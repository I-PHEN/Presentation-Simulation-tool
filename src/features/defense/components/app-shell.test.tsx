import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('renders one labelled navigation landmark and the selected section', () => {
    const html = renderToStaticMarkup(
      <AppShell active="practice"><p>Room</p></AppShell>,
    );
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Practice');
  });
});
