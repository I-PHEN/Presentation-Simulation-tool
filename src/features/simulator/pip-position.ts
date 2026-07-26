export interface PipBox {
  x: number; y: number;
  pipW: number; pipH: number;
  boundsW: number; boundsH: number;
}

/**
 * Keeps the dragged self-view fully inside the stage. Pure so the drag rule is
 * testable without a DOM; the pointer handlers stay a thin shell over it.
 * A PiP larger than its bounds pins to the top-left rather than going negative.
 */
export function clampPipPosition({ x, y, pipW, pipH, boundsW, boundsH }: PipBox): { x: number; y: number } {
  return {
    x: Math.round(Math.max(0, Math.min(x, Math.max(0, boundsW - pipW)))),
    y: Math.round(Math.max(0, Math.min(y, Math.max(0, boundsH - pipH)))),
  };
}

/** Bottom-right resting place, inset from the edge. */
export function defaultPipPosition(bounds: { boundsW: number; boundsH: number }, pip: { pipW: number; pipH: number }, inset = 16): { x: number; y: number } {
  return clampPipPosition({
    x: bounds.boundsW - pip.pipW - inset,
    y: bounds.boundsH - pip.pipH - inset,
    ...pip, ...bounds,
  });
}
