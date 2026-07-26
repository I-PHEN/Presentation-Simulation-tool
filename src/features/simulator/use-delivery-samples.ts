'use client';

import { useEffect, useRef } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { DELIVERY_SAMPLE_MS } from '@/features/defense/delivery-analysis';
import type { DeliverySample } from '@/features/defense/types';
import { captureFrame } from './delivery-sampler';

/**
 * Samples the self-view every DELIVERY_SAMPLE_MS while the camera is on and the
 * rehearsal is live, and scores each frame through /api/analyze-frame.
 *
 * Sampling continues while a panelist speaks: you are still on camera being
 * questioned, and pausing would bias the coverage the report reports.
 *
 * A failed frame produces no sample — never a zero, which the aggregate would
 * read as "no posture" rather than "not measured".
 */
export function useDeliverySamples({ enabled, live, getVideo, startedAtMs }: {
  enabled: boolean;
  live: boolean;
  getVideo: () => HTMLVideoElement | null;
  startedAtMs: number;
}) {
  const samplesRef = useRef<DeliverySample[]>([]);

  useEffect(() => {
    if (!enabled || !live) return;
    let cancelled = false;
    const canvas = document.createElement('canvas');

    const sample = async () => {
      const video = getVideo();
      if (!video || video.readyState < 2) return; // no decoded frame yet
      const image = captureFrame(video, canvas);
      if (!image) return;
      try {
        const response = await authenticatedFetch('/api/analyze-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image }),
        });
        if (!response.ok || cancelled) return;
        const body = await response.json();
        if (typeof body?.eyeContact !== 'number') return;
        samplesRef.current.push({
          // The one session clock, as everywhere else.
          atMs: Math.max(0, Date.now() - startedAtMs),
          eyeContact: body.eyeContact,
          posture: typeof body.posture === 'number' ? body.posture : 0,
          presence: typeof body.presence === 'number' ? body.presence : 0,
        });
      } catch {
        /* non-fatal: a dropped frame is simply not evidence */
      }
    };

    const handle = setInterval(() => void sample(), DELIVERY_SAMPLE_MS);
    return () => { cancelled = true; clearInterval(handle); };
  }, [enabled, live, getVideo, startedAtMs]);

  return { getSamples: () => samplesRef.current };
}
