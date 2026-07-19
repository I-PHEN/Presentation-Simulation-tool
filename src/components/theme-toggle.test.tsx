import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  it('shows an icon with a visible text label by default', () => {
    const html = renderToStaticMarkup(<ThemeToggle />);

    expect(html).toContain('<span>Light</span>');
    expect(html).not.toContain('sr-only');
  });

  it('collapses to an icon-only control that keeps an accessible label', () => {
    const html = renderToStaticMarkup(<ThemeToggle collapsed />);

    expect(html).toContain('aria-label="Switch to dark mode"');
    expect(html).toContain('class="sr-only">Light</span>');
  });
});
