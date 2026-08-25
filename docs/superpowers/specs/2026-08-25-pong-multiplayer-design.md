# Pong Multiplayer (Game #3) — Design Spec

## Context

Fourth build in the WebGL portfolio, and the first to go beyond the
`CLAUDE.md` build plan's core milestones — it demonstrates the posting's
explicit "nice to have" (WebSockets, client-side prediction, state sync)
rather than a required milestone. Unlike the first three games, this one
needs a real backend: a small authoritative Node WebSocket server, deployed
separately from the static GitHub Pages portfolio.

## Decisions

- **Repo layout:** same repo, two new top-level pieces — `server/` (a
  separate, independently deployable Node package with its own
  `package.json`) and `games/pong/` (client, wired into the existing Vite
  multi-page build exactly like `demo`/`pacman`/`invaders`).
- **Transport:** raw `ws` (npm package) on the server — the one real
  dependency `server/` has. No Socket.io or similar framework: the point is
  to demonstrate raw WebSocket usage, and a framework would hide it, same
  reasoning as "no game framework" for the client games. Messages are JSON.
- **Authority model:** the server runs the only real simulation, at a fixed
  30 Hz tick, and is the sole source of truth for ball position/velocity,
  both paddle positions, and score. Clients never decide outcomes — they
  predict for responsiveness, but a client's own view of its paddle is
  always subject to server correction.
- **Client-side prediction:** each client predicts only its own paddle's
  movement locally, immediately on input, using the same movement physics
  as the server (instant response instead of a round-trip's worth of
  latency). The opponent's paddle and the ball are never predicted —
  they're smoothed (interpolated toward the latest server snapshot) since
  the client has no input to predict them from. If the server's authoritative
  position for the local player's paddle drifts from the local prediction
  (e.g. a wall clamp happens fractionally differently), the client
  smoothly corrects toward the server value rather than snapping — this is
  the reconciliation step. Full input-buffering-and-replay reconciliation
  (the technique competitive shooters use) is explicitly out of scope —
  Pong's paddle state is a single 1D value, and that level of machinery
  would be pure over-engineering for it.
- **Matchmaking:** intentionally minimal — the server holds at most one
  active match at a time. A new connection is either paired immediately (if
  exactly one other client is already waiting) or queued (FIFO) until the
  current match ends. This is a portfolio demo, not a matchmaking service;
  scaling to concurrent matches is explicitly out of scope.
- **Reconnection:** none. If a player's WebSocket closes mid-match, the
  match ends immediately and the remaining player is notified. No
  auto-reconnect, no session resumption — "reload the page" is the
  recovery path, consistent with keeping this small and finished rather
  than building resilience nobody asked for.
- **Server-side testing:** Node's built-in `node:test` module, not Vitest —
  `server/` is a separate deployable package and this keeps its dependency
  list to exactly `ws`. Client-side pure logic still uses the existing
  Vitest setup (same `npm test` as the rest of the repo).
- **Deploy:** Render (free tier), via a `render.yaml` blueprint checked
  into the repo pointing at the `server/` directory — reproducible deploy
  config, not a manually-clicked dashboard setup. The client needs the
  deployed server's `wss://` URL, which isn't known until the first deploy
  completes — that URL is filled in as a manual step after Render assigns
  it (tracked explicitly in the implementation plan, not guessed at now).

## Game Rules & Constants

- Court: 800×450 logical units (the server's simulation space; the client
  renders this scaled to fit the viewport, same responsive approach as the
  other two games).
- Paddles: 12×80, positioned 20 units in from each side wall, move
  vertically only, clamped to the court's top/bottom edges. Speed: 300
  units/sec.
- Ball: 12×12, starts centered, serves in a random diagonal direction at
  300 units/sec. Bounces off top/bottom walls (reflect Y). On paddle
  contact: reflect X, and adjust Y velocity based on where on the paddle it
  hit (offset from the paddle's center, normalized to -1..1, scaled into
  the outgoing angle) — this is the one deliberately "non-trivial" physics
  touch, giving the player some control over return angle, like the
  original arcade game. Speed increases 20 units/sec per paddle hit,
  capped at 600, then resets to 300 on the next serve.
- Scoring: ball passing a side wall scores the other player a point and
  re-serves from center. First to 5 points wins; server then returns both
  clients to matchmaking (or ends the match with a game-over message, and
  each client can trigger a fresh connection to requeue — exact UX for
  "play again" is an implementation-plan detail, not fixed here beyond
  "the server is ready to matchmake again immediately").
- Tick rate: server simulates and broadcasts at 30 Hz.

## Wire Protocol (JSON over WebSocket)

**Client → Server**
- `{type: "input", direction: -1 | 0 | 1}` — sent once per direction
  change (on keydown/keyup or touch start/end), not every frame. `-1` =
  up, `1` = down, `0` = stop.

**Server → Client**
- `{type: "waiting"}` — sent on connect if no immediate opponent is
  available.
- `{type: "matched", side: "left" | "right"}` — sent once paired; tells
  the client which paddle it controls.
- `{type: "state", tick, ball: {x, y}, paddles: {left, right}, score: {left, right}}`
  — sent every tick to both players in the active match.
