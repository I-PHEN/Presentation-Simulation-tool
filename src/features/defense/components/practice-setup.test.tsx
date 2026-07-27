import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PracticeSetup, savePracticeSetup } from './practice-setup';

const deck = {
  sourceName: 'Thesis.pdf',
  slides: [{ index: 1, text: 'Opening argument', imageUrl: '/slides/1.png' }],
};

describe('PracticeSetup', () => {
  it('defaults to Diagnostic practice and Rigorous with only the allowed setup choices', () => {
    const html = renderToStaticMarkup(
      <PracticeSetup sessionId="session-1" deck={deck} initialMode="diagnostic" initialStance="rigorous" onReady={() => undefined} />,
    );

    expect(html).toContain('Uninterrupted Talk');
    expect(html).toContain('Diagnostic Sparring');
    expect(html).toContain('Mock Defense');
    expect(html).toContain('Rigorous');
    expect(html).toContain('Supportive');
    expect(html).toContain('Hostile Heckler');
    expect(html.match(/type="radio"/g)).toHaveLength(6);
    expect(html.match(/name="practice-mode"/g)).toHaveLength(3);
    expect(html.match(/name="examiner-stance"/g)).toHaveLength(3);
    expect(html).toContain('checked=""');
    expect(html).not.toContain('AI Panel Members');
    expect(html).not.toContain('Audience type');
    expect(html).not.toContain('Custom AI instructions');
  });

  it('patches the selected setup for the existing session and only continues after success', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const onReady = vi.fn();

    await savePracticeSetup({
      sessionId: 'session-1',
      mode: 'mock',
      stance: 'supportive',
      fetcher,
      onReady,
    });

    expect(fetcher).toHaveBeenCalledWith('/api/session/session-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'mock', stance: 'supportive' }),
    });
    expect(fetcher).not.toHaveBeenCalledWith('/api/session', expect.objectContaining({ method: 'POST' }));
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('does not continue when the existing session update fails', async () => {
    const onReady = vi.fn();

    await expect(savePracticeSetup({
      sessionId: 'session-1',
      mode: 'diagnostic',
      stance: 'rigorous',
      fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid setup' }), { status: 400 })),
      onReady,
    })).rejects.toThrow('Invalid setup');

    expect(onReady).not.toHaveBeenCalled();
  });
});
