import { Engine } from '../../engine/core/Engine.js';
import { connect } from './net.js';
import { predictPaddle, lerp } from './predict.js';
import { createRenderer } from './renderer.js';
import { WS_URL } from './config.js';

const COURT_WIDTH = 800;
const COURT_HEIGHT = 450;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 12;
const LEFT_PADDLE_X = 20;
const RIGHT_PADDLE_X = COURT_WIDTH - 20 - PADDLE_WIDTH;

const RECONCILE_FACTOR = 0.2;
const INTERP_FACTOR = 0.3;

const PADDLE_COLOR = [1.0, 1.0, 1.0, 1.0];
const BALL_COLOR = [1.0, 1.0, 1.0, 1.0];
const CENTER_LINE_COLOR = [0.3, 0.3, 0.3, 1.0];

const canvas = document.querySelector('#viewport');
const scoreEl = document.querySelector('#score');
const statusEl = document.querySelector('#status');
const overlayEl = document.querySelector('#overlay');
const overlayMessageEl = document.querySelector('#overlay-message');
const upButtonEl = document.querySelector('#btn-up');
const downButtonEl = document.querySelector('#btn-down');

let mySide = null;
let myDirection = 0;
let latestState = null;

const myPaddle = { y: (COURT_HEIGHT - PADDLE_HEIGHT) / 2 };
const opponentPaddle = { y: (COURT_HEIGHT - PADDLE_HEIGHT) / 2 };
const ball = { x: (COURT_WIDTH - BALL_SIZE) / 2, y: (COURT_HEIGHT - BALL_SIZE) / 2 };

let drawQuad;

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

function setDirection(dir) {
  myDirection = dir;
  socket.sendInput(dir);
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
    } else if (message.type === 'gameover') {
      updateScore(message.score);
      const youWon = message.winner === mySide;
      showOverlay(youWon ? 'You Win! Reload to play again.' : 'You Lose. Reload to play again.');
    } else if (message.type === 'opponent-left') {
      showOverlay('Opponent disconnected. Reload to play again.');
    }
  },
  onClose: () => setStatus('Disconnected — reload to reconnect'),
  onError: () => setStatus('Connection error — reload to reconnect'),
});

function update(dt) {
  if (!mySide) return;

  predictPaddle(myPaddle, myDirection, dt);

  if (latestState) {
    const serverMyY = mySide === 'left' ? latestState.paddles.left : latestState.paddles.right;
    const serverOpponentY = mySide === 'left' ? latestState.paddles.right : latestState.paddles.left;

    myPaddle.y = lerp(myPaddle.y, serverMyY, RECONCILE_FACTOR);
    opponentPaddle.y = lerp(opponentPaddle.y, serverOpponentY, INTERP_FACTOR);
    ball.x = lerp(ball.x, latestState.ball.x, INTERP_FACTOR);
    ball.y = lerp(ball.y, latestState.ball.y, INTERP_FACTOR);
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
  drawQuad(ball.x, ball.y, BALL_SIZE, BALL_SIZE, BALL_COLOR);
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
engine.start();
