import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SimulatorRoom } from './SimulatorRoom';
import type { DeckContext, ExaminerEvent, TranscriptSegment } from '@/features/defense/types';

vi.mock('./use-camera', () => ({
  useCamera: () => ({ enabled: false, error: null, getVideo: () => null, toggle: vi.fn(), attach: vi.fn() }),
}));

vi.mock('./use-delivery-samples', () => ({
  useDeliverySamples: () => ({ getSamples: () => [] }),
}));

const mockDeck: DeckContext = {
  sourceName: 'Sample Pitch Deck',
  slides: [
    { index: 0, title: 'Introduction', text: 'Welcome to our pitch', bullets: [], durationSeconds: 60, targetWordCount: 100 },
  ],
};

const mockTranscript: TranscriptSegment[] = [];
const mockEvents: ExaminerEvent[] = [];

describe('SimulatorRoom', () => {
  it('renders 1-on-1 Coaching Studio mode with header badge and 1 coach avatar when mode is guided', () => {
    const session = {
      id: 'coaching-session-1',
      deck: mockDeck,
      mode: 'guided' as const,
      stance: 'supportive' as const,
      transcriptSegments: mockTranscript,
      examinerEvents: mockEvents,
      status: 'practicing',
      source: 'deck' as const,
    };

    const html = renderToString(<SimulatorRoom session={session} onComplete={vi.fn()} />);

    // Distinct header badge
    expect(html).toContain('🎓 1-on-1 Executive Coaching Studio');

    // ONLY ONE Coach Avatar in audience panel (Coach Sarah or Coach Marcus), NOT 4-person audience panel grid
    expect(html).toContain('Coach Marcus');
    expect(html).not.toContain('Professor');
    expect(html).not.toContain('Examiner');
    expect(html).not.toContain('Peer');
  });

  it('renders 4-examiner Defense Simulator with full audience panel grid when mode is mock/uninterrupted', () => {
    const session = {
      id: 'rehearse-session-1',
      deck: mockDeck,
      mode: 'mock' as const,
      stance: 'rigorous' as const,
      transcriptSegments: mockTranscript,
      examinerEvents: mockEvents,
      status: 'practicing',
      source: 'deck' as const,
    };

    const html = renderToString(<SimulatorRoom session={session} onComplete={vi.fn()} />);

    // Preserved Defense Simulator displays full 4-person panel grid (Professor, Examiner, Peer + Presenter)
    expect(html).toContain('Professor');
    expect(html).toContain('Examiner');
    expect(html).toContain('Peer');
    expect(html).not.toContain('🎓 1-on-1 Executive Coaching Studio');
  });
});
