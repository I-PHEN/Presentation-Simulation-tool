import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import CoachingRoomPage from './page';
import { CoachingRoom } from '@/features/coaching/components/coaching-room';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/authenticated-fetch', () => ({
  authenticatedFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'test-coaching-session-1',
      topic: 'Executive Strategy',
      slides: [{ index: 1, text: 'Executive Strategy Overview', imageUrl: 'topic' }],
    }),
  }),
}));

vi.mock('@/features/onboarding/use-onboarding', () => ({
  useOnboardingGuard: vi.fn(),
}));

describe('/coaching/[sessionId] component integration', () => {
  it('renders CoachingRoom with dedicated 1-on-1 Executive Coaching Studio UI elements and absence of Defense Simulator widgets', () => {
    const html = renderToString(<CoachingRoom sessionId="test-coaching-session-1" />);

    // 1. Header badge
    expect(html).toContain('🎓 1-on-1 Executive Coaching Studio');

    // 2. Coach Avatar (Coach Sarah or Coach Marcus)
    expect(html.includes('Coach Sarah') || html.includes('Coach Marcus')).toBe(true);

    // 3. 2-row teleprompter (Hook & Talking Points: Context, Solution, Impact)
    expect(html).toContain('Hook (0-15s):');
    expect(html).toContain('Context:');
    expect(html).toContain('Solution:');
    expect(html).toContain('Impact:');

    // 4. Live WPM cadence meter
    expect(html).toContain('Optimal Cadence (130-150 WPM)');

    // 5. Primary action button
    expect(html).toContain('🎙️ Ask Coach for Live Advice');

    // 6. Secondary action button
    expect(html).toContain('✨ Coach Rescue: Model Pitch Script');

    // 7. ABSENCE of Defense Simulator widgets
    expect(html).not.toContain('Room Mood');
    expect(html).not.toContain('Skepticism');
    expect(html).not.toContain('Professor');
    expect(html).not.toContain('Examiner');
    expect(html).not.toContain('Peer');
  });

  it('CoachingRoomPage mounts and renders CoachingRoom when passed sessionId param', () => {
    const html = renderToString(<CoachingRoomPage params={{ sessionId: 'test-coaching-session-1' }} />);

    // Header badge
    expect(html).toContain('🎓 1-on-1 Executive Coaching Studio');

    // Coach Avatar
    expect(html.includes('Coach Sarah') || html.includes('Coach Marcus')).toBe(true);

    // 2-row teleprompter
    expect(html).toContain('Hook (0-15s):');

    // WPM cadence meter
    expect(html).toContain('Optimal Cadence (130-150 WPM)');

    // Primary action button
    expect(html).toContain('🎙️ Ask Coach for Live Advice');

    // Secondary action button
    expect(html).toContain('✨ Coach Rescue: Model Pitch Script');

    // Absence of Defense Simulator widgets
    expect(html).not.toContain('Room Mood');
    expect(html).not.toContain('Skepticism');
    expect(html).not.toContain('Professor');
    expect(html).not.toContain('Examiner');
    expect(html).not.toContain('Peer');
  });
});
