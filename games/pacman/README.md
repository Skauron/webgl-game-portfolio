# Pacman

First playable game in the portfolio — a simplified Pacman clone (smaller
13×11 map, no power pellets, simple random-walk ghosts) built on the
hand-rolled engine from `engine/core/`.

**Controls:** arrow keys or WASD. Eat every pellet to win; 3 lives, losing
all of them ends the game.

## What it demonstrates

- First real GLSL effect beyond a flat triangle: pellets pulse brightness
  via a `uTime` uniform in the shared quad shader — a genuine, if small,
  shader-driven visual (`games/pacman/renderer.js`).
- One shared shader program for every draw (walls, pellets, ghosts,
  player), toggled per-call via uniforms instead of switching programs —
  the pattern every later game in this repo reuses and extends.
- Grid-continuous movement: entities track a cell, a facing direction, and
  a sub-cell progress fraction, with input buffered and only applied at
  cell centers (`games/pacman/player.js`, `games/pacman/movement.js`).
- Simple ghost AI: at each intersection, pick a uniformly random valid
  direction, excluding reversal unless it's the only option
  (`games/pacman/ghost.js`), with the random source injectable so behavior
  is deterministic under test.
- No camera/projection matrices — deliberately out of scope here. The view
  is static and full-screen, so grid → pixel → NDC is direct arithmetic.
  (Matrix-based transforms get pulled in only when a game actually needs
  them, per this repo's build order.)

## Architecture

`games/pacman/main.js` is the single source of truth for game state (maze
grid, player, ghosts) and drives everything through the shared `Engine`.
`maze.js` owns pure grid logic (wall checks, pellet bookkeeping, a
flood-fill connectivity check on the hardcoded layout) with zero rendering
or DOM code — `renderer.js` reads that state, it never mutates it. Score,
lives, and Game Over/Victory are an HTML/CSS overlay outside the canvas
(text-in-WebGL needs a font atlas, out of scope for this milestone) — the
actual maze, player, and ghosts are 100% WebGL.

## Testing

Pure logic is unit-tested: maze connectivity/pellet logic (`maze.test.js`),
player turning/movement (`player.test.js`), ghost direction choice under an
injected fake RNG (`ghost.test.js`). Rendering, DOM overlay, and keyboard
wiring are manual-only — run the game and play a full round.

## Run locally

```bash
npm install
npm run dev
```
Open `/games/pacman/`. Touch controls (on-screen d-pad) appear automatically
on coarse-pointer (mobile) devices.

## Built with Claude Code

Spec'd and implemented with Claude Code (Anthropic) using a
brainstorm → design spec → implementation plan → per-task subagent
workflow (fresh subagent per task, reviewed before merge). Full spec:
[`docs/superpowers/specs/2026-08-24-pacman-design.md`](../../docs/superpowers/specs/2026-08-24-pacman-design.md).
