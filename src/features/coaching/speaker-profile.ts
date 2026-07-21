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

export function deriveNextFocus(profile: SpeakerProfileData): string {
  if (profile.recurringWeaknesses.length > 0) {
    // recurringWeaknesses is kept sorted by count desc, then lastSeen desc, then label.
    return profile.recurringWeaknesses[0].label;
  }
  const dimensions = Object.entries(profile.dimensionBaselines);
  if (dimensions.length === 0) return '';
  const lowest = dimensions.reduce((min, entry) => (entry[1].average < min[1].average ? entry : min));
  return `Work on your ${lowest[0]}.`;
}

export function applyOutcomeToProfile(profile: SpeakerProfileData, outcome: SessionOutcome): SpeakerProfileData {
  const dimensionBaselines: Record<string, DimensionBaseline> = { ...profile.dimensionBaselines };
  for (const [dimension, value] of Object.entries(outcome.dimensions)) {
    const prior = dimensionBaselines[dimension] ?? { average: 0, samples: 0 };
    const samples = prior.samples + 1;
    dimensionBaselines[dimension] = { average: (prior.average * prior.samples + value) / samples, samples };
  }

  const byLabel = new Map(profile.recurringWeaknesses.map((weakness) => [weakness.label, { ...weakness }]));
  for (const label of outcome.weaknesses) {
    const existing = byLabel.get(label);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = outcome.completedAt;
    } else {
      byLabel.set(label, { label, count: 1, firstSeen: outcome.completedAt, lastSeen: outcome.completedAt });
    }
  }
  const recurringWeaknesses = [...byLabel.values()].sort(
    (a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen) || a.label.localeCompare(b.label),
  );

  const next: SpeakerProfileData = {
    recurringWeaknesses,
    dimensionBaselines,
    totalSessions: profile.totalSessions + 1,
    streak: profile.streak,
    nextFocus: profile.nextFocus,
  };
  next.nextFocus = deriveNextFocus(next);
  return next;
}
