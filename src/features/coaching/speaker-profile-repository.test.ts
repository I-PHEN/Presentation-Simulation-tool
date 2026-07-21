import { describe, expect, it } from 'vitest';
import { getOrCreateProfile, recordSessionOutcome, type ProfileDb } from './speaker-profile-repository';
import { serializeProfile, emptyProfile } from './speaker-profile';

function fakeDb() {
  const users = new Map<string, { id: string }>();
  const profiles = new Map<string, ReturnType<typeof serializeProfile> & { userId: string }>();
  const db: ProfileDb = {
    user: {
      upsert: async ({ where, create }) => {
        const existing = users.get(where.id);
        if (existing) return existing;
        users.set(create.id, { id: create.id });
        return { id: create.id };
      },
    },
    speakerProfile: {
      findUnique: async ({ where }) => profiles.get(where.userId) ?? null,
      upsert: async ({ where, create, update }) => {
        const row = { userId: where.userId, ...(profiles.get(where.userId) ? update : create) };
        profiles.set(where.userId, row);
        return row;
      },
    },
  };
  return { db, users, profiles };
}

describe('getOrCreateProfile', () => {
  it('creates a user and an empty profile on first access', async () => {
    const { db, users } = fakeDb();
    const profile = await getOrCreateProfile('firebase-uid-1', db);
    expect(profile).toEqual(emptyProfile);
    expect(users.has('firebase-uid-1')).toBe(true);
  });

  it('returns the stored profile when one already exists', async () => {
    const { db, profiles } = fakeDb();
    profiles.set('u1', { userId: 'u1', ...serializeProfile({ ...emptyProfile, totalSessions: 4, nextFocus: 'pacing' }) });
    const profile = await getOrCreateProfile('u1', db);
    expect(profile.totalSessions).toBe(4);
    expect(profile.nextFocus).toBe('pacing');
  });
});

describe('recordSessionOutcome', () => {
  it('folds the outcome into the stored profile and persists it', async () => {
    const { db, profiles } = fakeDb();
    const updated = await recordSessionOutcome('u1', { sessionId: 's1', dimensions: { clarity: 50 }, weaknesses: ['pacing'], completedAt: '2026-07-10T00:00:00.000Z' }, db);
    expect(updated.totalSessions).toBe(1);
    expect(updated.nextFocus).toBe('pacing');
    expect(profiles.get('u1')?.totalSessions).toBe(1);
  });
});
