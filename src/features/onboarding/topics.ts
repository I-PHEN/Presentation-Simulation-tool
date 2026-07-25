/** Sensible speakable topics when the model is unavailable or the user has no interests. */
export const DEFAULT_TOPICS: readonly string[] = [
  'Should artificial intelligence be regulated like a public utility?',
  'The one habit that most improves how people learn',
  'Why remote work is better for focus than the open office',
  'A technology that is overhyped, and what it actually delivers',
];

const MAX_TOPICS = 6;
const MAX_TOPIC_LENGTH = 120;

/** Ask for a handful of specific, defensible, *speakable* topics grounded in the interests. */
export function buildTopicsPrompt(interests: string[]): string {
  const cleaned = interests.map((interest) => interest.trim()).filter(Boolean);
  const interestLine = cleaned.length ? cleaned.join(', ') : 'general current affairs, science, and society';
  return `You suggest speaking-practice topics for a person rehearsing a spoken defense against a probing panel.

Their interests: ${interestLine}

Propose 4 topics they could speak to for two minutes and then defend under tough questions.
Each topic must be:
- specific and debatable (has a defensible position, not a broad theme),
- speakable from general knowledge without slides,
- one sentence, under 120 characters.

Return ONLY a JSON array of strings, e.g. ["Topic one", "Topic two"]. No prose, no keys, no markdown.`;
}

/** Robustly extract the topic strings from a model response (tolerates code fences and junk). */
export function parseTopicsResponse(raw: string): string[] {
  if (typeof raw !== 'string') return [];
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') continue;
    const topic = item.trim();
    if (!topic || topic.length > MAX_TOPIC_LENGTH) continue;
    const key = topic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(topic);
    if (out.length >= MAX_TOPICS) break;
  }
  return out;
}
