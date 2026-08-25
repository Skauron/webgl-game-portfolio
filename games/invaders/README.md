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
- Same "no camera/projection matrices" rule as Pacman — static full-screen
  view, direct grid/pixel → NDC arithmetic.

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
(`bullet.test.js`), barrier hit-point countdown (`barrier.test.js`), and
AABB overlap (`collision.test.js`). Texture loading, rendering, and the
composed game loop are manual-only.

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
