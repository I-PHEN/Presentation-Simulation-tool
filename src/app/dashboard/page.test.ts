import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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

  it('redirects the retired practice route directly to deck intake without generic wizard imports', () => {
    const source = readRoute('src/app/practice/page.tsx');
    expect(source).toContain("redirect('/decks/new')");
    expect(source).not.toMatch(/UploadSection|ConfigureSection|PresentSection|QnaSection/);
  });
});
