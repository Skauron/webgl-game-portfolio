export const COURT_WIDTH = 800;
export const COURT_HEIGHT = 450;
export const PADDLE_WIDTH = 12;
export const PADDLE_HEIGHT = 80;
export const PADDLE_MARGIN = 20;
export const PADDLE_SPEED = 300;
export const BALL_SIZE = 12;
export const BALL_SPEED_INITIAL = 300;
export const BALL_SPEED_INCREMENT = 20;
export const BALL_SPEED_MAX = 600;
export const WIN_SCORE = 5;

export const LEFT_PADDLE_X = PADDLE_MARGIN;
export const RIGHT_PADDLE_X = COURT_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;

export function movePaddle(paddle, direction, dt) {
  paddle.y += direction * PADDLE_SPEED * dt;
  const maxY = COURT_HEIGHT - PADDLE_HEIGHT;
  if (paddle.y < 0) paddle.y = 0;
  if (paddle.y > maxY) paddle.y = maxY;
}

export function moveBall(ball, dt) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
}

export function resolveWallBounce(ball) {
  if (ball.y < 0) {
    ball.y = 0;
    ball.vy = -ball.vy;
  } else if (ball.y + BALL_SIZE > COURT_HEIGHT) {
    ball.y = COURT_HEIGHT - BALL_SIZE;
    ball.vy = -ball.vy;
  }
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function resolvePaddleCollision(ball, paddle, side) {
  const paddleX = side === 'left' ? LEFT_PADDLE_X : RIGHT_PADDLE_X;
  const ballRect = { x: ball.x, y: ball.y, width: BALL_SIZE, height: BALL_SIZE };
  const paddleRect = { x: paddleX, y: paddle.y, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };
  if (!rectsOverlap(ballRect, paddleRect)) return false;

  const paddleCenter = paddle.y + PADDLE_HEIGHT / 2;
  const ballCenter = ball.y + BALL_SIZE / 2;
  const offset = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
  const clampedOffset = Math.max(-1, Math.min(1, offset));

  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  const newSpeed = Math.min(currentSpeed + BALL_SPEED_INCREMENT, BALL_SPEED_MAX);

  const direction = side === 'left' ? 1 : -1;
  const maxAngle = Math.PI / 4;
  const angle = clampedOffset * maxAngle;

  ball.vx = direction * newSpeed * Math.cos(angle);
  ball.vy = newSpeed * Math.sin(angle);
  ball.x = side === 'left' ? paddleX + PADDLE_WIDTH : paddleX - BALL_SIZE;

  return true;
}

export function checkScoring(ball) {
  if (ball.x + BALL_SIZE < 0) return 'right';
  if (ball.x > COURT_WIDTH) return 'left';
  return null;
}
