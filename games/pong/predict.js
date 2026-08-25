// Mirrors server/physics.js's movePaddle exactly — kept as a separate,
// manually-synced implementation since client and server are different
// runtimes/files (see the plan's Global Constraints).
const PADDLE_SPEED = 300;
const COURT_HEIGHT = 450;
const PADDLE_HEIGHT = 80;

export function predictPaddle(paddle, direction, dt) {
  paddle.y += direction * PADDLE_SPEED * dt;
  const maxY = COURT_HEIGHT - PADDLE_HEIGHT;
  if (paddle.y < 0) paddle.y = 0;
  if (paddle.y > maxY) paddle.y = maxY;
}

export function lerp(current, target, factor) {
  return current + (target - current) * factor;
}

// Rescales a "correction strength per referenceDt" into the equivalent
// factor for an arbitrary elapsed dt, so that applying it once per render
// frame converges at the same total rate regardless of the client's frame
// rate — a constant per-frame factor applied every rAF tick compounds
// faster on higher-refresh-rate displays (it gets applied more often per
// unit of wall-clock time), which reads as an over-corrected, jittery pull
// against local prediction instead of a steady one.
export function smoothedFactor(perReferenceFactor, dt, referenceDt) {
  return 1 - Math.pow(1 - perReferenceFactor, dt / referenceDt);
}
