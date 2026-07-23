import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { session: { findMany } } }));
vi.mock('@/lib/server-auth', () => ({ authenticateRequest: vi.fn().mockResolvedValue({ userId: 'user-1' }), isAuthenticationFailure: () => false }));

import { GET } from './route';

describe('GET /api/sessions', () => {
  beforeEach(() => findMany.mockReset());

  it('returns only UI-safe defense sessions in newest-first order and omits malformed persisted JSON', async () => {
    findMany.mockResolvedValue([
      { id: 'new', title: 'Current deck', createdAt: new Date('2026-07-18T12:00:00Z'), status: 'completed', practiceMode: 'defense', mode: 'mock', stance: 'rigorous', deckContext: JSON.stringify({ sourceName: 'deck.pdf', slides: [{ index: 1, text: 'Claim', imageUrl: 'slide.png' }] }), findings: JSON.stringify([{ title: 'Evidence gap', risk: 'high', basis: 'response_explanation', presenterQuote: 'Claim', evidence: 'Support is missing.', slideIndex: 1, drill: 'Explain the evidence.' }]), summary: JSON.stringify({ coachingReport: { highestLeverage: { title: 'Evidence gap', risk: 'high', basis: 'response_explanation', presenterQuote: 'Claim', evidence: 'Support is missing.', slideIndex: 1, drill: 'Explain the evidence.' }, drills: ['Explain the evidence.'], metrics: { paceWpm: null, fillerPerMin: null, verbatimSlides: 0, slideTimes: [], questionsHandled: { handled: 0, total: 0 } }, timeline: [], personaVerdicts: [], strengths: [], minimal: false } }), transcriptSegments: '["private"]', examinerEvents: '["private"]', scores: { overall: 99 } },
      { id: 'old', title: 'Stale deck', createdAt: new Date('2026-07-17T12:00:00Z'), status: 'upload', practiceMode: 'defense', mode: 'diagnostic', stance: 'supportive', deckContext: '{bad', findings: 'not-json', summary: '{bad', transcriptSegments: '[]', examinerEvents: '[]', scores: { overall: 20 } },
    ]);

    const response = await GET(new Request('http://localhost/api/sessions?userId=user-1') as Parameters<typeof GET>[0]);
    const body = await response.json();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1', practiceMode: 'defense' }, orderBy: { createdAt: 'desc' } }));
    expect(body.sessions).toEqual([
      expect.objectContaining({ id: 'new', title: 'Current deck', mode: 'mock', stance: 'rigorous', deck: { sourceName: 'deck.pdf', slides: [{ index: 1, text: 'Claim', imageUrl: 'slide.png' }] }, finding: { title: 'Evidence gap', evidence: 'Support is missing.', drill: 'Explain the evidence.' }, report: { nextDrill: 'Explain the evidence.', highestLeverage: { title: 'Evidence gap', slideIndex: 1 } } }),
      expect.objectContaining({ id: 'old', title: 'Stale deck', mode: 'diagnostic', stance: 'supportive' }),
    ]);
    expect(JSON.stringify(body)).not.toContain('deckContext');
    expect(JSON.stringify(body)).not.toContain('transcriptSegments');
    expect(JSON.stringify(body)).not.toContain('examinerEvents');
    expect(JSON.stringify(body)).not.toContain('scores');
    expect(body.sessions[1]).not.toHaveProperty('deck');
    expect(body.sessions[1]).not.toHaveProperty('finding');
  });
});
