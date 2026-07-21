import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');

describe('prisma schema longitudinal models', () => {
  it('defines a User model keyed off the Firebase UID string id', () => {
    expect(schema).toMatch(/model User \{/);
    expect(schema).toMatch(/id\s+String\s+@id\b/);
    expect(schema).toContain('profile      SpeakerProfile?');
  });

  it('defines a SpeakerProfile with the longitudinal fields', () => {
    expect(schema).toMatch(/model SpeakerProfile \{/);
    for (const field of ['recurringWeaknesses', 'dimensionBaselines', 'totalSessions', 'streak', 'nextFocus']) {
      expect(schema).toContain(field);
    }
    expect(schema).toContain('userId             String   @unique');
  });

  it('keeps Session.userId nullable while adding the User relation', () => {
    expect(schema).toMatch(/userId\s+String\?/);
    expect(schema).toContain('user         User?    @relation(fields: [userId], references: [id])');
  });
});
