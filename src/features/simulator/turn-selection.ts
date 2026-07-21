import type { Persona } from './personas';

export function selectNextSpeaker(
  panel: Persona[],
  events: ReadonlyArray<{ persona?: { id: string } }>,
): Persona {
  if (panel.length === 0) throw new Error('selectNextSpeaker requires a non-empty panel');

  const counts = new Map<string, number>(panel.map((persona) => [persona.id, 0]));
  const lastIndex = new Map<string, number>(panel.map((persona) => [persona.id, -1]));
  events.forEach((event, index) => {
    const id = event.persona?.id;
    if (id === undefined || !counts.has(id)) return;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    lastIndex.set(id, index);
  });

  let best = panel[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const persona of panel) {
    const count = counts.get(persona.id) ?? 0;
    const recency = (lastIndex.get(persona.id) ?? -1) + 1; // never-spoken => 0, else 1-based event index
    // Fewer turns dominate; ties break to the least-recently-spoken.
    const score = count * 1_000_000 + recency;
    if (score < bestScore) {
      bestScore = score;
      best = persona;
    }
  }
  return best;
}
