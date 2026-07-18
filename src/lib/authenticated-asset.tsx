'use client';

import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export type AuthenticatedAssetRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function loadAuthenticatedAsset(source: string, request: AuthenticatedAssetRequest = authenticatedFetch): Promise<string> {
  const response = await request(source);
  if (!response.ok) throw new Error('Unable to load slide preview');
  return URL.createObjectURL(await response.blob());
}

export function releaseAuthenticatedAsset(url: string | null | undefined) {
  if (url) URL.revokeObjectURL(url);
}

export function AuthenticatedSlideImage({ source, alt, className }: { source: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current: string | undefined;
    let active = true;
    setObjectUrl(undefined);
    setFailed(false);
    void loadAuthenticatedAsset(source).then((url) => {
      current = url;
      if (active) setObjectUrl(url);
      else releaseAuthenticatedAsset(url);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; releaseAuthenticatedAsset(current); };
  }, [source]);
  if (failed) return <div role="alert" className="text-sm text-destructive">Slide preview could not be loaded.</div>;
  if (!objectUrl) return <div role="status" className="text-sm text-muted-foreground">Loading private slide preview…</div>;
  return <img src={objectUrl} alt={alt} className={className} />;
}
