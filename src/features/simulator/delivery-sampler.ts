'use client';

/** Whisper-grade is irrelevant here; the VLM only needs a legible face. */
const MAX_FRAME_WIDTH = 640;
const JPEG_QUALITY = 0.6;

/** Downscaled frame size, keeping the source aspect. Pure, so it is testable. */
export function frameSize(videoWidth: number, videoHeight: number, maxWidth = MAX_FRAME_WIDTH): { width: number; height: number } {
  if (videoWidth <= 0 || videoHeight <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, maxWidth / videoWidth);
  return { width: Math.round(videoWidth * scale), height: Math.round(videoHeight * scale) };
}

/** A JPEG data URL of the current video frame, or null if there is nothing to read yet. */
export function captureFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  const { width, height } = frameSize(video.videoWidth, video.videoHeight);
  if (width === 0 || height === 0) return null;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
