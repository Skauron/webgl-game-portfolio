import { Engine } from '../../engine/core/Engine.js';
import { connect } from './net.js';
import { predictPaddle, lerp, smoothedFactor } from './predict.js';
import { createRenderer } from './renderer.js';
import { createGlowRenderer } from './glowRenderer.js';
import { createBurst, updateParticles } from '../../engine/core/particles.js';
import { createParticleRenderer } from '../../engine/core/ParticleRenderer.js';
import { WS_URL } from './config.js';

const COURT_WIDTH = 800;
const COURT_HEIGHT = 450;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 12;
const LEFT_PADDLE_X = 20;
const RIGHT_PADDLE_X = COURT_WIDTH - 20 - PADDLE_WIDTH;

// These are correction-per-server-tick strengths (the server ticks at
// 30Hz). Applying them directly as a per-render-frame lerp factor made the
// correction strength scale with the client's frame rate instead of the
// server's tick rate: at 60fps (2 renders per tick) the same stale target
// got blended in twice, at 120fps four times, compounding into a much
// stronger pull than intended and reading as jittery, rough paddle motion,
// worse on higher-refresh-rate monitors. smoothedFactor() rescales the
// factor by elapsed time so the *total* correction applied over one tick's
// worth of wall-clock time stays constant regardless of render frame rate.
const TICK_DT = 1 / 30;
const RECONCILE_FACTOR = 0.2;
const INTERP_FACTOR = 0.3;

const PADDLE_COLOR = [1.0, 1.0, 1.0, 1.0];
const BALL_COLOR = [1.0, 1.0, 1.0, 1.0];
const CENTER_LINE_COLOR = [0.3, 0.3, 0.3, 1.0];

const BALL_GLOW_SIZE = 11;
const BALL_TRAIL_LENGTH = 6;
const BALL_TRAIL_GLOW_SIZE = 8;
const BALL_TRAIL_JUMP_THRESHOLD = 100; // px — a jump this big means the ball was re-served, not moving

const PADDLE_HIT_MARGIN = 20; // how close to a paddle's x-line counts as "hit it"
const SPARK_OPTIONS = { count: 8, life: 0.3, speedMin: 60, speedMax: 160 };
const SPARK_PALETTE = [
  [0.85, 0.95, 1.0],
  [0.5, 0.8, 1.0],
  [0.15, 0.35, 0.55],
];

const canvas = document.querySelector('#viewport');
const scoreEl = document.querySelector('#score');
const statusEl = document.querySelector('#status');
const overlayEl = document.querySelector('#overlay');
const overlayMessageEl = document.querySelector('#overlay-message');
const countdownEl = document.querySelector('#countdown');
const upButtonEl = document.querySelector('#btn-up');
const downButtonEl = document.querySelector('#btn-down');

let mySide = null;
let myDirection = 0;
let latestState = null;

const myPaddle = { y: (COURT_HEIGHT - PADDLE_HEIGHT) / 2 };
const opponentPaddle = { y: (COURT_HEIGHT - PADDLE_HEIGHT) / 2 };
const ball = { x: (COURT_WIDTH - BALL_SIZE) / 2, y: (COURT_HEIGHT - BALL_SIZE) / 2 };

let ballTrail = [];
let sparks = [];
let previousServerBallX = null;
let previousBallDx = 0;

let drawQuad;
let drawGlow;
let drawSparks;

function setStatus(text) {
  statusEl.textContent = text;
}

function showOverlay(message) {
  overlayMessageEl.textContent = message;
  overlayEl.classList.add('visible');
}

function updateScore(score) {
  scoreEl.textContent = `${score.left} — ${score.right}`;
}

function setCountdown(value) {
  if (value) {
    countdownEl.textContent = value;
    countdownEl.classList.add('visible');
  } else {
    countdownEl.classList.remove('visible');
  }
}

function setDirection(dir) {
  myDirection = dir;
  socket.sendInput(dir);
}

// Detects a paddle bounce by watching the server's raw ball.x for a
// horizontal-direction reversal near a paddle line. Wall bounces only flip
// vy, never vx, so this can't false-positive on those — only an actual
// paddle collision reverses x.
function detectPaddleHit(ballX, ballY) {
  if (previousServerBallX !== null) {
    const dx = ballX - previousServerBallX;
    if (previousBallDx !== 0 && Math.sign(dx) !== Math.sign(previousBallDx)) {
      const nearLeftPaddle = ballX <= LEFT_PADDLE_X + PADDLE_WIDTH + PADDLE_HIT_MARGIN;
      const nearRightPaddle = ballX >= RIGHT_PADDLE_X - PADDLE_HIT_MARGIN;
      if (nearLeftPaddle || nearRightPaddle) {
        sparks.push(...createBurst(ballX, ballY, SPARK_OPTIONS));
      }
    }
    if (dx !== 0) previousBallDx = dx;
  }
  previousServerBallX = ballX;
}

const COLD_START_MESSAGE_DELAY = 3000; // ms

let connectionOpened = false;

const coldStartTimer = setTimeout(() => {
  if (!connectionOpened) {
    setStatus('Waking the server (free hosting can take up to a minute)…');
  }
}, COLD_START_MESSAGE_DELAY);

