import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shouldResyncAfterAuth } from './page';

const readRoute = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('/practice route', () => {
  it('renders the practice hub wired to real session data', () => {
    const source = readRoute('src/app/practice/page.tsx');
    expect(source).toContain('PracticeHub');
    expect(source).toContain('useDefenseSessions');
    expect(source).toContain('buildPracticeModel');
    expect(source).toContain('active="practice"');
    expect(source).not.toContain("redirect('/decks/new')");
  });

  it('renders a visible retry action on a failed session request', () => {
    const source = readRoute('src/app/practice/page.tsx');
    expect(source).toContain('role="alert"');
    expect(source).toContain('Retry');
    expect(source).toContain('retry()');
  });

  it('keeps the setup and room views as separate dynamic route branches', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/practice/[sessionId]/page.tsx'), 'utf8');
    expect(source).toContain("view === 'room'");
    expect(source).toContain('<PracticeSetup');
    expect(source).not.toContain('ConfigureSection');
    expect(source).not.toContain('PresentSection');
    expect(source).not.toContain('QNASection');
  });

  it('routes completed rehearsal rooms to the session report, not practice setup', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/practice/[sessionId]/page.tsx'), 'utf8');
    expect(source).toContain('onComplete={() => router.push(`/reports/${session.id}`)}');
    expect(source).not.toContain('onComplete={() => router.push(`/practice/${session.id}`)}');
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
