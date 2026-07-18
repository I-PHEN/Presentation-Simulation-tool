import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readRoute = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('primary defense route contracts', () => {
  it('keeps the dashboard defense-only and sends its CTA to deck intake', () => {
    const source = readRoute('src/app/dashboard/page.tsx');
    expect(source).toContain('OverviewWorkspace');
    expect(source).toContain('onStartHref="/decks/new"');
    expect(source).not.toMatch(/Overall Score|ScoringDashboard|AI Panel Members|Practice History/);
  });

  it('redirects the retired practice route directly to deck intake without generic wizard imports', () => {
    const source = readRoute('src/app/practice/page.tsx');
    expect(source).toContain("redirect('/decks/new')");
    expect(source).not.toMatch(/UploadSection|ConfigureSection|PresentSection|QnaSection/);
  });
});
