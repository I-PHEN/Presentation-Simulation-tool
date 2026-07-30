import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CoachingRoom } from './coaching-room';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/lib/authenticated-fetch', () => ({
  authenticatedFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'test-session-1',
      topic: 'Executive Strategy',
      slides: [{ text: 'Slide 1' }],
    }),
  }),
}));

describe('CoachingRoom', () => {
  it('renders dedicated 1-on-1 Coaching Studio with header badge, WPM meter, and action buttons', () => {
    const html = renderToString(<CoachingRoom sessionId="test-session-1" />);

    // Header badge
    expect(html).toContain('🎓 1-on-1 Executive Coaching Studio');

    // Speech Pacing WPM Meter
    expect(html).toContain('Optimal Cadence (130-150 WPM)');

    // Action buttons
    expect(html).toContain('🎙️ Ask Coach for Live Advice');
    expect(html).toContain('✨ Coach Rescue: Model Pitch Script');
  });

  it('ensures absence of Defense Simulator widgets (Room Mood, Skepticism)', () => {
    const html = renderToString(<CoachingRoom sessionId="test-session-1" />);

    expect(html).not.toContain('Room Mood');
    expect(html).not.toContain('Skepticism');
  });
});
