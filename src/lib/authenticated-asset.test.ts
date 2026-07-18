import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadAuthenticatedAsset, releaseAuthenticatedAsset } from './authenticated-asset';

describe('authenticated asset loader', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads a private asset through the authenticated request transport and returns an object URL', async () => {
    const request = vi.fn().mockResolvedValue(new Response(new Blob(['slide'])));
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:private-slide'), revokeObjectURL: vi.fn() });
    await expect(loadAuthenticatedAsset('/api/slides/private/slide-1.jpg', request)).resolves.toBe('blob:private-slide');
    expect(request).toHaveBeenCalledWith('/api/slides/private/slide-1.jpg');
  });

  it('rejects unreadable assets without turning their URL into visible content and releases object URLs', async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:private-slide'), revokeObjectURL });
    await expect(loadAuthenticatedAsset('/api/slides/private/slide-1.jpg', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))).rejects.toThrow('Unable to load slide preview');
    releaseAuthenticatedAsset('blob:private-slide');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-slide');
  });
});
