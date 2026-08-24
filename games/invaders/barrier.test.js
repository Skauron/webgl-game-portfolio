import { describe, it, expect } from 'vitest';
import {
  createBarrier,
  hitBarrier,
  BARRIER_MAX_HITS,
  BARRIER_WIDTH,
  BARRIER_HEIGHT,
} from './barrier.js';

describe('barrier', () => {
  it('creates a barrier at full health with its fixed size', () => {
    const barrier = createBarrier(100, 300);
    expect(barrier).toEqual({
      x: 100,
      y: 300,
      width: BARRIER_WIDTH,
      height: BARRIER_HEIGHT,
      hitPoints: BARRIER_MAX_HITS,
    });
  });

  it('decrements hit points on each hit and reports not destroyed until they run out', () => {
    const barrier = createBarrier(0, 0);
    for (let i = 1; i < BARRIER_MAX_HITS; i += 1) {
      const destroyed = hitBarrier(barrier);
      expect(destroyed).toBe(false);
      expect(barrier.hitPoints).toBe(BARRIER_MAX_HITS - i);
    }
  });

  it('reports destroyed on the hit that brings it to zero', () => {
    const barrier = createBarrier(0, 0);
    let destroyed = false;
    for (let i = 0; i < BARRIER_MAX_HITS; i += 1) {
      destroyed = hitBarrier(barrier);
    }
    expect(destroyed).toBe(true);
    expect(barrier.hitPoints).toBe(0);
  });
});
