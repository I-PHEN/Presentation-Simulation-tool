'use client';

import { auth, isFirebaseConfigured } from '@/lib/firebase';

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const currentUser = auth.currentUser;
  if (currentUser && typeof currentUser.getIdToken === 'function') {
    headers.set('Authorization', `Bearer ${await currentUser.getIdToken()}`);
  } else if (!isFirebaseConfigured() && typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('mock_user');
    try {
      const mock = raw ? JSON.parse(raw) as { uid?: unknown } : null;
      if (typeof mock?.uid === 'string') headers.set('x-mock-user-id', mock.uid);
    } catch { /* invalid local mock identity is not sent */ }
  }
  return fetch(input, { ...init, headers });
}
