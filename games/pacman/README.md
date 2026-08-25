# Pacman

First playable game in the portfolio — a simplified Pacman clone (smaller
13×11 map, no power pellets, simple random-walk ghosts) built on the
hand-rolled engine from `engine/core/`.

**Controls:** arrow keys or WASD. Eat every pellet to win; 3 lives, losing
all of them ends the game.

## What it demonstrates

- Pellets: a real per-fragment radial gradient, not just a color pulse — a
  second attribute (`aLocal`, quad-local -1..1 coordinates) feeds a
  `smoothstep`-based falloff in the fragment shader (`uGlow` toggle),
  giving each pellet a bright core fading to its edge, still animated by
  the existing `uTime` pulse. Walls/ghosts/player use the same shader with
  the toggle off, so it's zero-cost when unused (`games/pacman/renderer.js`).
- One shared shader program for every draw (walls, pellets, ghosts,
  player), toggled per-call via uniforms instead of switching programs —
  the pattern every later game in this repo reuses and extends.
- Getting caught by a ghost spawns a particle burst at the player's
  position — the same reusable `engine/core/particles.js` +
  `engine/core/ParticleRenderer.js` system Space Invaders uses for its
  explosions, configured here with a white/yellow palette and a smaller,
  gentler burst instead of Invaders' fiery one. One particle system, two
  different looks, purely from its config.
- Grid-continuous movement: entities track a cell, a facing direction, and
  a sub-cell progress fraction, with input buffered and only applied at
  cell centers (`games/pacman/player.js`, `games/pacman/movement.js`).
- Simple ghost AI: at each intersection, pick a uniformly random valid
  direction, excluding reversal unless it's the only option
  (`games/pacman/ghost.js`), with the random source injectable so behavior
  is deterministic under test.
- The maze/wall/pellet/ghost/player rendering still uses direct grid →
  pixel → NDC arithmetic, no projection matrix — the view is static and
  full-screen, so it doesn't need one. The particle burst's renderer does
  use a real orthographic projection matrix internally (`engine/core/mat4.js`),
  inherited from the shared particle system.

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
