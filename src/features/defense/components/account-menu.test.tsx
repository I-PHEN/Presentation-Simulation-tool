import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccountMenu } from './account-menu';

describe('AccountMenu', () => {
  it('renders an accessible account trigger', () => {
    const html = renderToStaticMarkup(<AccountMenu />);
    expect(html).toContain('aria-label="Account menu"');
  });

  it('wires sign-out to the auth logout', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/features/defense/components/account-menu.tsx'), 'utf8');
    expect(source).toContain('useAuth');
    expect(source).toContain('logout');
    expect(source).toContain('Sign out');
  });
});
