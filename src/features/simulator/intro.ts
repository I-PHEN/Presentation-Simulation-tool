import type { Persona } from './personas';

const DEFAULT_WELCOME = 'Welcome. Take a breath — turn on your microphone whenever you are ready to begin.';

export function leadPersona(panel: Persona[]): Persona {
  if (panel.length === 0) throw new Error('leadPersona requires a non-empty panel');
  return panel[0];
}

/** `source` lets the greeter welcome a spoken argument as one, rather than
 * calling a deckless topic a presentation with a title. */
export function buildIntroRequest(title: string, panel: Persona[], source: 'deck' | 'topic' = 'deck'): { title: string; source: 'deck' | 'topic'; judges: Array<{ id: string; title: string }> } {
  return { title, source, judges: panel.map((p) => ({ id: p.id, title: p.title })) };
}

export function parseIntroResponse(data: unknown, panel: Persona[]): { text: string; voiceId: string; personaId: string } {
  const lead = leadPersona(panel);
  const record = (data && typeof data === 'object') ? data as Record<string, unknown> : {};
  const text = typeof record.text === 'string' && record.text.trim().length > 0 ? record.text.trim() : DEFAULT_WELCOME;
  const isCoach = lead.id === 'sarah' || lead.id === 'marcus';
  const voiceId = isCoach ? lead.voiceId : (typeof record.voice === 'string' && record.voice.trim().length > 0 ? record.voice.trim() : lead.voiceId);
  return { text, voiceId, personaId: lead.id };
}

