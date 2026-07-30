'use client';

import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export type AuthenticatedAssetRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const assetCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

export async function loadAuthenticatedAsset(source: string, request: AuthenticatedAssetRequest = authenticatedFetch): Promise<string> {
  if (!source) throw new Error('Unable to load slide preview');
  if (source.startsWith('data:') || source.startsWith('blob:')) {
    return source;
  }
  if (assetCache.has(source)) {
    return assetCache.get(source)!;
  }
  if (pendingRequests.has(source)) {
    return pendingRequests.get(source)!;
  }

  const promise = (async () => {
    try {
      const response = await request(source);
      if (!response.ok) throw new Error('Unable to load slide preview');
      const url = URL.createObjectURL(await response.blob());
      assetCache.set(source, url);
      return url;
    } finally {
      pendingRequests.delete(source);
    }
  })();

  pendingRequests.set(source, promise);
  return promise;
}

export function preloadAuthenticatedAssets(sources: string[], request: AuthenticatedAssetRequest = authenticatedFetch): void {
  for (const src of sources) {
    if (src && !assetCache.has(src) && !src.startsWith('data:') && !src.startsWith('blob:')) {
      void loadAuthenticatedAsset(src, request).catch(() => {});
    }
  }
}

export function releaseAuthenticatedAsset(url: string | null | undefined) {
  if (url) {
    for (const [key, cachedUrl] of assetCache.entries()) {
      if (cachedUrl === url) {
        assetCache.delete(key);
        break;
      }
    }
    URL.revokeObjectURL(url);
  }
}

export function AuthenticatedSlideImage({ source, alt, className }: { source: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string>(() => (source && assetCache.get(source)) || (source?.startsWith('data:') || source?.startsWith('blob:') ? source : ''));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!source) return;
    let active = true;
    const cached = assetCache.get(source);
    if (cached) {
      setObjectUrl(cached);
      setFailed(false);
      return;
    }
    if (source.startsWith('data:') || source.startsWith('blob:')) {
      setObjectUrl(source);
      setFailed(false);
      return;
    }

    setFailed(false);
    void loadAuthenticatedAsset(source)
      .then((url) => {
        if (active) setObjectUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [source]);

  if (failed) return <div role="alert" className="text-sm text-destructive">Slide preview could not be loaded.</div>;
  if (!objectUrl) return <div role="status" className="text-sm text-muted-foreground animate-pulse">Loading private slide preview…</div>;
  return <img src={objectUrl} alt={alt} className={className} />;
}
