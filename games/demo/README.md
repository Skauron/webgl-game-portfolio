# Engine v0 Demo

Smoke test for the hand-rolled engine — proves the raw WebGL pipeline end to
end before any game logic exists: context creation → shader compile/link →
buffer upload → draw call → pixels on screen.

**Play:** fullscreen canvas, one flat-color triangle. Nothing to interact
with — this is a pipeline check, not a game.

## What it demonstrates

- Raw `WebGLRenderingContext`/`WebGL2RenderingContext` setup with no
  framework (`engine/core/GLContext.js`) — requests `webgl2`, falls back to
  `webgl`, throws loudly if neither exists.
- Manual GLSL vertex/fragment shader compilation and linking, with driver
  error logs surfaced on failure instead of swallowed
  (`engine/core/Shader.js`).
- A `requestAnimationFrame`-driven game loop with `update`/`render` split
  (`engine/core/GameLoop.js`), reused by every later game in this repo.
- Direct vertex buffer upload and a single `drawArrays` call — no scene
  graph, no abstraction over the GL calls.

## Architecture

`engine/core/Engine.js` is the composition root: it wires a canvas plus a
game's `update`/`render` callbacks into `GLContext` + `GameLoop` and starts
the loop. Every other game in this portfolio (Pacman, Space Invaders, Pong)
builds on this same base instead of duplicating the pipeline.

## Testing

GPU-bound code (`GLContext`, the draw call itself) isn't meaningfully
unit-testable without a real browser context — verified manually by running
the game and confirming the triangle renders. Pure logic that doesn't touch
`gl` — `GameLoop`'s timing and `Shader`'s compile/link/error branches — has
real unit tests against a mocked `gl` object
(`engine/core/GameLoop.test.js`, `engine/core/Shader.test.js`). This split
(GPU code manual, pure logic unit-tested) is the rule for the whole repo.

## Run locally

```bash
npm install
npm run dev
```
Open `/games/demo/`.

## Built with Claude Code

Spec'd and implemented with Claude Code (Anthropic) using a
brainstorm → design spec → implementation plan → per-task subagent
workflow, with an independent code-review pass before merge. Full spec:
[`docs/superpowers/specs/2026-08-24-engine-v0-design.md`](../../docs/superpowers/specs/2026-08-24-engine-v0-design.md).
