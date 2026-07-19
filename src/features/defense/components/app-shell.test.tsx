import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('renders exactly the three studio destinations with their routes', () => {
    const html = renderToStaticMarkup(
      <AppShell active="today"><p>Today</p></AppShell>,
    );

    expect(html).toContain('>Today<');
    expect(html).toContain('>Practice<');
    expect(html).toContain('>Review<');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/practice"');
    expect(html).toContain('href="/review"');
    expect(html).not.toContain('Progress');
    expect(html).not.toContain('/dashboard#trajectory');
  });

  it('exposes an accessible control to collapse the sidebar rail', () => {
    const html = renderToStaticMarkup(
      <AppShell active="practice"><p>Room</p></AppShell>,
    );

    expect(html).toContain('aria-label="Collapse sidebar"');
  });

  it('renders a labelled navigation landmark and marks the active destination', () => {
    const html = renderToStaticMarkup(
      <AppShell active="review"><p>Report</p></AppShell>,
    );

    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('aria-current="page"');
  });

  it('structures the shell as a semantic desktop rail with a mobile header', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/features/defense/components/app-shell.tsx'), 'utf8');

    expect(source).toContain('<aside');
    expect(source).toContain('<header');
    expect(source).toContain('readShellCollapsed');
    expect(source).toContain('writeShellCollapsed');
  });
});
