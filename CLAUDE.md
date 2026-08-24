# WebGL Game Portfolio — Study & Build Project

## Context
Alejandro Garzón (Multimedia Engineer, Unity/C# + Unreal Engine 5/C++ background) is
targeting a **Game Developer role at EffectiveSoft** (JS + raw WebGL, custom game
engines, GLSL shaders — no framework, no existing engine). He's in active conversation
with the recruiter (Gabriela Mora) and wants a portfolio built while the application
moves forward.

This repo is separate from `ai-job-search` on purpose — that repo is the job-search /
CV / cover-letter assistant workspace; this one is pure hands-on build work. No job
application skills apply here.

## Background already in place
- 6+ years game dev: Unity (C#) lead dev, UE5 (C++) gameplay systems, VFX/Niagara,
  multiplayer networking/replication, ShaderLab/HLSL shaders.
- Web stack: React, Next.js, JavaScript, TypeScript, HTML/CSS.
- **Never done:** raw WebGL API calls, GLSL, building a game engine from scratch
  (always used an existing engine).

## Goal
Ship **two small, playable, WebGL-only browser games** (no engine framework — the
"custom game engine" IS the deliverable) built on a hand-rolled JS/WebGL engine, to
close the posting's explicit requirement: *"a portfolio showcasing web-based games
and demonstrating WebGL expertise."*

## Approach: project-first, not course-first
Skip standalone WebGL/GLSL courses as a prerequisite. Learn raw WebGL calls and GLSL
syntax **on demand while building** — reference material only (WebGL Fundamentals,
GLSL Shaders from Scratch, Metal by Example for the linear algebra) pulled in when the
build actually needs it, not studied end-to-end up front. The engine's renderer *is*
WebGL; its effects *are* GLSL — the skill gets built either way, just through
application instead of isolation.

## Build order
1. **Engine v0** (~15h) — canvas/WebGL context setup, game loop (update/render split),
   one basic draw call on screen. First raw-WebGL contact happens here.
2. **Game #1** (~20h) — simple, engine-driven, 1-2 basic GLSL shaders (e.g. a
   color/gradient effect). First playable portfolio piece. GLSL learned here on demand.
3. **Linear algebra, pulled in as needed** (~8h) — camera/projection matrices,
   transforms, only when the engine's rendering actually requires them.
4. **Game #2** (~20h) — raise the bar: more shader work, scene management, asset
   loading. Second, stronger portfolio piece demonstrating range.
5. **Debugging/profiling pass** (~5h) — Spector.js, Chrome DevTools GPU panel, applied
   to the two shipped games.
6. **Publish** (~3h) — GitHub Pages or itch.io for both games, short writeup linked
   from the existing portfolio (skauron.github.io).
7. **Optional, only if time remains:** WebSockets/state sync/client-side prediction
   (~8h) — nice-to-have on the posting, not required for the portfolio.

Total: ~79h to a working two-game portfolio.

## Reference resources (pull in as needed, not upfront)
- WebGL: https://webglfundamentals.org/, https://www.webglacademy.com/
- GLSL: https://simondev.teachable.com/p/glsl-shaders-from-scratch, https://shader-learning.com/
- Linear algebra: https://metalbyexample.com/linear-algebra/
- JS engine architecture: https://bengsfort.github.io/articles/making-a-js-game-part-1-game-engine/

## Constraints / house rules for this repo
- No frameworks (Three.js, Babylon, Phaser) for the two portfolio games — raw WebGL is
  the point, since that's what the posting asks for and a framework would hide exactly
  the skill being demonstrated.
- Keep games small in scope — finished and shipped beats ambitious and unfinished.
- Full source, deployed builds, and a short devlog/README per game — the posting wants
  proof of WebGL expertise, not just a claim.
