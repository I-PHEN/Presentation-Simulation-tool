/** Curated first-run interest chips. Free-text additions are also allowed. */
export const INTEREST_OPTIONS: readonly string[] = [
  'Artificial intelligence',
  'Climate & sustainability',
  'Startups & entrepreneurship',
  'Public health',
  'Education',
  'Economics & finance',
  'Space & astronomy',
  'Psychology',
  'Design & product',
  'Ethics & philosophy',
  'History',
  'Sports',
];

const MAX_INTERESTS = 12;
const MAX_LABEL_LENGTH = 40;

/** Trim, drop empties, cap label length, dedupe case-insensitively, cap count. */
export function normalizeInterests(list: unknown): string[] {
  const source = Array.isArray(list) ? list : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of source) {
    if (typeof raw !== 'string') continue;
    const label = raw.trim().slice(0, MAX_LABEL_LENGTH);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= MAX_INTERESTS) break;
  }
  return out;
}

/** Add the label when absent (case-insensitive), remove it when already present. */
export function toggleInterest(current: string[], label: string): string[] {
  const key = label.trim().toLowerCase();
  if (!key) return normalizeInterests(current);
  const has = current.some((item) => item.toLowerCase() === key);
  return has
    ? normalizeInterests(current.filter((item) => item.toLowerCase() !== key))
    : normalizeInterests([...current, label]);
}

/** Append a free-text interest, ignoring blanks and case-insensitive duplicates. */
export function addCustomInterest(current: string[], raw: string): string[] {
  const label = raw.trim();
  if (!label) return normalizeInterests(current);
  if (current.some((item) => item.toLowerCase() === label.toLowerCase())) return normalizeInterests(current);
  return normalizeInterests([...current, label]);
}
