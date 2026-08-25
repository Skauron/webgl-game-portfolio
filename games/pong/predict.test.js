import { describe, it, expect } from 'vitest';
import { predictPaddle, lerp } from './predict.js';

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
