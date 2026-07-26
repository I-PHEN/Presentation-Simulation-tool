import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create, getZAI } = vi.hoisted(() => ({ create: vi.fn(), getZAI: vi.fn() }));
vi.mock('@/lib/zai', () => ({ getZAI }));
import { POST } from './route';

const judges = [{ id: 'professor', title: 'Professor' }];

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/intro', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));

const promptOf = () => create.mock.calls[0][0].messages[0].content as string;

describe('POST /api/intro', () => {
  beforeEach(() => {
    create.mockReset();
    getZAI.mockReset();
    create.mockResolvedValue({ choices: [{ message: { content: 'Welcome. Turn on your microphone when ready.' } }] });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
  });

  it('welcomes a deck rehearsal as a titled presentation', async () => {
    const response = await post({ title: 'Final-defense.pptx', judges, source: 'deck' });
    expect((await response.json()).judgeId).toBe('professor');
    expect(promptOf()).toContain('a presentation titled "Final-defense.pptx"');
  });

  it('welcomes a topic rehearsal as a spoken argument, never a presentation', async () => {
    // The topic session's "title" is the topic itself, so the deck framing read wrong.
    await post({ title: 'Mars colonization is feasible now', judges, source: 'topic' });
    const prompt = promptOf();
    expect(prompt).toContain('argue the topic "Mars colonization is feasible now"');
    expect(prompt).toContain('Do not mention slides or a presentation.');
    expect(prompt).not.toContain('a presentation titled');
  });

  it('treats an unspecified source as a deck, keeping the existing behaviour', async () => {
    await post({ title: 'Final-defense.pptx', judges });
    expect(promptOf()).toContain('a presentation titled');
  });

  it('still returns a usable welcome when the model call fails', async () => {
    create.mockRejectedValue(new Error('model unavailable'));
    const body = await (await post({ title: 'A topic', judges, source: 'topic' })).json();
    expect(body.text.toLowerCase()).toContain('microphone');
    expect(body.voice).toBeTruthy();
  });
});
