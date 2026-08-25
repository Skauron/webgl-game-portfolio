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

**Live verification — done 2026-08-25.** The static audit below was
reasoned from reading the render loops; this section confirms it against
actual runtime numbers. Chrome DevTools/Spector.js as browser extensions
weren't available in the sandboxed environment used for this pass, so
verification used an equivalent instrumentation approach instead: wrapping
`WebGLRenderingContext.prototype.drawArrays` / `useProgram` / `bufferData`
to count real calls per frame, sampled over ~110-140 frames of actual
gameplay per game (Pacman: post-restart, maze fully rendering; Invaders:
idle formation plus some fire/explosion spikes; Pong: a live two-tab match
against itself, server-authoritative, mid-rally). This measures the exact
same thing Spector.js's per-frame call list would show — every GL call the
render loop actually issues — just via direct instrumentation rather than
the extension's UI. Numbers below are `drawArrays` calls per frame
(steady-state average, with the observed max where it differs):

| Game | Predicted (static audit) | Measured (live) | Verdict |
|---|---|---|---|
| Pacman | ~2 for the batched maze, more for player/ghosts | 5/frame steady | Confirms the batch worked — maze batching removed the ~143-call cost; the remaining 5 is player + ghosts drawn individually, as expected (never batched, out of scope) |
| Space Invaders | ~1 for the batched formation, more for player/barriers/bullets | 6.6/frame avg, spikes to 15 during fire/explosions | Confirms the formation batch; the max-15 spike is real particle draws (explosions), not a regression — matches the design (particles were never meant to be batched) |
| Pong | ~15-20/frame predicted, judged not worth batching | 11/frame in a live rally | Came in under the estimate — confirms the "audited, left as-is" call was correct: even under real two-player load it's well within budget, batching would have been solved-problem effort |

This is the before/after portfolio reviewers can ask for: the numbers in
this table came from watching the actual instrumented games run, not
estimated from source.

### Spector.js captures

The instrumentation numbers above are corroborated by an actual Spector.js
capture per game — the real tool named in the requirements above, captured
after the instrumentation pass. Each screenshot shows Spector.js's full GL
command list for one captured frame, with a stack trace confirming the
calls originate from this repo's own render code:

- [`spector-pacman.png`](screenshots/spector-pacman.png) — 96 total GL
  commands in the captured frame (draw calls, buffer/uniform updates, state
  changes combined — not just `drawArrays`).
- [`spector-invaders.png`](screenshots/spector-invaders.png) — 75 total GL
  commands; stack trace resolves to `games/invaders/main.js:231` →
  `engine/core/GameLoop.js:10`.
- [`spector-pong.png`](screenshots/spector-pong.png) — 112 total GL
  commands, captured mid-match against a live opponent; stack trace
  resolves to `games/pong/main.js:161` → `engine/core/GameLoop.js:10` →
  `engine/core/GameLoop.js:32`.

These totals count every GL API call Spector.js logged for the frame
(`useProgram`, `bindBuffer`, `bufferData`, `drawArrays`, etc.), not just
draw calls, so they're a larger number than the per-frame `drawArrays`
counts in the table above — the two metrics measure different things, both
real.

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
