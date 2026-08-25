import { describe, it, expect } from 'vitest';
import { ortho } from './mat4.js';

function transformPoint(m, x, y, z = 0, w = 1) {
  return {
    x: m[0] * x + m[4] * y + m[8] * z + m[12] * w,
    y: m[1] * x + m[5] * y + m[9] * z + m[13] * w,
    z: m[2] * x + m[6] * y + m[10] * z + m[14] * w,
  };
}

describe('mat4.ortho', () => {
  it('maps the top-left pixel corner to NDC (-1, 1)', () => {
    const projection = ortho(0, 480, 480, 0, -1, 1);
    const result = transformPoint(projection, 0, 0);
    expect(result.x).toBeCloseTo(-1);
    expect(result.y).toBeCloseTo(1);
  });

  it('maps the bottom-right pixel corner to NDC (1, -1)', () => {
    const projection = ortho(0, 480, 480, 0, -1, 1);
    const result = transformPoint(projection, 480, 480);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(-1);
  });

  it('maps the center to NDC (0, 0)', () => {
    const projection = ortho(0, 480, 480, 0, -1, 1);
    const result = transformPoint(projection, 240, 240);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it('returns a 16-element column-major Float32Array', () => {
    const projection = ortho(0, 800, 450, 0, -1, 1);
    expect(projection).toBeInstanceOf(Float32Array);
    expect(projection.length).toBe(16);
  });
});
