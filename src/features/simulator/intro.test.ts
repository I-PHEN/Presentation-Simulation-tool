import { describe, expect, it } from 'vitest';
import { buildIntroRequest, leadPersona, parseIntroResponse } from './intro';
import { assemblePanel } from './personas';

const panel = assemblePanel();

describe('intro helpers', () => {
  it('names the lead persona as the first panel member', () => {
    expect(leadPersona(panel).id).toBe('professor');
  });

  it('builds an intro request with the title and the panel as judges', () => {
    const req = buildIntroRequest('My Defense', panel);
    expect(req.title).toBe('My Defense');
    expect(req.judges).toEqual(panel.map((p) => ({ id: p.id, title: p.title })));
  });

  it('parses a valid intro response into text + lead voice', () => {
    const parsed = parseIntroResponse({ text: 'Welcome to your defense.', voice: 'v1', judgeId: 'professor' }, panel);
    expect(parsed.text).toBe('Welcome to your defense.');
    expect(parsed.voiceId).toBe('v1');
    expect(parsed.personaId).toBe('professor');
  });

  it('falls back to a default welcome and the lead persona voice on a malformed response', () => {
    const parsed = parseIntroResponse(null, panel);
    expect(parsed.text.length).toBeGreaterThan(0);
    expect(parsed.text.toLowerCase()).toContain('microphone');
    expect(parsed.voiceId).toBe(leadPersona(panel).voiceId);
    expect(parsed.personaId).toBe('professor');
  });
});
