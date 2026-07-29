import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CoachingSetup } from './coaching-setup';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('CoachingSetup', () => {
  it('renders intake steps, persona options, and depth controls', () => {
    const html = renderToString(<CoachingSetup />);
    expect(html).toContain('Delivery &amp; Voice Coaching');
    expect(html).toContain('Select presentation material');
    expect(html).toContain('Coach Marcus (Male)');
    expect(html).toContain('Coach Sarah (Female)');
    expect(html).toContain('Explanation depth focus');
  });
});
