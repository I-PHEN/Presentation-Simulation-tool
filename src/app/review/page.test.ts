import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shouldResyncAfterAuth } from './page';

const readRoute = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('/review route', () => {
  it('renders the review workspace wired to real session history', () => {
    const source = readRoute('src/app/review/page.tsx');
    expect(source).toContain('ReviewWorkspace');
    expect(source).toContain('useDefenseSessions');
    expect(source).toContain('buildReviewRows');
    expect(source).toContain('active="progress"');
  });

  it('renders a visible retry action on a failed session request', () => {
    const source = readRoute('src/app/review/page.tsx');
    expect(source).toContain('role="alert"');
    expect(source).toContain('Retry');
    expect(source).toContain('retry()');
  });
});

describe('shouldResyncAfterAuth', () => {
  it('does not resync while auth is still resolving', () => {
    expect(shouldResyncAfterAuth(true, null, false)).toBe(false);
    expect(shouldResyncAfterAuth(true, { uid: '1' }, false)).toBe(false);
  });

  it('does not resync once auth resolves without a signed-in user', () => {
    expect(shouldResyncAfterAuth(false, null, false)).toBe(false);
  });

  it('fires exactly once when auth resolves after an initial unauthenticated fetch', () => {
    expect(shouldResyncAfterAuth(true, null, false)).toBe(false);
    expect(shouldResyncAfterAuth(false, { uid: '1' }, false)).toBe(true);
    expect(shouldResyncAfterAuth(false, { uid: '1' }, true)).toBe(false);
  });
});
