import { describe, expect, it } from 'vitest';
import { clampPipPosition, defaultPipPosition } from './pip-position';

const stage = { pipW: 200, pipH: 120, boundsW: 1000, boundsH: 600 };

describe('clampPipPosition', () => {
  it('leaves a position that is already inside alone', () => {
    expect(clampPipPosition({ ...stage, x: 300, y: 200 })).toEqual({ x: 300, y: 200 });
  });

  it('clamps to every edge', () => {
    expect(clampPipPosition({ ...stage, x: -50, y: 200 })).toEqual({ x: 0, y: 200 });
    expect(clampPipPosition({ ...stage, x: 300, y: -50 })).toEqual({ x: 300, y: 0 });
    expect(clampPipPosition({ ...stage, x: 5000, y: 200 })).toEqual({ x: 800, y: 200 }); // 1000 - 200
    expect(clampPipPosition({ ...stage, x: 300, y: 5000 })).toEqual({ x: 300, y: 480 }); // 600 - 120
  });

  it('pins to the origin when the self-view is bigger than the stage', () => {
    expect(clampPipPosition({ x: 40, y: 40, pipW: 900, pipH: 700, boundsW: 400, boundsH: 300 }))
      .toEqual({ x: 0, y: 0 });
  });

  it('rounds to whole pixels', () => {
    expect(clampPipPosition({ ...stage, x: 12.6, y: 40.2 })).toEqual({ x: 13, y: 40 });
  });
});

describe('defaultPipPosition', () => {
  it('rests inset from the bottom-right corner', () => {
    expect(defaultPipPosition({ boundsW: 1000, boundsH: 600 }, { pipW: 200, pipH: 120 }))
      .toEqual({ x: 784, y: 464 });
  });

  it('stays inside a stage too small for the inset', () => {
    expect(defaultPipPosition({ boundsW: 180, boundsH: 100 }, { pipW: 200, pipH: 120 }))
      .toEqual({ x: 0, y: 0 });
  });
});
