import { describe, expect, it, vi } from 'vitest';

const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('@cartesia/cartesia-js', () => ({ default: class { tts = { generate }; } }));
vi.mock('@/lib/server-auth', () => ({ authenticateRequest: vi.fn().mockResolvedValue({ userId: 'user-1' }), isAuthenticationFailure: () => false }));
import { POST } from './route';

describe('POST /api/tts', () => {
  it('rejects malformed, empty, oversized text, and invalid voices before Cartesia', async () => {
    for (const body of ['{bad', JSON.stringify({ text: ' ', voiceId: 'voice' }), JSON.stringify({ text: 'x'.repeat(5001), voiceId: 'voice' }), JSON.stringify({ text: 'hello', voiceId: 'bad voice' })]) {
      const response = await POST(new Request('http://localhost/api/tts', { method: 'POST', body }) as never);
      expect(response.status).toBe(400);
    }
    expect(generate).not.toHaveBeenCalled();
  });
});
