import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  movePaddle,
  moveBall,
  resolveWallBounce,
  resolvePaddleCollision,
  checkScoring,
  COURT_WIDTH,
  COURT_HEIGHT,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  BALL_SIZE,
  BALL_SPEED_INITIAL,
  BALL_SPEED_MAX,
  LEFT_PADDLE_X,
} from './physics.js';

test('movePaddle moves by speed * dt and clamps to court bounds', () => {
  const paddle = { y: 100 };
  movePaddle(paddle, 1, 0.1);
  assert.equal(paddle.y, 130);

  movePaddle(paddle, -1, 10);
  assert.equal(paddle.y, 0);

  movePaddle(paddle, 1, 10);
  assert.equal(paddle.y, COURT_HEIGHT - PADDLE_HEIGHT);
});

test('moveBall advances position by velocity * dt', () => {
  const ball = { x: 100, y: 100, vx: 50, vy: -20 };
  moveBall(ball, 0.5);
  assert.equal(ball.x, 125);
  assert.equal(ball.y, 90);
});

test('resolveWallBounce reflects off the top and bottom edges', () => {
  const top = { x: 0, y: -5, vx: 100, vy: -200 };
  resolveWallBounce(top);
  assert.equal(top.y, 0);
  assert.equal(top.vy, 200);

  const bottom = { x: 0, y: COURT_HEIGHT - BALL_SIZE + 5, vx: 100, vy: 200 };
  resolveWallBounce(bottom);
  assert.equal(bottom.y, COURT_HEIGHT - BALL_SIZE);
  assert.equal(bottom.vy, -200);
});

test('resolveWallBounce does nothing when the ball is within bounds', () => {
  const ball = { x: 0, y: 200, vx: 100, vy: 150 };
  resolveWallBounce(ball);
  assert.equal(ball.y, 200);
  assert.equal(ball.vy, 150);
});

test('resolvePaddleCollision returns false and does not mutate the ball when there is no overlap', () => {
  const ball = { x: 400, y: 200, vx: -100, vy: 0 };
  const paddle = { y: 185 };
  const hit = resolvePaddleCollision(ball, paddle, 'left');
  assert.equal(hit, false);
  assert.equal(ball.vx, -100);
});

test('resolvePaddleCollision reflects straight back on a dead-center hit against the left paddle', () => {
  const paddle = { y: 185 }; // center at 185 + 40 = 225
  const ball = { x: LEFT_PADDLE_X, y: 225 - BALL_SIZE / 2, vx: -280, vy: 0 };
  const hit = resolvePaddleCollision(ball, paddle, 'left');
  assert.equal(hit, true);
  assert.ok(ball.vx > 0);
  assert.ok(Math.abs(ball.vy) < 1e-9);
  assert.equal(ball.x, LEFT_PADDLE_X + PADDLE_WIDTH);
});

test('resolvePaddleCollision increases ball speed on each hit, capped at BALL_SPEED_MAX', () => {
  const paddle = { y: 185 };
  const ball = { x: LEFT_PADDLE_X, y: 225 - BALL_SIZE / 2, vx: -BALL_SPEED_INITIAL, vy: 0 };
  resolvePaddleCollision(ball, paddle, 'left');
  const speedAfterOneHit = Math.hypot(ball.vx, ball.vy);
  assert.equal(speedAfterOneHit, BALL_SPEED_INITIAL + 20);

  for (let i = 0; i < 50; i += 1) {
    ball.x = LEFT_PADDLE_X;
    ball.y = 225 - BALL_SIZE / 2;
    resolvePaddleCollision(ball, paddle, 'left');
  }
  const finalSpeed = Math.hypot(ball.vx, ball.vy);
  assert.equal(finalSpeed, BALL_SPEED_MAX);
});

test('checkScoring detects the ball passing each side wall', () => {
  assert.equal(checkScoring({ x: -20, y: 0 }), 'right');
  assert.equal(checkScoring({ x: COURT_WIDTH + 5, y: 0 }), 'left');
  assert.equal(checkScoring({ x: 400, y: 0 }), null);
});