const socket = connect(WS_URL, {
  onOpen: () => {
    connectionOpened = true;
    clearTimeout(coldStartTimer);
    setStatus('Connected');
  },
  onMessage: (message) => {
    if (message.type === 'waiting') {
      setStatus('Waiting for an opponent…');
      showOverlay('Waiting for an opponent — open this page in a second tab, or share the link with someone to play.');
    } else if (message.type === 'matched') {
      mySide = message.side;
      setStatus(`Playing as ${mySide}`);
      overlayEl.classList.remove('visible');
    } else if (message.type === 'state') {
      latestState = message;
      updateScore(message.score);
      setCountdown(message.countdown);
      detectPaddleHit(message.ball.x, message.ball.y);
    } else if (message.type === 'gameover') {
      updateScore(message.score);
      setCountdown(null);
      const youWon = message.winner === mySide;
      showOverlay(youWon ? 'You Win! Reload to play again.' : 'You Lose. Reload to play again.');
    } else if (message.type === 'opponent-left') {
      showOverlay('Opponent disconnected. Reload to play again.');
    }
  },
  onClose: () => setStatus('Disconnected — reload to reconnect'),
  onError: () => setStatus('Connection error — reload to reconnect'),
});

function updateBallTrail() {
  const last = ballTrail[ballTrail.length - 1];
  if (last && Math.hypot(ball.x - last.x, ball.y - last.y) > BALL_TRAIL_JUMP_THRESHOLD) {
    ballTrail.length = 0; // ball was re-served (teleported), not moving — don't trail across the jump
  }
  ballTrail.push({ x: ball.x, y: ball.y });
  if (ballTrail.length > BALL_TRAIL_LENGTH) ballTrail.shift();
}

function update(dt) {
  sparks = updateParticles(sparks, dt);

  if (!mySide) return;

  predictPaddle(myPaddle, myDirection, dt);

  if (latestState) {
    const serverMyY = mySide === 'left' ? latestState.paddles.left : latestState.paddles.right;
    const serverOpponentY = mySide === 'left' ? latestState.paddles.right : latestState.paddles.left;

    const reconcileFactor = smoothedFactor(RECONCILE_FACTOR, dt, TICK_DT);
    const interpFactor = smoothedFactor(INTERP_FACTOR, dt, TICK_DT);

    myPaddle.y = lerp(myPaddle.y, serverMyY, reconcileFactor);
    opponentPaddle.y = lerp(opponentPaddle.y, serverOpponentY, interpFactor);
    ball.x = lerp(ball.x, latestState.ball.x, interpFactor);
    ball.y = lerp(ball.y, latestState.ball.y, interpFactor);
    updateBallTrail();
  }
}

function render(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  drawQuad(COURT_WIDTH / 2 - 1, 0, 2, COURT_HEIGHT, CENTER_LINE_COLOR);

  const leftPaddle = mySide === 'right' ? opponentPaddle : myPaddle;
  const rightPaddle = mySide === 'right' ? myPaddle : opponentPaddle;

  drawQuad(LEFT_PADDLE_X, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_COLOR);
  drawQuad(RIGHT_PADDLE_X, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_COLOR);

  ballTrail.forEach((point, index) => {
    const brightness = ((index + 1) / ballTrail.length) * 0.4;
    drawGlow(point.x + BALL_SIZE / 2, point.y + BALL_SIZE / 2, BALL_TRAIL_GLOW_SIZE, BALL_COLOR, brightness);
  });
  // Soft halo behind a crisp, hard-edged circle — a pure smoothstep glow
  // alone (fading across the whole radius) read as an undefined blur, not a
  // defined round ball.
  drawGlow(ball.x + BALL_SIZE / 2, ball.y + BALL_SIZE / 2, BALL_GLOW_SIZE, BALL_COLOR, 0.5);
  drawGlow(ball.x + BALL_SIZE / 2, ball.y + BALL_SIZE / 2, BALL_SIZE / 2, BALL_COLOR, 1.0, true);

  drawSparks(sparks);
}

const KEY_UP = new Set(['ArrowUp', 'w']);
const KEY_DOWN = new Set(['ArrowDown', 's']);

window.addEventListener('keydown', (event) => {
  if (!KEY_UP.has(event.key) && !KEY_DOWN.has(event.key)) return;
  event.preventDefault();
  const dir = KEY_UP.has(event.key) ? -1 : 1;
  if (dir !== myDirection) setDirection(dir);
});

window.addEventListener('keyup', (event) => {
  if (KEY_UP.has(event.key) && myDirection === -1) setDirection(0);
  else if (KEY_DOWN.has(event.key) && myDirection === 1) setDirection(0);
});

upButtonEl.addEventListener('pointerdown', () => setDirection(-1));
upButtonEl.addEventListener('pointerup', () => {
  if (myDirection === -1) setDirection(0);
});
upButtonEl.addEventListener('pointerleave', () => {
  if (myDirection === -1) setDirection(0);
});

downButtonEl.addEventListener('pointerdown', () => setDirection(1));
downButtonEl.addEventListener('pointerup', () => {
  if (myDirection === 1) setDirection(0);
});
downButtonEl.addEventListener('pointerleave', () => {
  if (myDirection === 1) setDirection(0);
});

const engine = new Engine({ canvas, update, render });
({ drawQuad } = createRenderer(engine.gl));
({ drawGlow } = createGlowRenderer(engine.gl));
({ drawParticles: drawSparks } = createParticleRenderer(engine.gl, { size: 3, palette: SPARK_PALETTE }));
engine.start();
