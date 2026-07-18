import { describe, expect, it } from 'vitest';
import { authenticateRequest, isAuthenticationFailure } from './server-auth';

describe('server authentication boundary', () => {
  it('denies unauthenticated requests instead of accepting a caller supplied id', async () => {
    const result = await authenticateRequest(new Request('http://localhost/api/session?userId=another-user'));
    expect(isAuthenticationFailure(result)).toBe(true);
    if (isAuthenticationFailure(result)) expect(result.status).toBe(401);
  });

  it('uses the explicit development mock header only when provided', async () => {
    const result = await authenticateRequest(new Request('http://localhost/api/session', { headers: { 'x-mock-user-id': 'local-user' } }));
    expect(isAuthenticationFailure(result)).toBe(false);
    if (!isAuthenticationFailure(result)) expect(result.userId).toBe('local-user');
  });
});
