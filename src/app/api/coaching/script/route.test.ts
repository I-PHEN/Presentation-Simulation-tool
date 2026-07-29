import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/zai', () => ({
  getZAI: () => ({
    chat: {
      completions: {
        create: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  openingHook: 'Let us dive straight into the numbers.',
                  talkingPoints: ['Point A', 'Point B', 'Point C'],
                  rescueScript: 'This is the complete 15-second model pitch script.',
                }),
              },
            },
          ],
        }),
      },
    },
  }),
}));

describe('POST /api/coaching/script', () => {
  it('returns a generated script payload for a slide', async () => {
    const req = new NextRequest('http://localhost:3000/api/coaching/script', {
      method: 'POST',
      body: JSON.stringify({
        slideText: 'Revenue grew 40% year over year.',
        slideIndex: 1,
        presenterDirectives: 'Emphasize growth',
        coachPersona: 'marcus',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.openingHook).toBe('Let us dive straight into the numbers.');
    expect(data.talkingPoints).toHaveLength(3);
    expect(data.rescueScript).toContain('model pitch script');
  });
});
