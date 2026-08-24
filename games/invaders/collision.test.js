import { describe, it, expect } from 'vitest';
import { rectsOverlap } from './collision.js';

describe('rectsOverlap', () => {
  it('returns true when two rects overlap', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 5, y: 5, width: 10, height: 10 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it('returns false when rects are separated on the x axis', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 20, y: 0, width: 10, height: 10 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it('returns false when rects are separated on the y axis', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 0, y: 20, width: 10, height: 10 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it('returns false when rects only touch at an edge (no overlap area)', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 0, width: 10, height: 10 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it('is symmetric: order of arguments does not matter', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 5, y: 5, width: 10, height: 10 };
    expect(rectsOverlap(a, b)).toBe(rectsOverlap(b, a));
  });
});
