import { describe, it, expect } from 'vitest';
import { predictPaddle, lerp, smoothedFactor } from './predict.js';

describe('predictPaddle', () => {
  it('moves by speed * dt and clamps to court bounds, mirroring the server physics', () => {
    const paddle = { y: 100 };
    predictPaddle(paddle, 1, 0.1);
    expect(paddle.y).toBe(130);

    predictPaddle(paddle, -1, 10);
    expect(paddle.y).toBe(0);

    predictPaddle(paddle, 1, 10);
    expect(paddle.y).toBe(370); // COURT_HEIGHT(450) - PADDLE_HEIGHT(80)
  });
});

describe('lerp', () => {
  it('moves partway from current toward target by factor', () => {
    expect(lerp(0, 100, 0.25)).toBe(25);
    expect(lerp(50, 50, 0.5)).toBe(50);
  });

  it('factor 0 returns current unchanged, factor 1 returns target exactly', () => {
    expect(lerp(10, 90, 0)).toBe(10);
    expect(lerp(10, 90, 1)).toBe(90);
  });
});

describe('smoothedFactor', () => {
  it('returns the base factor unchanged when dt equals the reference interval', () => {
    expect(smoothedFactor(0.2, 1 / 30, 1 / 30)).toBeCloseTo(0.2);
  });

  it('applying it N times at dt = referenceDt/N converges to the same total correction as one application at referenceDt', () => {
    const referenceDt = 1 / 30;
    const baseFactor = 0.2;

    let onceApplied = lerp(0, 100, smoothedFactor(baseFactor, referenceDt, referenceDt));

    const n = 4; // simulates a 120fps client against a 30Hz server tick
    let repeated = 0;
    const perFrameFactor = smoothedFactor(baseFactor, referenceDt / n, referenceDt);
    for (let i = 0; i < n; i += 1) {
      repeated = lerp(repeated, 100, perFrameFactor);
    }

    expect(repeated).toBeCloseTo(onceApplied, 10);
  });

  it('a smaller dt yields a smaller per-frame factor than the base (avoids over-correcting at high frame rates)', () => {
    const referenceDt = 1 / 30;
    const half = smoothedFactor(0.2, referenceDt / 2, referenceDt);
    expect(half).toBeLessThan(0.2);
    expect(half).toBeGreaterThan(0);
  });
});
