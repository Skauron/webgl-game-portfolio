# Space Invaders

Second game — raises the bar over Pacman with real PNG sprite textures
instead of flat-color quads, the engine's first asset-loading feature.

**Controls:** arrow keys/A-D to move, space to shoot (one bullet in flight
at a time, the original arcade's rule). Clear all 25 invaders to win; 3 hits
or the formation reaching your row ends the game.

## What it demonstrates

- Texture loading and sampling from scratch: `engine/core/Texture.js`
  uploads a PNG as a `gl.TEXTURE_2D`, `gl.NEAREST` filtering so pixel art
  stays crisp at 4× scale. First genuinely reusable (non-game-specific)
  engine capability added since Engine v0.
- One shared shader for both textured sprites and flat-color quads
  (barriers), switched via a `uUseTexture` toggle uniform instead of
  swapping programs — position and UV are both per-vertex dynamic
  attributes, computed in JS per draw call.
- Batched formation rendering: the 5×5 invader grid used to issue one
  textured draw call per alive invader (up to 25 a frame). `drawSpriteBatch`
  packs every invader's position and UV into one big vertex buffer and
  draws the whole formation in a single `gl.drawArrays` call — it only
  works because every invader shares the same shader, texture, and default
  color (see [`docs/profiling.md`](../../docs/profiling.md) for the
  repo-wide draw-call audit this came out of).
- A hand-rolled PNG encoder (`scripts/generate-sprites.js`, CRC32 + zlib
  deflate via Node's built-in `zlib`, no new dependency) that generates the
  5-sprite atlas checked into the repo — ship, two invader animation frames,
  player/enemy bullets.
- Texture tinting via `gl_FragColor = texture2D(uTexture, vUV) * uColor`,
  used for the player-hit red flash (blink for 1s on taking damage) without
  a second sprite or shader.
- Classic arcade formation logic: discrete "marching" steps on a timer
  (not continuous motion) with a step interval that shortens as invaders
  die (`games/invaders/formation.js`) — a genuine gameplay-feel tuning
  problem, not just rendering.
- The sprite/barrier renderer still uses direct grid/pixel → NDC
  arithmetic (no matrices needed for a static full-screen view, same as
  Pacman) — but the **explosion particle effect breaks that rule on
  purpose**: `engine/core/mat4.js` adds a real orthographic projection
  matrix (`ortho(left, right, bottom, top, near, far)`, standard
  column-major 4×4), used via a `uProjection` uniform in the particle
  vertex shader instead of manual NDC math.
- Killing an invader spawns particles (`engine/core/particles.js`: pure
  physics, random angle/speed, finite lifetime) that fly outward and cool
  through a fixed, quantized color ramp (bright white-yellow → orange →
  dark red) as they age, drawn as hard-edged squares — not a soft
  antialiased glow — to read as pixel-art embers matching the sprite
  atlas's `NEAREST`-filtered look, with additive blending
  (`engine/core/ParticleRenderer.js`). This particle system is genuinely
  reusable engine code, not Invaders-specific: it takes a burst
  size/lifetime/speed config and a 3-color palette as parameters, so
  other games can reuse it with their own look (see Pacman/Pong).

## Architecture

`games/invaders/main.js` loads the texture asynchronously, then owns all
mutable state (formation, player, bullets, barriers) and drives it through
`Engine`, same shape as Pacman's composition root. `collision.js` is the
single shared AABB overlap primitive every bullet/invader/barrier/player
check uses, instead of duplicating overlap math per pair. Rendering
(`renderer.js`) is a pure read of that state.

## Testing

Pure logic is unit-tested: formation timing/edge-detection/speed-up
(`formation.test.js`), player movement and the single-bullet gate
(`player.test.js`), bullet movement/off-screen detection
(`bullet.test.js`), barrier hit-point countdown (`barrier.test.js`),
AABB overlap (`collision.test.js`). The shared engine pieces this game
uses — particle spawn/physics/lifetime and the orthographic projection
matrix — are tested where they live:
[`engine/core/particles.test.js`](../../engine/core/particles.test.js),
[`engine/core/mat4.test.js`](../../engine/core/mat4.test.js). Texture
loading, rendering, and the composed game loop are manual-only.

## Run locally

```bash
npm install
npm run dev
```
Open `/games/invaders/`. Touch controls appear on coarse-pointer devices.
To regenerate the sprite atlas: `node scripts/generate-sprites.js`.

## Built with Claude Code

Spec'd and implemented with Claude Code (Anthropic) using a
brainstorm → design spec → implementation plan → per-task subagent
workflow. A real bug from this process is worth naming: the sprite
rendered upside-down after a hand edit to the bitmap, root-caused via
systematic debugging to a backwards `UNPACK_FLIP_Y_WEBGL` flag in
`Texture.js` given this renderer's UV convention — fixed at the source,
not patched around. Full spec:
[`docs/superpowers/specs/2026-08-24-space-invaders-design.md`](../../docs/superpowers/specs/2026-08-24-space-invaders-design.md).
