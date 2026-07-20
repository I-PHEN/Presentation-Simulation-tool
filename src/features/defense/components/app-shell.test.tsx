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

  it('passes the collapse state to the desktop theme toggle so it stays icon-only in the collapsed rail', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/features/defense/components/app-shell.tsx'), 'utf8');

    expect(source).toContain('<ThemeToggle collapsed={collapsed} />');
  });

  it('keeps a persistent New programme action outside primary navigation while still reachable from the rail', () => {
    const html = renderToStaticMarkup(
      <AppShell active="today"><p>Today</p></AppShell>,
    );

    const navStart = html.indexOf('<nav aria-label="Primary navigation"');
    const navEnd = html.indexOf('</nav>', navStart);
    const navSection = html.slice(navStart, navEnd);

    expect(navSection).toContain('>Today<');
    expect(navSection).toContain('>Practice<');
    expect(navSection).toContain('>Review<');
    expect(navSection).not.toContain('/decks/new');

    expect(html).toContain('href="/decks/new"');
    expect(html).toContain('New programme');
  });

  it('keeps every primary route free of the retired trajectory anchor, Progress label, and CoachHome component', () => {
    const routeFiles = [
      'src/app/page.tsx',
      'src/app/login/page.tsx',
      'src/app/signup/page.tsx',
      'src/app/dashboard/page.tsx',
      'src/app/practice/page.tsx',
      'src/app/practice/[sessionId]/page.tsx',
      'src/app/review/page.tsx',
      'src/app/reports/[sessionId]/page.tsx',
      'src/app/decks/new/page.tsx',
    ];

    for (const routeFile of routeFiles) {
      const source = readFileSync(resolve(process.cwd(), routeFile), 'utf8');
      expect(source).not.toContain('dashboard#trajectory');
      expect(source).not.toContain('Progress');
      expect(source).not.toContain('CoachHome');
    }
  });
});
