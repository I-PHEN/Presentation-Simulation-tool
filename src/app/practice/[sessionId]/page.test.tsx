import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('practice session route', () => {
  it('keeps rehearsal room completion routed to the existing individual report', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/practice/[sessionId]/page.tsx'), 'utf8');
    expect(source).toContain('router.push(`/reports/${session.id}`)');
  });
});
