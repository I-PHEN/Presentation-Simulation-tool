'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The self-view camera: off by default, entirely separate from the microphone
 * streams (createSTT and the session recorder own those). Nothing here uploads
 * or records video — see use-delivery-samples for the opt-in analysis loop.
 */
export function useCamera() {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // The camera light must go out when the room unmounts, not just on toggle.
  useEffect(() => release, [release]);

  const attach = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video && streamRef.current) video.srcObject = streamRef.current;
  }, []);

  const toggle = useCallback(async () => {
    if (enabled) {
      release();
      setEnabled(false);
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setEnabled(true);
    } catch {
      release();
      setEnabled(false);
      setError('Camera access was unavailable. Check permission and retry.');
    }
  }, [enabled, release]);

  return { enabled, error, toggle, attach, getStream: () => streamRef.current, getVideo: () => videoRef.current };
}
