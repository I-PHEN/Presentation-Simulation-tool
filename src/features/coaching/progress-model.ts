import type { SpeakerProfileData } from './speaker-profile';

export type ProgressSessionInput = { id: string; title: string; createdAt: string; status: string; dimensions?: Record<string, number> };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

const DEADBAND = 5;
function deltaOf(values: number[]): 'up' | 'down' | 'steady' {
  if (values.length < 2) return 'steady';
  const diff = values[values.length - 1] - values[0];
  if (diff > DEADBAND) return 'up';
  if (diff < -DEADBAND) return 'down';
  return 'steady';
}

export function buildProgressModel(profile: SpeakerProfileData, sessions: ProgressSessionInput[]) {
  const withDims = sessions.filter((s) => s.dimensions && Object.keys(s.dimensions).length > 0);
  const oldestFirst = [...withDims].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const dimensionNames = [...new Set(oldestFirst.flatMap((s) => Object.keys(s.dimensions!)))];

  const series = dimensionNames.map((dimension) => {
    const points = oldestFirst
      .filter((s) => typeof s.dimensions![dimension] === 'number')
      .map((s) => ({ label: dateLabel(s.createdAt), value: s.dimensions![dimension] }));
    return { dimension, points, delta: deltaOf(points.map((p) => p.value)) };
  });

  const history = sessions
    .filter((s) => s.status === 'completed')
    .map((s) => ({ id: s.id, title: s.title, date: dateLabel(s.createdAt), href: `/reports/${s.id}` }));

  return {
    totalSessions: profile.totalSessions,
    nextFocus: profile.nextFocus,
    series,
    recurringWeaknesses: profile.recurringWeaknesses.map((w) => ({ label: w.label, count: w.count, lastSeen: w.lastSeen })),
    history,
  };
}
