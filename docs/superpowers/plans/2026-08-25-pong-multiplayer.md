# Pong Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Task 3 ends with a controller/user checkpoint (deploying to Render) that no subagent can perform — the controller must pause and coordinate this with the user directly, not dispatch it.**

**Goal:** Ship a working 2-player real-time Pong over WebSockets — server-authoritative simulation on a Node/Render backend, raw-WebGL client with client-side paddle prediction and snapshot interpolation, wired into the existing portfolio.

**Architecture:** `server/` is a standalone Node package (own `package.json`, deployed to Render, not part of the Vite build) running a fixed-tick authoritative simulation. `games/pong/` is a client page in the existing Vite multi-page portfolio, same shape as the other three games. The two communicate over a small JSON WebSocket protocol; there is no shared code between them (client and server duplicate the paddle-movement formula intentionally — see spec).

**Tech Stack:** Server: Node.js, `ws` (the only server dependency), `node:test` for server unit tests. Client: plain JavaScript, the existing WebGL engine (`engine/core/*`), Vitest (existing `npm test`).

**Spec:** [docs/superpowers/specs/2026-08-25-pong-multiplayer-design.md](../specs/2026-08-25-pong-multiplayer-design.md)

## Global Constraints

- Plain JavaScript only — no TypeScript, no frameworks (client or server). No Socket.io — raw `ws` only.
- Court: 800×450. Paddles: 12×80, 20px margin from each side wall, speed 300 units/sec. Ball: 12×12, initial speed 300 units/sec, +20 units/sec per paddle hit, capped at 600, reflection angle based on hit offset from paddle center (±45°). Win score: 5.
- Server ticks and broadcasts at 30 Hz (`TICK_DT = 1/30`).
- Server holds at most one active match; extra connections queue FIFO and are promoted when the active match ends.
- No reconnection support anywhere — a dropped connection ends the match; "reload the page" is the recovery path in every case (disconnect, error, game over).
- `server/physics.js` and `games/pong/predict.js` intentionally implement the same paddle-movement formula independently (not a shared module) — keep the constants (`PADDLE_SPEED=300`, `COURT_HEIGHT=450`, `PADDLE_HEIGHT=80`) and logic identical between them.
- Client does NOT flip perspective — `side: "left"` always renders on the visual left, `side: "right"` on the visual right, for both players.

---

### Task 1: Server scaffold + physics (TDD)

**Files:**
- Create: `server/package.json`
- Create: `server/physics.js`
- Test: `server/physics.test.js`

**Interfaces:**
- Produces: `COURT_WIDTH`(800), `COURT_HEIGHT`(450), `PADDLE_WIDTH`(12), `PADDLE_HEIGHT`(80), `PADDLE_MARGIN`(20), `PADDLE_SPEED`(300), `BALL_SIZE`(12), `BALL_SPEED_INITIAL`(300), `BALL_SPEED_INCREMENT`(20), `BALL_SPEED_MAX`(600), `WIN_SCORE`(5), `LEFT_PADDLE_X`(20), `RIGHT_PADDLE_X`(768), `movePaddle(paddle, direction, dt)`, `moveBall(ball, dt)`, `resolveWallBounce(ball)`, `resolvePaddleCollision(ball, paddle, side)` → boolean, `checkScoring(ball)` → `'left' | 'right' | null`. Task 2 (`match.js`) imports and drives all of these each tick.

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "pong-server",
  "private": true,
  "type": "module",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {
    "ws": "^8.18.0"
  }
}
```

- [ ] **Step 2: Install the server's dependency**

Run: `cd server && npm install`
Expected: `node_modules/ws` installed, `package-lock.json` created inside `server/`.

- [ ] **Step 3: Write the failing tests**

Create `server/physics.test.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module './physics.js'`.

- [ ] **Step 5: Write the implementation**

Create `server/physics.js`:

```js
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS (8 tests).

- [ ] **Step 7: Commit**

```bash
git add server/package.json server/package-lock.json server/physics.js server/physics.test.js
git commit -m "feat: add Pong server scaffold and physics simulation"
```

---

### Task 2: Match + server (manual verification)

**Files:**
- Create: `server/match.js`
- Create: `server/server.js`

**Interfaces:**
- Consumes: everything from `server/physics.js` (Task 1).
- Produces: `class Match` (constructor `(leftSocket, rightSocket, onEnd)`), used internally by `server.js`'s connection-queue/pairing logic. No later task imports from this file — it's the terminal server-side deliverable alongside Task 1.

- [ ] **Step 1: Create `server/match.js`**

