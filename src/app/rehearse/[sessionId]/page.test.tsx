import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('/rehearse/[sessionId] route', () => {
  it('opens Defense Simulator with SimulatorRoom', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/rehearse/[sessionId]/page.tsx'), 'utf8');
    expect(source).toContain('SimulatorRoom');
    expect(source).toContain('router.push(`/reports/${session.id}`)');
  });
});
