import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shouldResyncAfterAuth } from './page';

const readRoute = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('primary defense route contracts', () => {
  it('renders the action-first studio desk wired to real session data', () => {
    const source = readRoute('src/app/dashboard/page.tsx');
    expect(source).toContain('StudioDesk');
    expect(source).toContain('useDefenseSessions');
    expect(source).toContain('buildTodayModel');
    expect(source).toContain('active="today"');
    expect(source).not.toContain('CoachHome');
    expect(source).not.toContain('Progress');
    expect(source).not.toMatch(/OverviewWorkspace|Daily speaking challenge|Overall Score|ScoringDashboard|AI Panel Members|Practice History|KPI/);
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
    // Render 1: auth still loading, hook's mount-time fetch may already be in flight.
    expect(shouldResyncAfterAuth(true, null, false)).toBe(false);
    // Render 2: auth resolves with a signed-in user and we have not resynced yet - fire.
    expect(shouldResyncAfterAuth(false, { uid: '1' }, false)).toBe(true);
    // Render 3+: the effect marks resyncedAfterAuth true before calling retry(), so
    // subsequent renders with the same signed-in user must not fire again.
    expect(shouldResyncAfterAuth(false, { uid: '1' }, true)).toBe(false);
  });
});
