# Phase 1: Foundation & Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the longitudinal data foundation — a `User` and `SpeakerProfile` schema plus the pure, UI-agnostic domain logic that folds each session's outcome into a per-speaker profile — so later phases (coaching report, Home, Progress) have somewhere to read and write the "model of you."

**Architecture:** Two additive Prisma models (`User`, `SpeakerProfile`) keyed off the existing Firebase UID, with `Session.userId` promoted to a real relation while staying nullable. A pure domain module (`src/features/coaching/speaker-profile.ts`) owns the types, Zod schemas for the JSON-persisted fields, and the aggregation functions that update a profile from a session outcome — with zero database or web dependencies so a future mobile shell can reuse it. A thin repository (`speaker-profile-repository.ts`) wraps the Prisma client behind an injectable seam and delegates all real logic to the pure module.

**Tech Stack:** Next.js App Router, TypeScript, Prisma + SQLite, Zod, Vitest.

## Global Constraints

- **Additive migrations only.** Existing `Session` rows with `userId = null` must remain valid; do not make `userId` required.
- **`User.id` is the Firebase UID** (a plain string, not a generated cuid), matching `authenticateRequest`'s `{ userId }` return in `src/lib/server-auth.ts`.
- **The domain module is pure and UI-agnostic.** `src/features/coaching/speaker-profile.ts` imports only `zod` — no `@/lib/db`, no `next`, no React. This protects the future native-mobile reuse goal.
- **Injectable dependency seam for the repository**, matching the existing `loadDefenseSessions(fetcher = authenticatedFetch)` pattern — the repository accepts the db client as a defaulted parameter so tests inject a fake with no real database.
- **Honesty:** aggregation never invents a dimension the outcome did not supply; absent signals are simply not folded in.
- **Do not touch the unrelated dirty worktree files** (`fetch_intro.js`, `src/lib/store.ts`, `src/components/*-section.tsx`, `src/app/api/multi-chat|score|transcribe/*`, untracked `defense-shell.*`/`readiness-desk.*`). Never `git add -A`; stage only the exact paths in each task's commit step.
- **Preserve the existing suite:** all 170 current tests must stay green.
- **Environment:** Windows; run tests with `npm.cmd run test -- <files>` and Prisma with `npm.cmd run db:generate` / `npm.cmd run db:push`.

---

## File structure

