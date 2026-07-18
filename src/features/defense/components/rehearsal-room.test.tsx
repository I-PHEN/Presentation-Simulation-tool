import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RehearsalRoom } from './rehearsal-room';

const session = {
  id: 'session-1',
  deck: { sourceName: 'Thesis.pdf', slides: [{ index: 1, text: 'Opening claim', imageUrl: '/slides/1.png' }] },
  mode: 'diagnostic' as const,
  stance: 'rigorous' as const,
  transcriptSegments: [],
  examinerEvents: [],
  status: 'upload',
};

describe('RehearsalRoom', () => {
  it('renders a slide-first room with examiner listening, caption/replay, navigation, and end controls', () => {
    const html = renderToStaticMarkup(<RehearsalRoom session={session} onComplete={() => undefined} />);

    expect(html).toContain('Slide 1 of 1');
    expect(html).toContain('Opening claim');
    expect(html).toContain('Examiner listening');
    expect(html).toContain('Replay last question');
    expect(html).toContain('Previous slide');
    expect(html).toContain('Next slide');
    expect(html).toContain('End presentation');
    expect(html).toContain('Loading private slide preview');
    expect(html).not.toContain('src="/slides/1.png"');
    expect(html).not.toContain('AI Panel Members');
    expect(html).not.toContain('Camera');
    expect(html).not.toContain('Screen share');
    expect(html).not.toMatch(/<textarea|type="text"/);
  });

  it('exposes microphone recovery and caption fallback states', () => {
    const html = renderToStaticMarkup(<RehearsalRoom session={session} onComplete={() => undefined} />);
    expect(html).toContain('Start presentation');
    expect(html).toContain('Retry microphone');
    expect(html).toContain('Retry audio');
  });
});
