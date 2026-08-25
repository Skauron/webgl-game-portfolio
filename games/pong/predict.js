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
