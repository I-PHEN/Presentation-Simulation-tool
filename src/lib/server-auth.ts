import { NextRequest, NextResponse } from 'next/server';

const mockApiKey = 'mock-api-key-sparring';

function firebaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== mockApiKey);
}

/** Returns an identity only after Firebase has checked the presented ID token. */
export async function authenticateRequest(request: Request): Promise<{ userId: string } | NextResponse> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token) {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Authentication is unavailable' }, { status: 401 });
    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: token }),
      });
      const payload = await response.json() as { users?: Array<{ localId?: string }> };
      const userId = payload.users?.[0]?.localId;
      if (response.ok && userId) return { userId };
    } catch { /* an unavailable verifier must not authenticate a request */ }
    return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
  }
  const mockUserId = request.headers.get('x-mock-user-id');
  if (process.env.NODE_ENV !== 'production' && !firebaseConfigured() && mockUserId && /^[A-Za-z0-9_-]{1,128}$/.test(mockUserId)) return { userId: mockUserId };
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

export function isAuthenticationFailure(value: { userId: string } | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