```js
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
    if (message.type === 'input' && [-1, 0, 1].includes(message.direction)) {
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
      this._broadcast({ type: 'gameover', winner });
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
```

- [ ] **Step 2: Create `server/server.js`**

```js
import { WebSocketServer } from 'ws';
import { Match } from './match.js';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

let activeMatch = null;
const queue = [];

function tryPairNext() {
  if (activeMatch || queue.length < 2) return;
  const leftSocket = queue.shift();
  const rightSocket = queue.shift();
  activeMatch = new Match(leftSocket, rightSocket, () => {
    activeMatch = null;
    tryPairNext();
  });
}

function handleConnection(socket) {
  queue.push(socket);
  socket.send(JSON.stringify({ type: 'waiting' }));
  socket.on('close', () => {
    const index = queue.indexOf(socket);
    if (index !== -1) queue.splice(index, 1);
  });
  tryPairNext();
}

wss.on('connection', handleConnection);

console.log(`Pong server listening on port ${PORT}`);
```

No automated test — real WebSocket connections and timers, same category as the client games' `main.js`/`renderer.js`. Verified manually in Step 3.

- [ ] **Step 3: Verify manually with a throwaway two-client script**

Start the server: `cd server && node server.js` (leave running in one terminal).

In a second terminal, from the repo root, create a throwaway file `verify-pong.mjs` (do NOT commit this file — delete it after verifying):

```js
import WebSocket from 'ws';

const a = new WebSocket('ws://localhost:8080');
const b = new WebSocket('ws://localhost:8080');

a.on('open', () => console.log('A connected'));
a.on('message', (data) => console.log('A received:', data.toString()));
b.on('open', () => console.log('B connected'));
b.on('message', (data) => console.log('B received:', data.toString()));

setTimeout(() => {
  console.log('--- A sends input direction -1 ---');
  a.send(JSON.stringify({ type: 'input', direction: -1 }));
}, 500);

setTimeout(() => {
  console.log('--- closing B to test opponent-left ---');
  b.close();
}, 1500);

setTimeout(() => process.exit(0), 2500);
```

Run: `node --experimental-modules verify-pong.mjs` (or plain `node verify-pong.mjs` — `.mjs` is treated as ESM regardless of `package.json`'s `type` field, and the root `package.json` doesn't need `ws` installed for this since `server/node_modules` isn't visible from root; run it from inside `server/` instead: `cd server && node ../verify-pong.mjs` won't resolve `ws` either — simplest is to temporarily copy `verify-pong.mjs` into `server/` and run `cd server && node verify-pong.mjs`, then delete it).

Expected output sequence: `A connected`, `A received: {"type":"waiting"}`, `B connected`, both receive `{"type":"matched","side":"left"}` / `{"type":"matched","side":"right"}`, then repeated `{"type":"state",...}` messages roughly every 33ms with `paddles.left` decreasing after the input line fires, then after B closes, A receives `{"type":"opponent-left"}` and no further `state` messages arrive.

