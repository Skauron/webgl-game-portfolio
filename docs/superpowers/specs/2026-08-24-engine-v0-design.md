# Engine v0 — Design Spec

## Context

First milestone of the WebGL game portfolio build (see `CLAUDE.md`). Goal: raw
WebGL contact — canvas/context setup, a game loop with update/render split, one
basic draw call on screen. No frameworks (Three.js, Babylon, Phaser). No
TypeScript, no build step beyond serving files.

## Decisions

- **Language:** plain JavaScript (ES modules). No TypeScript — raw WebGL stays
  literal, no build-step indirection.
- **Dev tooling:** Vite, default config (multi-page via `rollupOptions.input`
  pointing at each game's `index.html`). Vite only serves/bundles files, does
  not abstract WebGL calls.
- **Repo structure:** monorepo.
  - `/engine` — shared engine code, framework-agnostic of any single game.
  - `/games/<name>` — one folder per game, each with its own `index.html` and
    `main.js` entry point that imports from `/engine`.

## Components (Engine v0)

### `engine/core/GLContext.js`
Takes a `<canvas>` element, requests a `webgl2` context with `webgl` as
fallback. Throws if neither is available (no silent degradation — a portfolio
piece demonstrating WebGL expertise should fail loudly, not limp along).
Exposes the raw `gl` context; no wrapper/abstraction layer over WebGL calls.

### `engine/core/Shader.js`
Minimal helper for the compile/link boilerplate every WebGL program needs:
- Compile a vertex shader and fragment shader from source strings.
- Link them into a program.
- Check compile/link status; on failure, throw with the driver's info log
  (`gl.getShaderInfoLog` / `gl.getProgramInfoLog`).

### `engine/core/GameLoop.js`
Runs a loop via `requestAnimationFrame`, separating:
- `update(dt)` — game logic step, receives delta time in seconds.
- `render()` — draw step, no logic.
Exposes `start()` / `stop()`.

### `engine/core/Engine.js`
Composition root: takes a canvas element plus `update`/`render` callbacks from
the consuming game, wires up `GLContext` and `GameLoop`, starts the loop.

## Demo (`games/demo/`)

Not a game — a smoke test for the pipeline. Fullscreen canvas, a single
solid-color triangle drawn via a raw vertex buffer + minimal shader pair.
Proves: context creation → shader compile/link → buffer upload → draw call →
pixels on screen, end to end.

## Data Flow

`games/demo/main.js` creates a canvas, constructs an `Engine` with its own
`update`/`render` closures, calls `engine.start()`. `render()` issues the
draw call using the `gl` context obtained at construction time. `update()` is a
no-op for the demo (static triangle, nothing to simulate yet).

## Error Handling

Fail loud, not graceful, at this stage: missing WebGL support, shader compile
errors, and link errors all throw with the underlying driver message. This is
a learning/portfolio project — silent fallbacks would hide the exact failures
worth understanding.

## Testing

No unit tests for anything requiring a real GPU/browser WebGL context —
`GLContext` and the demo's draw call aren't meaningfully unit-testable
without one. Those are validated manually: run `vite`, open `games/demo/`,
confirm the triangle renders. Later milestones may add Spector.js / DevTools
GPU panel checks (per `CLAUDE.md` step 5) for this class of check.

Pieces that don't need a real GPU do get real unit tests: `GameLoop`'s
timing logic (mocking `requestAnimationFrame`/`performance.now`, no `gl`
involved) and `Shader`'s compile/link/cleanup logic (against a fully mocked
`gl` object, exercising the real success/compile-failure/link-failure
branches). This distinction — GPU-bound code is manually verified, pure
logic is unit-tested — held for the whole Engine v0 implementation and is
the rule going forward for later milestones' engine code.

## Out of Scope (future milestones, not this spec)

- Actual playable game logic (Game #1, milestone 2 in `CLAUDE.md`).
- GLSL effects beyond the flat-color triangle.
- Camera/projection matrices (milestone 3 — pulled in when a game actually
  needs them).
- Asset loading, scene management (milestone 4).
