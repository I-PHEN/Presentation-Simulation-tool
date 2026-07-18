import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, create, getZAI } = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn(), getZAI: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { session: { findUnique } } }));
vi.mock('@/lib/zai', () => ({ getZAI }));
import { POST } from './route';

const segment = { role: 'presenter', slideIndex: 1, text: 'Our claim is that retention increased.', startedAtMs: 1, endedAtMs: 2 };
const session = { id: 's1', practiceMode: 'defense', stance: 'rigorous', deckContext: JSON.stringify({ sourceName: 'deck', slides: [{ index: 1, text: 'Retention increased after the onboarding redesign.', imageUrl: 'x' }] }) };

describe('POST /api/defense/examiner', () => {
  beforeEach(() => { findUnique.mockReset(); create.mockReset(); getZAI.mockReset(); });
  it('rejects non-presenter or invalid current segments', async () => {
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: { ...segment, role: 'examiner' } }) }));
    expect(response.status).toBe(400); expect(findUnique).not.toHaveBeenCalled();
  });
  it('returns null for NO_INTERRUPT and supplies both slide claim and spoken evidence to the model', async () => {
    findUnique.mockResolvedValue(session);
    create.mockResolvedValue({ choices: [{ message: { content: 'NO_INTERRUPT' } }] });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: segment }) }));
    expect(await response.json()).toEqual({ event: null });
    expect(create.mock.calls[0][0].messages[0].content).toContain('Retention increased after the onboarding redesign.');
    expect(create.mock.calls[0][0].messages[0].content).toContain(segment.text);
  });

  it('discards contradictory model text and constructs a quoted question from both server sources', async () => {
    findUnique.mockResolvedValue(session);
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ kind: 'interrupt', text: 'Why did retention decline?', evidence: 'decline' }) } }] });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: segment }) }));
    const body = await response.json();
    expect(body.event.text).toContain('Retention increased after the onboarding redesign.');
    expect(body.event.text).toContain(segment.text);
    expect(body.event.text).not.toContain('decline');
    expect(body.event.evidence).toContain('Retention increased after the onboarding redesign.');
  });

  it('does not surface a model question even when it includes shared source terms', async () => {
    findUnique.mockResolvedValue(session);
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ kind: 'question', text: 'What did the marketing survey find?', slideIndex: 1, evidence: 'Retention is mentioned on both the slide and in speech.', occurredAtMs: 2 }) } }] });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: segment }) }));
    const body = await response.json();
    expect(body.event.text).not.toContain('marketing survey');
    expect(body.event.text).toContain(segment.text);
  });

  it('rejects mismatched and oversized reading evidence before prompting', async () => {
    for (const readingEvidence of [
      { slideIndex: 2, hasSpeech: true, overlap: 0, copiedPhrases: [], explanationSignals: [] },
      { slideIndex: 1, hasSpeech: true, overlap: 0, copiedPhrases: ['x'.repeat(501)], explanationSignals: [] },
    ]) {
      const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: segment, readingEvidence }) }));
      expect(response.status).toBe(400);
    }
    expect(create).not.toHaveBeenCalled();
  });
});
