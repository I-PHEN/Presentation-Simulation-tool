import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('report page coaching wiring', () => {
  it('reads audioPath and renders the coaching report view', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/reports/[sessionId]/page.tsx'), 'utf8');
    expect(source).toContain('CoachingReportView');
    expect(source).toContain('audioPath');
    expect(source).toContain('coachingReport');
  });
});