- `{type: "gameover", winner: "left" | "right"}` — sent once a player
  reaches the win score; the match ends server-side.
- `{type: "opponent-left"}` — sent to the remaining player if the other
  side's connection closes mid-match.

## Components

### `server/physics.js`
Pure simulation functions, no networking, no timers: `movePaddle(paddle,
direction, dt)` (clamped), `moveBall(ball, dt)`, `resolveWallBounce(ball)`,
`resolvePaddleCollision(ball, paddle)` (the angle-based reflection
described above), `checkScoring(ball)` → which side scored, if any. These
are what `server/match.js`'s tick loop calls each step, and what
`node:test` exercises directly with no server/socket involved.

### `server/match.js`
Owns one match's mutable state (both paddles, ball, score, the two
WebSocket connections) and the fixed-tick loop (`setInterval` at 1000/30
ms) that calls `physics.js` functions each tick and broadcasts the
resulting `state` message. Applies incoming `input` messages to the
correct paddle's direction. Detects the win condition and disconnect,
emitting `gameover`/`opponent-left` and tearing itself down.

### `server/server.js`
Entry point: creates the `ws` server, holds the matchmaking queue (at most
one waiting connection, at most one active `Match`), pairs connections into
a new `Match` when possible, and hands each new connection either a
`waiting` message or a `matched` message.

### `games/pong/net.js`
Client-side WebSocket wrapper: connects, sends `input` messages, exposes
the latest received message to the caller via a callback (or a small
event-emitter-shaped API — implementation detail for the plan). No
automated test — real `WebSocket`, browser-only.

### `games/pong/predict.js`
Pure logic, no DOM/network: given a local paddle's current predicted
position, a direction, and `dt`, compute the next predicted position using
the *same* movement/clamping math as `server/physics.js`'s `movePaddle`
(duplicated intentionally — client and server are genuinely different
runtimes/files, so this is parallel implementation of the same formula,
not a shared module; keeping the formula identical is what makes
prediction accurate). Also exposes a generic `lerp(current, target,
factor)` helper used both for reconciling the local paddle toward the
server's authoritative value and for smoothing the opponent paddle/ball
toward the latest snapshot. Fully unit-testable.

### `games/pong/renderer.js`
Flat-color quads via one shared shader — same pattern as
`games/pacman/renderer.js` (no textures needed here). No automated test —
real WebGL.

### `games/pong/main.js`
Composition root: connects via `net.js`, reads keyboard (Up/Down or W/S)
and touch input (reusing the touch-button pattern from Pacman/Invaders),
drives local prediction/reconciliation each frame, and renders the court,
both paddles, the ball, score, and connection-status overlay ("Waiting for
an opponent…", "Opponent disconnected", "You win!"/"You lose!"). No
automated test — DOM/network/WebGL composition.

## Data Flow

**Client:** input change → (a) sent to server via `net.js`, (b) fed into
`predict.js` for the local paddle's immediate movement. Every render
frame: draw the local paddle at its predicted (and continuously
reconciled) position; draw the opponent paddle and ball at positions
smoothed toward the most recent `state` snapshot; draw score/status from
the same snapshot.

**Server:** `input` message → update that connection's stored direction.
Each tick (30 Hz): `match.js` calls `physics.js` to advance paddles/ball,
checks scoring/win condition, broadcasts the resulting `state` (or
`gameover`) to both connections in the match.

## Error Handling

A WebSocket closing (either side) mid-match ends that match immediately;
the surviving connection (if any) receives `opponent-left` and returns to
the matchmaking queue. No reconnection support, no session/state
persistence across a dropped connection — consistent with "reload to
recover" being an acceptable, explicitly small-scope answer here. Server
crashes are not specially handled (Render restarts the process; in-flight
matches are simply lost) — acceptable for a portfolio demo, not a
production service.

## Testing

Same split as every prior game in this repo: pure logic gets real unit
tests, anything touching a network socket, a timer-driven loop, WebGL, or
the DOM is manual-only.

- **Unit-tested:** `server/physics.js` (paddle clamping, wall bounce,
  paddle-collision angle reflection, scoring detection) via `node:test`.
  `games/pong/predict.js` (local prediction math, the `lerp` helper) via
  Vitest, added to the existing `npm test` run.
- **Manual-only:** `server/match.js`, `server/server.js` (real timers,
  real `ws` connections — verified by running the server locally and
  connecting two browser tabs, then again against the deployed Render
  instance), `games/pong/net.js`, `renderer.js`, `main.js` (real
  WebSocket/WebGL/DOM). Full validation: two browser tabs/devices play a
  complete match to 5 points, including a forced disconnect (closing one
  tab) to confirm the `opponent-left` path.

## Out of Scope

- Reconnection/session resumption after a dropped connection.
- Concurrent matches / real matchmaking (room codes, multiple simultaneous
  games).
- Full input-buffering client reconciliation (competitive-shooter-grade
  netcode) — the lighter lerp-based reconciliation described above is the
  deliberate, right-sized choice for Pong.
- Spectator mode for queued/extra connections beyond a simple "waiting"
  status.
- Persistent stats, accounts, or match history.
