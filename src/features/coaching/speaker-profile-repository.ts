import { db as defaultDb } from '@/lib/db';
import {
  applyOutcomeToProfile,
  emptyProfile,
  parseProfile,
  serializeProfile,
  type SessionOutcome,
  type SpeakerProfileData,
  type SpeakerProfileRow,
} from './speaker-profile';

type ProfileRowRecord = SpeakerProfileRow & { userId: string };

export type ProfileDb = {
  user: {
    upsert(args: { where: { id: string }; create: { id: string }; update: Record<string, never> }): Promise<{ id: string }>;
  };
  speakerProfile: {
    findUnique(args: { where: { userId: string } }): Promise<ProfileRowRecord | null>;
    upsert(args: {
      where: { userId: string };
      create: ProfileRowRecord;
      update: SpeakerProfileRow;
    }): Promise<ProfileRowRecord>;
  };
};

async function ensureUser(userId: string, database: ProfileDb): Promise<void> {
  await database.user.upsert({ where: { id: userId }, create: { id: userId }, update: {} });
}

export async function getOrCreateProfile(userId: string, database: ProfileDb = defaultDb as unknown as ProfileDb): Promise<SpeakerProfileData> {
  await ensureUser(userId, database);
  const row = await database.speakerProfile.findUnique({ where: { userId } });
  return row ? parseProfile(row) : emptyProfile;
}

export async function recordSessionOutcome(
  userId: string,
  outcome: SessionOutcome,
  database: ProfileDb = defaultDb as unknown as ProfileDb,
): Promise<SpeakerProfileData> {
  const current = await getOrCreateProfile(userId, database);
  const next = applyOutcomeToProfile(current, outcome);
  const serialized = serializeProfile(next);
  await database.speakerProfile.upsert({
    where: { userId },
    create: { userId, ...serialized },
    update: serialized,
  });
  return next;
}
