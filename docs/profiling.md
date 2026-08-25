# Profiling & Optimization Pass

Milestone 5 of the portfolio build plan (`CLAUDE.md`): audit the four games'
render loops for real performance bottlenecks, fix the ones worth fixing,
and document why the rest weren't touched. Written after all four games
shipped — this is a review pass, not a rewrite.

## Methodology

**Static audit (done here, in code):** for each game, count how many WebGL
state changes and draw calls a single frame issues — `gl.useProgram`,
`gl.bufferData`, `gl.drawArrays` — by reading the render loop and the
renderer it calls into. This is the same first step a real profiling
session starts with: know what the code is *supposed* to be doing before
reaching for a tool to confirm it.

**Live verification (Chrome DevTools + Spector.js — not yet done, do this
yourself):** static analysis tells you what *should* be slow; a real GPU
capture is what actually confirms it. The optimizations below were
reasoned from reading the render loops, not from a live trace — no browser
tooling was available while writing this pass. Before/after screenshots
from your own capture are what would make this claim verifiable for a
portfolio reviewer, so it's worth actually doing:

1. **Chrome DevTools → Performance panel:** open a game, hit record, play
   for a few seconds, stop. Look at the "GPU" and "Main" tracks — a healthy
   frame here should stay well under the 16.6ms budget (60fps). Long yellow
   "Scripting" bars pointing at `drawArrays`/`bufferData` calls are the
   signal to look for.
2. **Spector.js** (browser extension, [spector.babylonjs.com](https://spector.babylonjs.com/)):
   capture a single frame and it lists every GL call issued, in order, with
   timings — this is the direct way to *count* draw calls and state changes
   per frame rather than estimate them from source, and to see the actual
   vertex/uniform data each call uploaded.
3. Compare a capture from before this pass's changes against one from
   after, for Space Invaders and Pacman specifically — the draw-call count
   per frame should drop the way the audit below predicts.

## Per-game audit

| Game | Before | Bottleneck found | Action |
|---|---|---|---|
| Engine v0 Demo | 1 draw call/frame | None — a single static triangle | No change |
| Pacman | up to ~143 draw calls/frame | Maze walls (77 cells) + pellets (up to 63) each issued their own `gl.useProgram` + `gl.bufferData` + `gl.drawArrays`, every frame, for geometry that's almost entirely static | **Batched** — see below |
| Space Invaders | up to ~30 draw calls/frame | The 5×5 invader formation issued one full textured draw call per alive invader (up to 25), all sharing the same shader, texture, and color | **Batched** — see below |
| Pong | ~15-20 draw calls/frame | Paddles, ball, trail, sparks — already few enough, and each is either a single quad or a lightweight particle draw (uniform updates only, no per-draw buffer re-upload) | Audited, no change — see below |

Pacman turned out to be the biggest offender, not Space Invaders — the
maze grid is small (13×11) but almost every cell is a wall or a pellet, so
the naive "one draw call per cell" approach scales worse there than the
invader formation's 25 sprites.

## Optimizations applied

### Pacman: batch the maze into two draw calls

`games/pacman/renderer.js` drew every wall and pellet cell with its own
`drawQuad` call — up to 143 separate `gl.useProgram` + `gl.bufferData` +
`gl.drawArrays` sequences a frame, for geometry that's static except when
a pellet is eaten. Added `drawQuadBatch(quads, color, options)`: builds one
big vertex buffer covering every quad in the group and issues a single
`gl.drawArrays` for all of them. This only works within a group that
shares one color/pulse setting (the shader takes `uColor` as a uniform,
not a per-vertex attribute), so walls and pellets are still two separate
batches — but that's **143 draw calls down to 2** for the maze, regardless
of how many cells it has.

`games/pacman/main.js`'s `render()` now collects wall cells and pellet
cells into two arrays first, then calls `drawQuadBatch` once per array,
instead of calling `drawQuad` inline inside the grid loop.

### Space Invaders: batch the invader formation into one draw call

`games/invaders/renderer.js` drew each alive invader with its own
`drawSprite` call — up to 25 separate textured draw calls a frame, all
sharing the same shader, texture, and default color. Added
`drawSpriteBatch(sprites, color)`: same idea as Pacman's batch, but for
textured sprites (position *and* UV per vertex, since each invader samples
a different atlas cell). **Up to 25 draw calls down to 1** for the whole
formation. Bullets, the player, and barriers are still drawn individually
— there are only 1-3 of each, and the player needs its own per-draw color
for the hit-flash, so batching them wouldn't pay for itself.

### Pong: audited, left as-is

Pong's worst case is roughly 15-20 draw calls a frame (2 paddles, up to 6
trail-glow quads, 2 ball-glow quads, up to 8 spark particles), and none of
them re-upload a full vertex buffer per draw the way Pacman's and
Invaders' per-cell/per-sprite draws did — the particle and glow renderers
bind a **static** offset buffer once at creation and only update small
uniforms (position, alpha, color) per draw. Batching would save a handful
of `gl.useProgram` calls at most, for code that's already simple and
correct. Not worth the added complexity at this scale — a real judgment
call, not an oversight.

## What this doesn't cover

This pass looked at draw-call/state-change count, the most common
beginner-WebGL bottleneck and the one most visible from reading the code
without a GPU trace. It didn't profile texture memory, shader compile
time, or JS-side allocation churn (e.g. the `Float32Array` built fresh per
batched draw call) — none of these four games are anywhere near large
enough for those to matter, but a bigger project would need to.
