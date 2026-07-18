import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('/practice route', () => {
  it('redirects legacy practice entry to deck intake', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/practice/page.tsx'), 'utf8');
    expect(source).toContain("redirect('/decks/new')");
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
