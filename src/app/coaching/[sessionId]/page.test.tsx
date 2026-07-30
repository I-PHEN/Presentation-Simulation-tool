import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('/coaching/[sessionId] route', () => {
  it('renders dedicated 1-on-1 Coaching Studio in mode: guided', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/coaching/[sessionId]/page.tsx'), 'utf8');
    expect(source).toContain("mode: 'guided'");
    expect(source).toContain('SimulatorRoom');
  });
});
