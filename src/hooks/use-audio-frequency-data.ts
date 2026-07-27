'use client';

import { useEffect, useRef, useState } from 'react';

export interface UseAudioFrequencyDataOptions {
  stream?: MediaStream;
  audioNode?: AudioNode;
  isActive?: boolean;
  barCount?: number;
  fftSize?: number;
}

export function useAudioFrequencyData({
  stream,
  audioNode,
  isActive = false,
  barCount = 5,
  fftSize = 64,
}: UseAudioFrequencyDataOptions): number[] {
  const [frequencies, setFrequencies] = useState<number[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || (!stream && !audioNode) || typeof window === 'undefined') {
      setFrequencies([]);
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    let audioCtx: AudioContext | null = null;
    let sourceNode: AudioNode | null = null;
    let analyserNode: AnalyserNode | null = null;
    let createdContext = false;

    try {
      if (audioNode) {
        sourceNode = audioNode;
        audioCtx = audioNode.context as AudioContext;
      } else if (stream) {
        const audioTracks = stream.getAudioTracks();
        if (!audioTracks.length || !audioTracks.some((t) => t.enabled && t.readyState === 'live')) {
          setFrequencies([]);
          return;
        }
        audioCtx = new AudioContextClass();
        createdContext = true;
        sourceNode = audioCtx.createMediaStreamSource(stream);
      }

      if (!audioCtx || !sourceNode) return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = fftSize;
      analyserNode.smoothingTimeConstant = 0.8;
      sourceNode.connect(analyserNode);

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateData = () => {
        if (!analyserNode) return;
        analyserNode.getByteFrequencyData(dataArray);

        const barValues: number[] = new Array(barCount).fill(0);
        const chunkSize = Math.max(1, Math.floor(bufferLength / barCount));

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, bufferLength);
          const count = Math.max(1, end - start);
          for (let j = start; j < end; j++) {
            sum += dataArray[j];
          }
          const avg = sum / count;
          barValues[i] = Math.min(1, Math.max(0, avg / 255));
        }

        setFrequencies(barValues);
        animFrameRef.current = requestAnimationFrame(updateData);
      };

      updateData();
    } catch {
      setFrequencies([]);
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (analyserNode && sourceNode) {
        try {
          sourceNode.disconnect(analyserNode);
        } catch {
          // Disconnect cleanup error ignored
        }
      }
      if (createdContext && audioCtx && audioCtx.state !== 'closed') {
        try {
          audioCtx.close().catch(() => {});
        } catch {
          // Close cleanup error ignored
        }
      }
    };
  }, [stream, audioNode, isActive, barCount, fftSize]);

  return frequencies;
}
