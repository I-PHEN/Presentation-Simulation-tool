'use client';

import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { clampPipPosition, defaultPipPosition } from './pip-position';

const PIP_W = 208;
const PIP_H = 117; // 16:9

/**
 * Draggable self-view over the stage. Mirrored, like every other video tool, so
 * moving left looks like moving left. Nothing is recorded or uploaded here.
 */
export function CameraPip({ attach }: { attach: (video: HTMLVideoElement | null) => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const bounds = useCallback(() => {
    const parent = frameRef.current?.parentElement;
    return { boundsW: parent?.clientWidth ?? 0, boundsH: parent?.clientHeight ?? 0 };
  }, []);

  // Rest bottom-right until dragged; measured after layout so the stage has a size.
  useLayoutEffect(() => {
    setPosition((current) => current ?? defaultPipPosition(bounds(), { pipW: PIP_W, pipH: PIP_H }));
  }, [bounds]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = frameRef.current?.getBoundingClientRect();
    const parent = frameRef.current?.parentElement?.getBoundingClientRect();
    if (!rect || !parent) return;
    dragRef.current = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const parent = frameRef.current?.parentElement?.getBoundingClientRect();
    if (!drag || !parent) return;
    setPosition(clampPipPosition({
      x: event.clientX - parent.left - drag.offsetX,
      y: event.clientY - parent.top - drag.offsetY,
      pipW: PIP_W, pipH: PIP_H, ...bounds(),
    }));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div
      ref={frameRef}
      role="group"
      aria-label="Your camera"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{ width: PIP_W, height: PIP_H, left: position?.x ?? 0, top: position?.y ?? 0 }}
      className="absolute z-20 cursor-grab touch-none overflow-hidden rounded-lg border border-border bg-card active:cursor-grabbing"
    >
      <video
        ref={attach}
        autoPlay
        playsInline
        muted
        aria-label="Camera self-view"
        className="h-full w-full -scale-x-100 object-cover"
      />
    </div>
  );
}
