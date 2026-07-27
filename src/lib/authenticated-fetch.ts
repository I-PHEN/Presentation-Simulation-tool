'use client';

import { auth, isFirebaseConfigured } from '@/lib/firebase';

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const currentUser = auth.currentUser;
  if (currentUser && typeof currentUser.getIdToken === 'function') {
    try {
      const token = await currentUser.getIdToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    } catch { /* fallback to mock header */ }
  }

  if (!headers.has('Authorization') && typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('mock_user');
    let uid = 'guest_user_id';
    try {
      const mock = raw ? (JSON.parse(raw) as { uid?: unknown }) : null;
      if (typeof mock?.uid === 'string') uid = mock.uid;
    } catch { /* fallback */ }
    headers.set('x-mock-user-id', uid);
  }

  return fetch(input, { ...init, headers });
}
