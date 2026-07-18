import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst, update, create, getZAI } = vi.hoisted(() => ({ findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), getZAI: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { session: { findFirst, update } } }));
vi.mock('@/lib/server-auth', () => ({ authenticateRequest: vi.fn().mockResolvedValue({ userId: 'user-1' }), isAuthenticationFailure: () => false }));
vi.mock('@/lib/zai', () => ({ getZAI }));
import { POST } from './route';

const session = { id: 's1', practiceMode: 'defense', deckContext: JSON.stringify({ sourceName: 'deck', slides: [{ index: 1, text: 'Retention increased after onboarding.', imageUrl: 'x' }] }), transcriptSegments: JSON.stringify([{ role: 'presenter', slideIndex: 1, text: 'Retention increased after onboarding.', startedAtMs: 0, endedAtMs: 1 }]), examinerEvents: '[]' };
const request = () => new Request('http://localhost/api/defense/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1' }) });

describe('POST /api/defense/report', () => {
  beforeEach(() => { findFirst.mockReset(); update.mockReset(); create.mockReset(); getZAI.mockReset(); });
  it('returns 422 when no presenter transcript is available', async () => {
    findFirst.mockResolvedValue({ ...session, transcriptSegments: '[]' });
    const response = await POST(request());
    expect(response.status).toBe(422); expect(create).not.toHaveBeenCalled();
  });
  it('rejects invalid model output without persisting it', async () => {
    findFirst.mockResolvedValue(session); getZAI.mockResolvedValue({ chat: { completions: { create } } }); create.mockResolvedValue({ choices: [{ message: { content: '{"findings":[{"title":"x"}]}' } }] });
    const response = await POST(request());
    expect(response.status).toBe(502); expect(update).not.toHaveBeenCalled();
  });
  it('rejects a fabricated presenter quote without persisting it', async () => {
    findFirst.mockResolvedValue(session); getZAI.mockResolvedValue({ chat: { completions: { create } } }); create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ findings: [{ title: 'Unsupported', risk: 'high', basis: 'response_explanation', presenterQuote: 'Invented words', evidence: 'Gap', slideIndex: 1, drill: 'Retry.' }] }) } }] });
    const response = await POST(request());
    expect(response.status).toBe(502); expect(update).not.toHaveBeenCalled();
  });
  it('rejects a slide-reliance finding without deterministic copied-phrase support', async () => {
    const paraphraseSession = { ...session, transcriptSegments: JSON.stringify([{ role: 'presenter', slideIndex: 1, text: 'People stayed longer after we simplified the first experience.', startedAtMs: 0, endedAtMs: 1 }]) };
    findFirst.mockResolvedValue(paraphraseSession); getZAI.mockResolvedValue({ chat: { completions: { create } } }); create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ findings: [{ title: 'Unsupported reading', risk: 'high', basis: 'slide_reliance', presenterQuote: 'People stayed longer after we simplified the first experience.', evidence: 'Gap', slideIndex: 1, drill: 'Retry.' }] }) } }] });
    const response = await POST(request());
    expect(response.status).toBe(502); expect(update).not.toHaveBeenCalled();
  });
  it('persists validated findings and a compact report', async () => {
    findFirst.mockResolvedValue(session); getZAI.mockResolvedValue({ chat: { completions: { create } } }); create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ findings: [{ title: 'Explain the result', risk: 'high', basis: 'response_explanation', presenterQuote: 'Retention increased after onboarding.', evidence: 'You said "Retention increased after onboarding."', slideIndex: 1, drill: 'Explain the result without reading.' }] }) } }] });
    const response = await POST(request()); const body = await response.json();
    expect(response.status).toBe(200); expect(body.report.nextDrill).toMatch(/without reading/i); expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ findings: expect.any(String), summary: expect.any(String) }) }));
  });
});
