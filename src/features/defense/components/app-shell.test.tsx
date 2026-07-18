import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('names the product and the dashboard route in student-facing language', () => {
    const html = renderToStaticMarkup(<AppShell active="overview"><p>Today</p></AppShell>);

    expect(html).toContain('Sparring Partner');
    expect(html).toContain('>Today<');
    expect(html).toContain('href="/dashboard#trajectory"');
  });

  it('allows the navigation to flow below the account controls on small screens', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/features/defense/components/app-shell.tsx'), 'utf8');

    expect(source).toContain('flex-wrap');
    expect(source).toContain('order-3 flex w-full flex-none');
  });

  it('renders one labelled navigation landmark and the selected section', () => {
    const html = renderToStaticMarkup(
      <AppShell active="practice"><p>Room</p></AppShell>,
    );
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Practice');
  });
});