| File | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | Add `User` and `SpeakerProfile` models; make `Session.userId` a nullable relation to `User`. |
| `src/features/coaching/prisma-schema.test.ts` | Source-substring lock on the new models/fields and the preserved-nullable relation. (Lives under `src/` because Vitest's `include` only picks up `src/**/*.test.ts`; it reads `prisma/schema.prisma` by absolute path.) |
| `src/features/coaching/speaker-profile.ts` | Pure domain: types, Zod schemas for persisted JSON, `emptyProfile`, `applyOutcomeToProfile`, `deriveNextFocus`, `serializeProfile`, `parseProfile`. |
| `src/features/coaching/speaker-profile.test.ts` | Deterministic tests for aggregation, next-focus derivation, and serialize/parse round-trip. |
| `src/features/coaching/speaker-profile-repository.ts` | Thin db access: `getOrCreateProfile`, `recordSessionOutcome` — injectable db client, delegates to the pure module. |
| `src/features/coaching/speaker-profile-repository.test.ts` | Tests the repository against an injected fake db (no real database). |

---

## Task 1: Add the User and SpeakerProfile schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/features/coaching/prisma-schema.test.ts`

**Interfaces:**
- Consumes: existing `Session` model (has nullable `userId String?`).
- Produces: Prisma delegates `db.user` and `db.speakerProfile`; `Session.user` relation. Later tasks rely on the field names `SpeakerProfile.userId`, `recurringWeaknesses`, `dimensionBaselines`, `totalSessions`, `streak`, `nextFocus`, `updatedAt`.

- [ ] **Step 1: Write the failing schema-lock test**

Create `src/features/coaching/prisma-schema.test.ts` (under `src/` so Vitest's `include: ['src/**/*.test.ts']` picks it up; it reads the schema by absolute path):

```ts
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm.cmd run test -- src/features/coaching/prisma-schema.test.ts`
Expected: FAIL — the `User`/`SpeakerProfile` models and the `Session.user` relation do not exist yet.

- [ ] **Step 3: Add the models and relation to the schema**

In `prisma/schema.prisma`, add the `user` relation line to the existing `Session` model (immediately after the `userId String?` line at line 12), keeping `userId` nullable:

```prisma
  userId       String?
  user         User?    @relation(fields: [userId], references: [id])
```

Then append the two new models at the end of the file:

```prisma
model User {
  id           String   @id
  email        String?
  displayName  String?
  createdAt    DateTime @default(now())

  profile      SpeakerProfile?
  sessions     Session[]
}

model SpeakerProfile {
  id                 String   @id @default(cuid())
  userId             String   @unique
  recurringWeaknesses String  @default("[]")
  dimensionBaselines String   @default("{}")
  totalSessions      Int      @default(0)
  streak             Int      @default(0)
  nextFocus          String   @default("")
  updatedAt          DateTime @updatedAt

  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 4: Regenerate the client and sync the dev database**

Run: `npm.cmd run db:generate`
Expected: exit 0; Prisma reports the client generated (this also validates the schema).

Run: `npm.cmd run db:push`
Expected: exit 0; SQLite schema synced with the two new tables and the relation.

- [ ] **Step 5: Run the schema-lock test and the full suite**

Run: `npm.cmd run test -- src/features/coaching/prisma-schema.test.ts`
Expected: PASS.

Run: `npm.cmd run test`
Expected: PASS — 173 tests (170 existing + 3 new).

- [ ] **Step 6: Commit**

```powershell
git add -- prisma/schema.prisma src/features/coaching/prisma-schema.test.ts
git commit -m "feat: add User and SpeakerProfile schema"
```

---

## Task 2: Speaker-profile domain types and Zod schemas

**Files:**
- Create: `src/features/coaching/speaker-profile.ts`
- Create: `src/features/coaching/speaker-profile.test.ts`

**Interfaces:**
- Consumes: nothing outside `zod`.
- Produces (types): `DimensionScores = Record<string, number>`; `SessionOutcome = { sessionId: string; dimensions: DimensionScores; weaknesses: string[]; completedAt: string }`; `RecurringWeakness = { label: string; count: number; firstSeen: string; lastSeen: string }`; `DimensionBaseline = { average: number; samples: number }`; `SpeakerProfileData = { recurringWeaknesses: RecurringWeakness[]; dimensionBaselines: Record<string, DimensionBaseline>; totalSessions: number; streak: number; nextFocus: string }`.
- Produces (values, this task): `emptyProfile: SpeakerProfileData`; `serializeProfile(profile): { recurringWeaknesses: string; dimensionBaselines: string; totalSessions: number; streak: number; nextFocus: string }`; `parseProfile(row): SpeakerProfileData`.
- Produces (values, Task 3 adds): `applyOutcomeToProfile`, `deriveNextFocus`.

- [ ] **Step 1: Write the failing round-trip test**

Create `src/features/coaching/speaker-profile.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { emptyProfile, parseProfile, serializeProfile, type SpeakerProfileData } from './speaker-profile';

describe('speaker-profile serialization', () => {
  it('emptyProfile has zeroed longitudinal state', () => {
    expect(emptyProfile).toEqual({
      recurringWeaknesses: [],
      dimensionBaselines: {},
      totalSessions: 0,
      streak: 0,
      nextFocus: '',
    });
  });

  it('round-trips a populated profile through serialize/parse', () => {
    const profile: SpeakerProfileData = {
      recurringWeaknesses: [{ label: 'rushed closings', count: 2, firstSeen: '2026-07-01T00:00:00.000Z', lastSeen: '2026-07-10T00:00:00.000Z' }],
      dimensionBaselines: { clarity: { average: 72, samples: 3 } },
      totalSessions: 3,
      streak: 0,
      nextFocus: 'rushed closings',
    };
    const row = serializeProfile(profile);
    expect(typeof row.recurringWeaknesses).toBe('string');
    expect(typeof row.dimensionBaselines).toBe('string');
    expect(parseProfile(row)).toEqual(profile);
  });

  it('parseProfile falls back to empty state on malformed JSON', () => {
    const parsed = parseProfile({ recurringWeaknesses: 'not json', dimensionBaselines: '{}', totalSessions: 5, streak: 0, nextFocus: '' });
    expect(parsed.recurringWeaknesses).toEqual([]);
    expect(parsed.totalSessions).toBe(5);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm.cmd run test -- src/features/coaching/speaker-profile.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Implement the types, schemas, and serialization**

Create `src/features/coaching/speaker-profile.ts`:

```ts
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
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm.cmd run test -- src/features/coaching/speaker-profile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/features/coaching/speaker-profile.ts src/features/coaching/speaker-profile.test.ts
git commit -m "feat: add speaker profile domain types and serialization"
```

---

## Task 3: Pure profile aggregation

**Files:**
- Modify: `src/features/coaching/speaker-profile.ts`
- Modify: `src/features/coaching/speaker-profile.test.ts`

**Interfaces:**
- Consumes: `SpeakerProfileData`, `SessionOutcome`, `RecurringWeakness`, `DimensionBaseline`, `emptyProfile` from Task 2.
- Produces: `deriveNextFocus(profile: SpeakerProfileData): string`; `applyOutcomeToProfile(profile: SpeakerProfileData, outcome: SessionOutcome): SpeakerProfileData` (returns a new object; does not mutate; sets `nextFocus` via `deriveNextFocus`; leaves `streak` untouched).

- [ ] **Step 1: Write the failing aggregation tests**

Append to `src/features/coaching/speaker-profile.test.ts`:

```ts
import { applyOutcomeToProfile, deriveNextFocus } from './speaker-profile';

const outcome = (over: Partial<import('./speaker-profile').SessionOutcome> = {}) => ({
  sessionId: 's1',
  dimensions: { clarity: 60, confidence: 80 },
  weaknesses: ['rushed closings'],
  completedAt: '2026-07-10T00:00:00.000Z',
  ...over,
});

describe('applyOutcomeToProfile', () => {
  it('does not mutate the input profile', () => {
    const before = { ...emptyProfile };
    applyOutcomeToProfile(emptyProfile, outcome());
    expect(emptyProfile).toEqual(before);
  });

  it('seeds baselines, weaknesses, and totalSessions from an empty profile', () => {
    const next = applyOutcomeToProfile(emptyProfile, outcome());
    expect(next.dimensionBaselines).toEqual({ clarity: { average: 60, samples: 1 }, confidence: { average: 80, samples: 1 } });
    expect(next.recurringWeaknesses).toEqual([{ label: 'rushed closings', count: 1, firstSeen: '2026-07-10T00:00:00.000Z', lastSeen: '2026-07-10T00:00:00.000Z' }]);
    expect(next.totalSessions).toBe(1);
    expect(next.streak).toBe(0);
  });

  it('rolls dimension averages and increments repeated weaknesses', () => {
    const first = applyOutcomeToProfile(emptyProfile, outcome());
    const second = applyOutcomeToProfile(first, outcome({ sessionId: 's2', dimensions: { clarity: 80 }, weaknesses: ['rushed closings'], completedAt: '2026-07-11T00:00:00.000Z' }));
    expect(second.dimensionBaselines.clarity).toEqual({ average: 70, samples: 2 });
    expect(second.dimensionBaselines.confidence).toEqual({ average: 80, samples: 1 });
    expect(second.recurringWeaknesses[0]).toEqual({ label: 'rushed closings', count: 2, firstSeen: '2026-07-10T00:00:00.000Z', lastSeen: '2026-07-11T00:00:00.000Z' });
    expect(second.totalSessions).toBe(2);
  });

  it('sorts recurring weaknesses by count descending', () => {
    let p = applyOutcomeToProfile(emptyProfile, outcome({ weaknesses: ['a', 'b'] }));
    p = applyOutcomeToProfile(p, outcome({ sessionId: 's2', weaknesses: ['b'] }));
    expect(p.recurringWeaknesses.map((w) => w.label)).toEqual(['b', 'a']);
  });
});

describe('deriveNextFocus', () => {
  it('returns empty string for an empty profile', () => {
    expect(deriveNextFocus(emptyProfile)).toBe('');
  });

  it('prefers the highest-count recurring weakness', () => {
    const p = applyOutcomeToProfile(applyOutcomeToProfile(emptyProfile, outcome({ weaknesses: ['x'] })), outcome({ sessionId: 's2', weaknesses: ['x'] }));
    expect(deriveNextFocus(p)).toBe('x');
  });

  it('falls back to the lowest-average dimension when there are no weaknesses', () => {
    const p = applyOutcomeToProfile(emptyProfile, outcome({ weaknesses: [], dimensions: { clarity: 40, confidence: 90 } }));
    expect(deriveNextFocus(p)).toBe('Work on your clarity.');
  });

  it('applyOutcomeToProfile writes the derived focus onto the profile', () => {
    const p = applyOutcomeToProfile(emptyProfile, outcome({ weaknesses: ['rushed closings'] }));
    expect(p.nextFocus).toBe('rushed closings');
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm.cmd run test -- src/features/coaching/speaker-profile.test.ts`
Expected: FAIL — `applyOutcomeToProfile` and `deriveNextFocus` are not exported.

- [ ] **Step 3: Implement the aggregation**

Append to `src/features/coaching/speaker-profile.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm.cmd run test -- src/features/coaching/speaker-profile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/features/coaching/speaker-profile.ts src/features/coaching/speaker-profile.test.ts
git commit -m "feat: add pure speaker profile aggregation"
```

---

## Task 4: Speaker-profile repository

**Files:**
- Create: `src/features/coaching/speaker-profile-repository.ts`
- Create: `src/features/coaching/speaker-profile-repository.test.ts`

**Interfaces:**
- Consumes: `SpeakerProfileData`, `SessionOutcome`, `emptyProfile`, `serializeProfile`, `parseProfile`, `applyOutcomeToProfile` from Tasks 2-3; the Prisma `db` client from `@/lib/db`.
- Produces: a `ProfileDb` seam type covering the `user` and `speakerProfile` methods the repository uses; `getOrCreateProfile(userId: string, database?: ProfileDb): Promise<SpeakerProfileData>`; `recordSessionOutcome(userId: string, outcome: SessionOutcome, database?: ProfileDb): Promise<SpeakerProfileData>`. Both default `database` to the real `db` client.

- [ ] **Step 1: Write the failing repository tests with an injected fake db**

Create `src/features/coaching/speaker-profile-repository.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm.cmd run test -- src/features/coaching/speaker-profile-repository.test.ts`
Expected: FAIL — the repository module does not exist.

- [ ] **Step 3: Implement the repository with an injectable db seam**

Create `src/features/coaching/speaker-profile-repository.ts`:

```ts
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
```

- [ ] **Step 4: Run the repository tests and the full suite**

Run: `npm.cmd run test -- src/features/coaching/speaker-profile-repository.test.ts`
Expected: PASS.

Run: `npm.cmd run test`
Expected: PASS — all existing plus the new coaching tests green.

Run: `npm.cmd run build`
Expected: exit 0 (the known Microsoft Office trace-copy warning is non-fatal if routes compile).

- [ ] **Step 5: Commit**

```powershell
git add -- src/features/coaching/speaker-profile-repository.ts src/features/coaching/speaker-profile-repository.test.ts
git commit -m "feat: add speaker profile repository"
```

---

## Plan self-review

- **Spec coverage:** This plan implements PRD §6 (the `User` + `SpeakerProfile` additive schema keyed off the Firebase UID, `Session.userId` promoted to a nullable relation) and PRD §9 item 1 (foundation & schema, model/types) plus the portable-core-logic constraint from PRD §10/§11 (the domain module imports only `zod`). The aggregation realizes the longitudinal pillar's data mechanics (PRD §3.2, §5.4) that later phases (report, Home, Progress) consume. Report generation, Home/Progress UI, and the simulator are explicitly out of this phase and are separate plans.
- **Placeholder scan:** No TBD/TODO; every code and test step contains complete content; all commands have expected output.
- **Type consistency:** `SpeakerProfileData`, `SessionOutcome`, `SpeakerProfileRow`, `DimensionBaseline`, `RecurringWeakness`, `emptyProfile`, `serializeProfile`, `parseProfile`, `applyOutcomeToProfile`, and `deriveNextFocus` are defined in Tasks 2-3 and consumed with identical signatures by the Task 4 repository. The `ProfileDb` seam's `user.upsert`/`speakerProfile.findUnique`/`speakerProfile.upsert` shapes match both the fake in the test and the real Prisma delegate surface. `SpeakerProfile` field names in the repository (`userId`, plus the serialized columns) match the Prisma model in Task 1.
