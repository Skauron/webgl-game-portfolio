# Pong Multiplayer

Real-time two-player Pong over raw WebSockets — goes beyond the core
portfolio milestones to demonstrate the job posting's "nice to have":
multiplayer, state sync, client-side prediction. Server-authoritative,
30Hz simulation, deployed separately from the static GitHub Pages site
(the static host can't run a WebSocket server).

**Controls:** Up/Down or W/S. First to 5 points wins. If no opponent is
waiting yet, you're queued until one connects. The server free-tier cold
starts (up to ~60s) after inactivity — the client shows a "waking the
server" message rather than looking frozen.

## What it demonstrates

- Raw `ws` (npm) on the server — no Socket.io. Server holds the only real
  simulation, fixed 30Hz tick, JSON messages over the socket
  (`server/match.js`, `server/server.js`).
- Client-side prediction, right-sized: each client predicts *only its own
  paddle*, instantly on input, using the exact same movement formula as the
  server (`games/pong/predict.js` deliberately duplicates
  `server/physics.js`'s `movePaddle` — genuinely separate runtimes, kept
  in sync by matching the formula, not by sharing a module).
- Reconciliation via lerp, not input replay: if the server's authoritative
  paddle position drifts from the local prediction, the client smoothly
  corrects toward it rather than snapping. The opponent's paddle and the
  ball are never predicted — only smoothed toward the latest server
  snapshot, since the client has no input to predict them from. Full
  input-buffer-and-replay netcode (competitive-shooter grade) was
  deliberately skipped — over-engineered for a single 1D paddle value.
- Angle-based paddle physics: ball return angle depends on where it hits
  the paddle (offset from center, normalized, scaled into outgoing
  velocity) — the one non-trivial physics touch, matching the original
  arcade's feel (`server/physics.js`).
- FIFO matchmaking: at most one active match; a new connection is paired
  immediately or queued. No reconnection — a dropped socket ends the match
  and the peer is notified (`opponent-left`), by design (small and
  finished over resilience nobody asked for).
- Ball glow + trail: a second shader (`games/pong/glowRenderer.js`) applies
  a real orthographic projection matrix (`engine/core/mat4.js`, the same
  technique used for Invaders' explosions, now in a second game). The
  renderer has two looks controlled by a `uHard` toggle: a `smoothstep`
  radial falloff across the whole radius for the soft neon halo and the 6
  fading afterimage quads trailing the ball, and a hard `step` boundary for
  the ball itself — a full-radius fade there read as an undefined blur
  rather than a defined circle, so the ball is a crisp hard-edged disc
  drawn on top of a dimmer, larger soft-glow quad behind it for the aura.
  The trail is cleared instead of drawn across the frame a point is scored
  (detected client-side as a position jump too large to be real movement),
  so a re-serve doesn't draw a streak across the whole court.
- Serve countdown: the server freezes the ball (paddles can still move) for
  3 seconds before the first serve and before every re-serve after a point,
  broadcasting the remaining whole seconds as a `countdown` field on each
  `state` message (`server/match.js`). The client just renders that number
  full-screen — since the ball's position is genuinely frozen server-side
  during the countdown, the client's normal lerp-toward-server-state logic
  holds it still with no extra client-side pause logic needed.
- Paddle-hit sparks: `server/match.js` now reports which side (if any)
  `resolvePaddleCollision` actually hit that tick as a `paddleHit` field on
  the `state` message, and the client spawns a spark burst there using the
  same reusable `engine/core/particles.js` system Invaders and Pacman use.
  This replaced an earlier client-side heuristic that inferred a hit from
  the ball's x-direction reversing near a paddle line — it worked for the
  left paddle but silently never fired for the right one: the collision
  snap-back repositions the ball just outside the paddle, and whether that
  snap itself reads as a same-tick direction reversal (vs. one tick later,
  by which point the ball had already moved back outside the detection
  margin) depends on the snap geometry, which isn't symmetric between the
  two paddles. Rather than tune the margin further, the server now reports
  the real event directly — no heuristic, no asymmetry possible.

## Architecture

`server/` is a separate deployable Node package (its only real dependency
is `ws`), deployed to Render via the checked-in `render.yaml` blueprint.
`server/physics.js` is pure simulation with no networking or timers —
`server/match.js` is the only thing that calls it, once per tick, and
broadcasts the result. On the client, `games/pong/main.js` wires
`net.js` (WebSocket transport) to `predict.js` (local prediction/lerp) and
`renderer.js` (flat-quad WebGL, same shader pattern as Pacman) each frame.

## Testing

`server/physics.js` (paddle clamping, wall bounce, paddle-collision angle
reflection, scoring) is unit-tested with Node's built-in `node:test` —
kept separate from the root Vitest suite so `server/`'s dependency list
stays at just `ws`. `games/pong/predict.js` (local prediction math, the
`lerp` helper) is unit-tested with the existing Vitest suite
(`npm test`). Real sockets, timers, WebGL, and DOM are manual-only:
verified with two browser tabs playing a full match to 5 points, plus a
forced disconnect to confirm the `opponent-left` path, against both a
local server and the deployed Render instance.

## Run locally

```bash
npm install
npm run dev          # client, in one terminal
cd server && npm install && node server.js   # server, in another
```
Open `/games/pong/` in two tabs to play against yourself locally. The
deployed build points at the Render server URL in `games/pong/config.js`.

## Built with Claude Code

Spec'd and implemented with Claude Code (Anthropic): brainstorm → design
spec → implementation plan → per-task subagent workflow, plus a final
whole-branch review before merge. Two bugs worth naming from that review:
a crash where a malformed WebSocket message (`JSON.parse` returning `null`)
threw uncaught and killed the whole match for both players, and a
game-over message that omitted the final score — both caught in review and
fixed at the source before merge. Deploying the server itself (Render
dashboard steps) was a human checkpoint the automated workflow explicitly
paused for, rather than something a subagent could complete. Full spec:
[`docs/superpowers/specs/2026-08-25-pong-multiplayer-design.md`](../../docs/superpowers/specs/2026-08-25-pong-multiplayer-design.md).
