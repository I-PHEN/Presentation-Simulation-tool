import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst, create, getZAI } = vi.hoisted(() => ({ findFirst: vi.fn(), create: vi.fn(), getZAI: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { session: { findFirst } } }));
vi.mock('@/lib/server-auth', () => ({ authenticateRequest: vi.fn().mockResolvedValue({ userId: 'user-1' }), isAuthenticationFailure: () => false }));
vi.mock('@/lib/zai', () => ({ getZAI }));
import { POST } from './route';

const segment = { role: 'presenter', slideIndex: 1, text: 'Our claim is that retention increased.', startedAtMs: 1, endedAtMs: 2 };
const session = { id: 's1', practiceMode: 'defense', stance: 'rigorous', deckContext: JSON.stringify({ sourceName: 'deck', slides: [{ index: 1, text: 'Retention increased after the onboarding redesign.', imageUrl: 'x' }] }) };

describe('POST /api/defense/examiner', () => {
  beforeEach(() => { findFirst.mockReset(); create.mockReset(); getZAI.mockReset(); });
  it('rejects non-presenter or invalid current segments', async () => {
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: { ...segment, role: 'examiner' } }) }));
    expect(response.status).toBe(400); expect(findFirst).not.toHaveBeenCalled();
  });
  it('returns null for NO_INTERRUPT and supplies both slide claim and spoken evidence to the model', async () => {
    findFirst.mockResolvedValue(session);
    create.mockResolvedValue({ choices: [{ message: { content: 'NO_INTERRUPT' } }] });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: segment }) }));
    expect(await response.json()).toEqual({ event: null });
    expect(create.mock.calls[0][0].messages[0].content).toContain('Retention increased after the onboarding redesign.');
    expect(create.mock.calls[0][0].messages[0].content).toContain(segment.text);
  });

  it('discards contradictory model text and constructs a quoted question from both server sources', async () => {
    findFirst.mockResolvedValue(session);
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
    findFirst.mockResolvedValue(session);
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

  it('does not generate an examiner event for another user’s session', async () => {
    findFirst.mockResolvedValue(null);
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 'other-user-session', currentSegment: segment }) }));
    expect(response.status).toBe(404);
    expect(getZAI).not.toHaveBeenCalled();
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'other-user-session', userId: 'user-1' } });
  });

  it('tags the grounded event with the persona and uses the persona lead when a persona is supplied', async () => {
    findFirst.mockResolvedValue(session);
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ kind: 'question' }) } }] });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    const persona = { id: 'peer', title: 'Peer', promptFragment: 'You weigh clarity and plain explanation.' };
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: segment, persona }) }));
    const body = await response.json();
    expect(body.event.persona).toEqual({ id: 'peer', title: 'Peer' });
    // Persona fragment reaches the model decision prompt.
    expect(create.mock.calls[0][0].messages[0].content).toContain('clarity and plain explanation');
    // Still grounded in both server sources.
    expect(body.event.text).toContain('Retention increased after the onboarding redesign.');
    expect(body.event.text).toContain(segment.text);
    // Peer lead phrasing is used.
    expect(body.event.text).toContain('Say this in plain terms');
  });

  it('omits persona from the event and keeps legacy lead phrasing when no persona is supplied', async () => {
    findFirst.mockResolvedValue(session);
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ kind: 'interrupt' }) } }] });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    const response = await POST(new Request('http://localhost/api/defense/examiner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1', currentSegment: segment }) }));
    const body = await response.json();
    expect(body.event.persona).toBeUndefined();
    expect(body.event.text).toContain('Address this precisely'); // rigorous legacy lead
  });
});
