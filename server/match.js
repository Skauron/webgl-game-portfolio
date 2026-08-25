import { WebSocket } from 'ws';
import {
  movePaddle,
  moveBall,
  resolveWallBounce,
  resolvePaddleCollision,
  checkScoring,
  WIN_SCORE,
  BALL_SPEED_INITIAL,
  COURT_WIDTH,
  COURT_HEIGHT,
  PADDLE_HEIGHT,
  BALL_SIZE,
} from './physics.js';

const TICK_RATE = 30;
const TICK_INTERVAL_MS = 1000 / TICK_RATE;
const TICK_DT = 1 / TICK_RATE;

function serveBall() {
  const angle = (Math.random() * 0.5 - 0.25) * Math.PI; // -45deg..+45deg
  const direction = Math.random() < 0.5 ? -1 : 1;
  return {
    x: (COURT_WIDTH - BALL_SIZE) / 2,
    y: (COURT_HEIGHT - BALL_SIZE) / 2,
    vx: direction * BALL_SPEED_INITIAL * Math.cos(angle),
    vy: BALL_SPEED_INITIAL * Math.sin(angle),
  };
}

export class Match {
  constructor(leftSocket, rightSocket, onEnd) {
    this.sockets = { left: leftSocket, right: rightSocket };
    this.directions = { left: 0, right: 0 };
    this.paddles = {
      left: { y: (COURT_HEIGHT - PADDLE_HEIGHT) / 2 },
      right: { y: (COURT_HEIGHT - PADDLE_HEIGHT) / 2 },
    };
    this.ball = serveBall();
    this.score = { left: 0, right: 0 };
    this.tick = 0;
    this.onEnd = onEnd;
    this.intervalId = null;

    this.sockets.left.send(JSON.stringify({ type: 'matched', side: 'left' }));
    this.sockets.right.send(JSON.stringify({ type: 'matched', side: 'right' }));

    for (const side of ['left', 'right']) {
      this.sockets[side].on('message', (raw) => this._handleMessage(side, raw));
      this.sockets[side].on('close', () => this._handleDisconnect(side));
    }

    this.intervalId = setInterval(() => this._step(), TICK_INTERVAL_MS);
  }

  _handleMessage(side, raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (message && typeof message === 'object' && message.type === 'input' && [-1, 0, 1].includes(message.direction)) {
      this.directions[side] = message.direction;
    }
  }

  _handleDisconnect(side) {
    if (!this.intervalId) return;
    const otherSide = side === 'left' ? 'right' : 'left';
    const otherSocket = this.sockets[otherSide];
    if (otherSocket.readyState === WebSocket.OPEN) {
      otherSocket.send(JSON.stringify({ type: 'opponent-left' }));
    }
    this._end();
  }

  _step() {
    this.tick += 1;
    movePaddle(this.paddles.left, this.directions.left, TICK_DT);
    movePaddle(this.paddles.right, this.directions.right, TICK_DT);
    moveBall(this.ball, TICK_DT);
    resolveWallBounce(this.ball);
    resolvePaddleCollision(this.ball, this.paddles.left, 'left');
    resolvePaddleCollision(this.ball, this.paddles.right, 'right');

    const scoringSide = checkScoring(this.ball);
    if (scoringSide) {
      this.score[scoringSide] += 1;
      this.ball = serveBall();
    }

    if (this.score.left >= WIN_SCORE || this.score.right >= WIN_SCORE) {
      const winner = this.score.left >= WIN_SCORE ? 'left' : 'right';
      this._broadcast({ type: 'gameover', winner, score: this.score });
      this._end();
      return;
    }

    this._broadcast({
      type: 'state',
      tick: this.tick,
      ball: { x: this.ball.x, y: this.ball.y },
      paddles: { left: this.paddles.left.y, right: this.paddles.right.y },
      score: this.score,
    });
  }

  _broadcast(message) {
    const raw = JSON.stringify(message);
    for (const side of ['left', 'right']) {
      if (this.sockets[side].readyState === WebSocket.OPEN) {
        this.sockets[side].send(raw);
      }
    }
  }

  _end() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.onEnd();
  }
}
