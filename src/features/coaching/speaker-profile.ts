import { z } from 'zod';

export type DimensionScores = Record<string, number>;

export type SessionOutcome = {
  sessionId: string;
  dimensions: DimensionScores;
  weaknesses: string[];
  completedAt: string;
};

export type RecurringWeakness = { label: string; count: number; firstSeen: string; lastSeen: string };
export type DimensionBaseline = { average: number; samples: number };

export type SpeakerProfileData = {
  recurringWeaknesses: RecurringWeakness[];
  dimensionBaselines: Record<string, DimensionBaseline>;
  totalSessions: number;
  streak: number;
  nextFocus: string;
};

const recurringWeaknessSchema = z.object({
  label: z.string(),
  count: z.number().int().nonnegative(),
  firstSeen: z.string(),
  lastSeen: z.string(),
}).strict();

const recurringWeaknessesSchema = z.array(recurringWeaknessSchema);
const dimensionBaselinesSchema = z.record(z.string(), z.object({ average: z.number(), samples: z.number().int().nonnegative() }).strict());

export const emptyProfile: SpeakerProfileData = {
  recurringWeaknesses: [],
  dimensionBaselines: {},
  totalSessions: 0,
  streak: 0,
  nextFocus: '',
};

export type SpeakerProfileRow = {
  recurringWeaknesses: string;
  dimensionBaselines: string;
  totalSessions: number;
  streak: number;
  nextFocus: string;
};

export function serializeProfile(profile: SpeakerProfileData): SpeakerProfileRow {
  return {
    recurringWeaknesses: JSON.stringify(profile.recurringWeaknesses),
    dimensionBaselines: JSON.stringify(profile.dimensionBaselines),
    totalSessions: profile.totalSessions,
    streak: profile.streak,
    nextFocus: profile.nextFocus,
  };
}

function parseJson<T>(value: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const result = schema.safeParse(JSON.parse(value));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function parseProfile(row: SpeakerProfileRow): SpeakerProfileData {
  return {
    recurringWeaknesses: parseJson(row.recurringWeaknesses, recurringWeaknessesSchema, []),
    dimensionBaselines: parseJson(row.dimensionBaselines, dimensionBaselinesSchema, {}),
    totalSessions: row.totalSessions,
    streak: row.streak,
    nextFocus: row.nextFocus,
  };
}