Delete `verify-pong.mjs` when done (it's a throwaway diagnostic, not part of the repo).

- [ ] **Step 4: Commit**

```bash
git add server/match.js server/server.js
git commit -m "feat: add Pong match simulation loop and matchmaking server"
```

---

### Task 3: Render deploy config — ends with a controller/user checkpoint

**Files:**
- Create: `render.yaml`

**Interfaces:**
- Produces: nothing consumed by later tasks in code — but Task 8 needs the live `wss://` URL Render assigns once this is deployed, which only a human can obtain (via the Render dashboard).

- [ ] **Step 1: Create `render.yaml` at the repo root**

```yaml
services:
  - type: web
    name: webgl-portfolio-pong
    runtime: node
    plan: free
    rootDir: server
    buildCommand: npm install
    startCommand: node server.js
```

- [ ] **Step 2: Commit and push**

```bash
git add render.yaml
git commit -m "chore: add Render blueprint for the Pong server"
git push origin master
```

- [ ] **Step 3: STOP — this is a controller/user checkpoint, not a subagent step**

If you are a dispatched implementer subagent: you cannot complete this step (it requires the human's Render account/browser) — report back **DONE_WITH_CONCERNS**, noting Steps 1-2 are complete and Step 3 requires the controller to coordinate with the user directly.

If you are the controller: pause here and ask the user to:
1. Go to the Render dashboard → New → Blueprint.
2. Select this GitHub repo (`webgl-game-portfolio`).
3. Render reads `render.yaml` and proposes the `webgl-portfolio-pong` service — click Apply.
4. Wait for the first deploy to finish, then copy the assigned URL (looks like `https://webgl-portfolio-pong-XXXX.onrender.com`).
5. Report that URL back.

Do not proceed to Task 8 until the user provides this URL. Tasks 4-7 (the client) don't need it yet — they run against `localhost` during development — so they can proceed in the meantime.

---

### Task 4: Client page scaffold (vite config, HTML shell, config, main.js stub, landing page link)

**Files:**
- Modify: `vite.config.js`
- Modify: `index.html` (root landing page)
- Create: `games/pong/index.html`
- Create: `games/pong/config.js`
- Create: `games/pong/main.js`

**Interfaces:**
- Produces: `WS_URL` (exported from `config.js`) — Task 7's `main.js` imports this to connect. A `games/pong/` page served by `npm run dev`, with `<canvas id="viewport">` (800×450), `#score`/`#status` HUD spans, `#overlay`/`#overlay-message`, and `#btn-up`/`#btn-down` touch buttons that Task 7 will wire up.

- [ ] **Step 1: Replace `vite.config.js` to add the pong entry**

```js
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/webgl-game-portfolio/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'games/demo/index.html'),
        pacman: resolve(__dirname, 'games/pacman/index.html'),
        invaders: resolve(__dirname, 'games/invaders/index.html'),
        pong: resolve(__dirname, 'games/pong/index.html'),
      },
    },
  },
});
```

- [ ] **Step 2: Add a fourth card to the root `index.html`**

In `index.html`, inside `<div class="games">`, add a fourth card immediately after the Space Invaders card:

```html
<a class="card" href="games/pong/">Pong Multiplayer<span>Game #3</span></a>
```

The rest of `index.html` is unchanged.

- [ ] **Step 3: Create `games/pong/config.js`**

```js
const RENDER_WS_URL = 'wss://REPLACE-WITH-RENDER-URL.onrender.com';

export const WS_URL = import.meta.env.PROD ? RENDER_WS_URL : 'ws://localhost:8080';
```

`RENDER_WS_URL` is a deliberate placeholder — Task 8 replaces it once the real Render URL is known (see Task 3's checkpoint). Local dev (`npm run dev`) always uses `ws://localhost:8080` regardless, so Tasks 4-7 work fully without this being filled in yet.

- [ ] **Step 4: Create `games/pong/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>Pong Multiplayer — WebGL Portfolio</title>
    <style>
      html, body {
        margin: 0;
        height: 100%;
        overflow: hidden;
        background: #000;
        font-family: sans-serif;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #game-container {
        position: relative;
        width: min(90vw, calc(90vh * 800 / 450));
        height: min(90vh, calc(90vw * 450 / 800));
        touch-action: none;
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
        background: #050505;
      }
      #hud {
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        text-shadow: 0 0 4px #000;
      }
      #overlay {
        position: absolute;
        inset: 0;
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.75);
        text-align: center;
      }
      #overlay.visible {
        display: flex;
      }
      #touch-controls {
        display: none;
        position: fixed;
        right: 16px;
        bottom: 16px;
        flex-direction: column;
        gap: 8px;
        z-index: 10;
      }
      @media (pointer: coarse) {
        #touch-controls {
          display: flex;
        }
      }
      .touch-btn {
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        width: 56px;
        height: 56px;
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .touch-btn:active {
        background: rgba(255, 255, 255, 0.35);
      }
    </style>
  </head>
  <body>
    <div id="game-container">
      <canvas id="viewport" width="800" height="450"></canvas>
      <div id="hud">
        <span id="score">0 — 0</span>
        <span id="status">Connecting…</span>
      </div>
      <div id="overlay">
        <div id="overlay-message"></div>
      </div>
    </div>
    <div id="touch-controls">
      <button class="touch-btn" id="btn-up">▲</button>
      <button class="touch-btn" id="btn-down">▼</button>
    </div>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `games/pong/main.js` (stub)**

```js
console.log('Pong scaffold OK');
```

- [ ] **Step 6: Verify manually**

Run: `npm run dev`, open `/games/pong/`.
Expected: dark page, canvas area, "0 — 0" and "Connecting…" HUD text, console shows `Pong scaffold OK`, no errors. Confirm the root `/` page now shows four cards, and `/games/demo/`, `/games/pacman/`, `/games/invaders/` all still work.

- [ ] **Step 7: Commit**

```bash
git add vite.config.js index.html games/pong/index.html games/pong/config.js games/pong/main.js
git commit -m "chore: scaffold Pong page and add it to the site"
```

---

### Task 5: Client prediction math (TDD)

**Files:**
- Create: `games/pong/predict.js`
- Test: `games/pong/predict.test.js`

**Interfaces:**
- Produces: `predictPaddle(paddle, direction, dt)` (mutates `paddle.y` in place — same formula and constants as `server/physics.js`'s `movePaddle`, kept in sync manually per the Global Constraints), `lerp(current, target, factor)`. Task 7 (`main.js`) imports both.

- [ ] **Step 1: Write the failing tests**

Create `games/pong/predict.test.js`:

```js
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
```

Note: the first test uses the exact same numbers as `server/physics.test.js`'s `movePaddle` test — this is deliberate, confirming the two independent implementations stay in sync.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run games/pong/predict.test.js`
Expected: FAIL — `Cannot find module './predict.js'`.

- [ ] **Step 3: Write the implementation**

Create `games/pong/predict.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run games/pong/predict.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add games/pong/predict.js games/pong/predict.test.js
git commit -m "feat: add client-side paddle prediction and lerp helper"
```

---

### Task 6: Net + renderer (manual verification)

**Files:**
- Create: `games/pong/net.js`
- Create: `games/pong/renderer.js`
- Modify: `games/pong/main.js`

**Interfaces:**
- Consumes: `createProgram` from `engine/core/Shader.js`; `WS_URL` from `config.js` (Task 4).
- Produces: `connect(url, handlers)` → `{ sendInput(direction) }` where `handlers` is `{ onOpen, onMessage, onClose, onError }` (all optional callbacks; `onMessage` receives the parsed JSON message object). `createRenderer(gl)` → `{ drawQuad(x, y, width, height, color) }`. Task 7 uses both.

- [ ] **Step 1: Create `games/pong/net.js`**

```js
export function connect(url, handlers) {
  const socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    if (handlers.onOpen) handlers.onOpen();
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (handlers.onMessage) handlers.onMessage(message);
  });

  socket.addEventListener('close', () => {
    if (handlers.onClose) handlers.onClose();
  });

  socket.addEventListener('error', () => {
    if (handlers.onError) handlers.onError();
  });

  function sendInput(direction) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', direction }));
    }
  }

  return { sendInput };
}
```

- [ ] **Step 2: Create `games/pong/renderer.js`**

```js
import { createProgram } from '../../engine/core/Shader.js';

const VERTEX_SOURCE = `
  attribute vec2 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SOURCE = `
  precision mediump float;
  uniform vec4 uColor;
  void main() {
    gl_FragColor = uColor;
  }
`;

export function createRenderer(gl) {
  const program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  const colorLocation = gl.getUniformLocation(program, 'uColor');
  const buffer = gl.createBuffer();

  function drawQuad(x, y, width, height, color) {
    const canvas = gl.canvas;
    const x0 = (x / canvas.width) * 2 - 1;
    const x1 = ((x + width) / canvas.width) * 2 - 1;
    const y0 = 1 - (y / canvas.height) * 2;
    const y1 = 1 - ((y + height) / canvas.height) * 2;
    const vertices = new Float32Array([x0, y0, x0, y1, x1, y0, x1, y0, x0, y1, x1, y1]);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(colorLocation, color);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { drawQuad };
}
```

No automated tests for either file — real `WebSocket`/WebGL, browser-only. Verified manually in Step 3.

- [ ] **Step 3: Wire a probe into `main.js` and verify manually**

Make sure the Task 2 server is running locally (`cd server && node server.js`). Replace the contents of `games/pong/main.js`:

```js
import { Engine } from '../../engine/core/Engine.js';
import { connect } from './net.js';
import { createRenderer } from './renderer.js';
import { WS_URL } from './config.js';

const canvas = document.querySelector('#viewport');
const statusEl = document.querySelector('#status');

let drawQuad;

function update() {}

function render(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  drawQuad(20, 185, 12, 80, [1, 1, 1, 1]);
  drawQuad(394, 219, 12, 12, [1, 1, 1, 1]);
}

const engine = new Engine({ canvas, update, render });
({ drawQuad } = createRenderer(engine.gl));
engine.start();

connect(WS_URL, {
  onOpen: () => {
    statusEl.textContent = 'Connected';
  },
  onMessage: (message) => {
    console.log('received:', message);
  },
});
```

Run: `npm run dev`, open `/games/pong/` in two browser tabs.
Expected: both tabs show a static white paddle rectangle and a white square (ball) at center court, no console errors. Status text shows "Connected" once the WebSocket opens. DevTools console logs each received message (`waiting` in the first tab alone, then `matched` in both once the second tab connects, then a stream of `state` messages).

- [ ] **Step 4: Commit**

```bash
git add games/pong/net.js games/pong/renderer.js games/pong/main.js
git commit -m "feat: add Pong WebSocket client and quad renderer"
```

---

### Task 7: Full game wiring (input, prediction, interpolation, HUD) — milestone completion

**Files:**
- Modify: `games/pong/main.js`

**Interfaces:**
- Consumes: `Engine` (`engine/core/Engine.js`); `connect` (Task 6, `net.js`); `predictPaddle`, `lerp` (Task 5, `predict.js`); `createRenderer` (Task 6, `renderer.js`); `WS_URL` (Task 4, `config.js`).
- Produces: nothing consumed by later tasks — terminal client deliverable.

- [ ] **Step 1: Replace `games/pong/main.js` with the full game**

```js
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

const socket = connect(WS_URL, {
  onOpen: () => setStatus('Connected'),
  onMessage: (message) => {
    if (message.type === 'waiting') {
      setStatus('Waiting for an opponent…');
    } else if (message.type === 'matched') {
      mySide = message.side;
      setStatus(`Playing as ${mySide}`);
    } else if (message.type === 'state') {
      latestState = message;
      updateScore(message.score);
    } else if (message.type === 'gameover') {
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
```

- [ ] **Step 2: Verify manually — full two-tab match against the local server**

Make sure `cd server && node server.js` is running. Run `npm run dev`, open `/games/pong/` in two separate browser tabs (or one normal + one incognito window, to be safe about any shared state):
- Confirm the first tab shows "Waiting for an opponent…"; once the second tab connects, both show "Playing as left"/"Playing as right".
- Move your paddle with Up/Down (or W/S): it should respond instantly (prediction), not wait for a round trip.
- Confirm the ball moves, bounces off walls and paddles, and that hitting off-center visibly changes its angle.
- Score a point (let the ball pass a paddle): confirm the score HUD updates in both tabs and the ball re-serves from center.
- Play to 5 points: confirm the winning tab shows "You Win!" and the other shows "You Lose", both with "Reload to play again."
- Close one tab mid-match (before 5 points): confirm the other tab shows "Opponent disconnected. Reload to play again."

- [ ] **Step 3: Run the full automated test suite**

Run: `npm test` (root) → expects 43 existing tests plus this plan's 3 `predict.js` tests, all green (46 total). Run: `cd server && npm test` → expects the 8 `physics.js` tests green, separately (server has its own test runner, not part of the root `npm test`).

- [ ] **Step 4: Commit**

```bash
git add games/pong/main.js
git commit -m "feat: wire full Pong gameplay — prediction, interpolation, matchmaking UI"
```

---

### Task 8: Fill in the real Render URL and verify end to end

**Files:**
- Modify: `games/pong/config.js`

**Interfaces:** none — terminal deliverable.

**Prerequisite:** Task 3's checkpoint must be resolved — the controller must have the real Render URL from the user before starting this task.

- [ ] **Step 1: Replace the placeholder in `games/pong/config.js`**

```js
const RENDER_WS_URL = 'wss://<the-real-url-from-task-3>.onrender.com';

export const WS_URL = import.meta.env.PROD ? RENDER_WS_URL : 'ws://localhost:8080';
```

Use the exact host the user reported from the Render dashboard, with the `wss://` scheme (not `https://` — this is a WebSocket URL).

- [ ] **Step 2: Build and verify the production bundle points at the right URL**

Run: `npm run build`
Then check: `grep -o "wss://[^\"']*" dist/assets/pong-*.js` (or open the built file) — confirm the real Render host appears in the bundled output, not `REPLACE-WITH-RENDER-URL`.

- [ ] **Step 3: Commit and push**

```bash
git add games/pong/config.js
git commit -m "chore: point Pong client at the deployed Render server"
git push origin master
```

This push triggers the existing GitHub Pages deploy workflow automatically (already set up for the other three games — no changes needed to `.github/workflows/deploy.yml`).

- [ ] **Step 4: Verify end to end against the live deployment**

Wait for the GitHub Actions deploy to finish (`gh run list --limit 1`), then open `https://skauron.github.io/webgl-game-portfolio/games/pong/` in two browser tabs (or two devices) and play a full match, same checks as Task 7 Step 2, but now against the real deployed Render server instead of localhost. Note: Render's free tier sleeps after inactivity — the first connection after a while may take 30-60s to establish while the server wakes up; this is expected, not a bug.
