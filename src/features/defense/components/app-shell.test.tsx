import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('renders exactly the three studio destinations with their routes', () => {
    const html = renderToStaticMarkup(
      <AppShell active="home"><p>Home</p></AppShell>,
    );

    expect(html).toContain('>Home<');
    expect(html).toContain('>Rehearse<');
    expect(html).toContain('>Progress<');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/practice"');
    expect(html).toContain('href="/review"');
    expect(html).not.toContain('>Today<');
    expect(html).not.toContain('/dashboard#trajectory');
  });

  it('exposes an accessible control to collapse the sidebar rail', () => {
    const html = renderToStaticMarkup(
      <AppShell active="rehearse"><p>Room</p></AppShell>,
    );

    expect(html).toContain('aria-label="Collapse sidebar"');
  });

  it('renders a labelled navigation landmark and marks the active destination', () => {
    const html = renderToStaticMarkup(
      <AppShell active="progress"><p>Report</p></AppShell>,
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

  it('renders a global top bar carrying the theme toggle and account menu', () => {
    const html = renderToStaticMarkup(
      <AppShell active="home"><p>Home</p></AppShell>,
    );

    expect(html).toContain('aria-label="Account menu"');
    // The theme toggle renders its accessible switch label.
    expect(html).toMatch(/aria-label="Switch to (light|dark) mode"/);
  });

  it('keeps the theme toggle and account menu out of the sidebar rail', () => {
    const html = renderToStaticMarkup(
      <AppShell active="home"><p>Home</p></AppShell>,
    );
    const asideStart = html.indexOf('<aside');
    const asideEnd = html.indexOf('</aside>', asideStart);
    const aside = html.slice(asideStart, asideEnd);

    expect(aside).not.toContain('aria-label="Account menu"');
    expect(aside).not.toMatch(/aria-label="Switch to (light|dark) mode"/);
  });

  it('keeps a persistent New programme action outside primary navigation while still reachable from the rail', () => {
    const html = renderToStaticMarkup(
      <AppShell active="home"><p>Home</p></AppShell>,
    );

    const navStart = html.indexOf('<nav aria-label="Primary navigation"');
    const navEnd = html.indexOf('</nav>', navStart);
    const navSection = html.slice(navStart, navEnd);

    expect(navSection).toContain('>Home<');
    expect(navSection).toContain('>Rehearse<');
    expect(navSection).toContain('>Progress<');
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
