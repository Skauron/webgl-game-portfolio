# Pacman (Game #1) — Design Spec

## Context

Second milestone of the WebGL game portfolio build (see `CLAUDE.md`, and
[[project-game1-concept]]): the first real playable game, built on top of
Engine v0 (`engine/core/{Engine,GameLoop,GLContext,Shader}.js`, already
shipped on `master`). A simplified Pacman clone — smaller map, no power
pellets, simple ghost AI — scoped to stay small and finished rather than
ambitious and unfinished, per the repo's house rule.

## Decisions

- **Map:** fixed 13×11 grid, hardcoded in `games/pacman/maze.js`. No power
  pellets — ghosts have no "vulnerable" state in this version, so a power
  pellet would have no gameplay effect.
- **Ghosts:** 2, moving at grid-continuous speed. At every intersection each
  ghost picks a uniformly random valid direction (excluding the reverse of
  its current direction unless reversing is the only option). No chase
  logic, no ghost house — both spawn already roaming.
- **Lives/scoring:** 3 lives, score increments per pellet eaten. Losing all
  lives ends the game (Game Over); eating every pellet wins (Victory). Both
  states halt gameplay and show an overlay with a restart affordance.
- **Rendering:** one shared shader draws flat-color quads (`uColor`
  uniform); one draw call per visible cell/entity. Pellets additionally get
  a `uTime` uniform for a subtle pulsing brightness — the milestone's GLSL
  effect (per `CLAUDE.md`: "1-2 basic GLSL shaders, e.g. a color/gradient
  effect").
- **Coordinates:** no camera/projection matrices. Grid cell → pixel → NDC is
  a direct arithmetic conversion done in JS per vertex, since the view is
  static and full-screen. Camera matrices are milestone 3 in `CLAUDE.md`,
  pulled in only when a game actually needs them — this one doesn't.
- **Movement:** grid-locked continuous. An entity has a current cell, a
  facing direction, and a progress fraction toward the next cell; input
  (player) or AI choice (ghost) is buffered and applied at the next cell
  center, if that direction is open.
- **UI:** score/lives/Game Over/Victory rendered as an HTML/CSS overlay
  outside the `<canvas>` — not inside the WebGL scene. Rendering text in raw
  WebGL needs a font atlas, which is out of scope for this milestone (that
  complexity belongs with asset loading in milestone 4). The overlay doesn't
  weaken the "raw WebGL" story since the game's actual rendering — the maze,
  player, ghosts, pellets — is 100% WebGL.
- **Controls:** arrow keys and WASD, via `keydown`/`keyup` listeners setting
  a desired-direction value the player entity reads each frame.

## Components

### `games/pacman/maze.js`
Owns the map data and pure grid logic — no rendering, no DOM:
- `MAZE`: a 13×11 grid of cell codes (`WALL`, `PELLET`, `EMPTY`).
- `isWall(col, row)` — bounds-inclusive (out-of-bounds counts as a wall).
- `cellToPixel(col, row, cellSize)` — grid coordinate → pixel-space
  top-left corner.
- `countRemainingPellets(grid)` / `consumePellet(grid, col, row)` — pellet
  bookkeeping for scoring and the win condition.
- Fixed spawn constants: `PLAYER_SPAWN = { col: 6, row: 5 }`,
  `GHOST_SPAWNS = [{ col: 1, row: 1 }, { col: 11, row: 1 }]` — all three are
  `EMPTY` cells (not `PELLET`), so a spawn point never hides the last pellet
  under a ghost.

The hardcoded `MAZE` must be fully connected (every non-wall cell reachable
from every other) — verified by a flood-fill unit test. If the test finds an
unreachable pocket, the fix is to open one adjacent wall cell, keeping the
grid's overall 13×11 size and general shape.

### `games/pacman/player.js`
`class Player`: grid position (col, row), sub-cell progress (0-1) toward the
next cell, current facing direction, and a buffered "desired direction" set
by input. `update(dt, maze)`: advances progress at a fixed speed; on
reaching a cell center, tries to turn onto the buffered direction if that
neighbor isn't a wall, otherwise continues straight if possible, otherwise
stops. Exposes its current pixel-space position for rendering and for
collision checks. Input handling (`keydown`/`keyup` → desired direction) is
wired in `main.js`, not inside `Player` — keeps `Player`'s movement/turning
logic testable without a DOM.

### `games/pacman/ghost.js`
`class Ghost`: same grid-position/progress/direction shape as `Player`, but
instead of reading buffered input, it chooses its next direction itself at
each cell center: enumerate valid (non-wall) neighboring directions
excluding the reverse of the current direction (unless it's the only
option), pick one uniformly at random. Takes a random-number source as a
constructor parameter (defaults to `Math.random`) so tests can inject a
deterministic sequence.

### `games/pacman/renderer.js`
`createQuadRenderer(gl)` — compiles the shared flat-color-quad program (via
`engine/core/Shader.js`'s `createProgram`) once and returns a
`drawQuad(col, row, cellSize, color, time)` function that uploads that
quad's position (converted to NDC) and draws it (`TRIANGLES`, one quad = 2
triangles = 6 vertices, or a 4-vertex `TRIANGLE_STRIP` — implementer's
choice). `time` feeds the pellet-pulse effect; non-pellet draws pass a
constant so the pulse term evaluates to 1.0 (no effect).

### `games/pacman/main.js`
Composition root: builds the canvas/overlay DOM, constructs `Player`,
`Ghost` × 2, and the renderer, wires keyboard input, and drives the game
through `Engine`:
- `update(dt)`: advance player and ghosts, check pellet pickup (score/win),
  check player-ghost collision (lose a life / lose the game), stop the
  `Engine` loop on Game Over or Victory.
- `render(gl)`: clear, draw every wall/pellet cell, draw both ghosts, draw
  the player.
- Maintains a small state machine: `PLAYING` → `GAME_OVER` | `VICTORY`,
  reflected in the HTML overlay (score/lives always visible; a centered
  message + restart button appears on either end state).

## Data Flow

`main.js` owns the single source of truth: the `maze` grid (mutated as
pellets are eaten), `player`, and the two `ghost` instances. Each frame:
`update(dt)` mutates player/ghost positions and the maze's pellet grid in
place, then reads the resulting state to decide score/lives/game-state
transitions. `render(gl)` is a pure read of that same state — it never
mutates anything, only calls `renderer.drawQuad(...)` per visible cell fed
by `maze` iteration and per entity.

## Error Handling

Consistent with Engine v0: WebGL/shader failures still fail loud (inherited
from `GLContext`/`Shader`, unchanged here). Game-logic edge cases (player
walks into a wall, ghost has no valid non-reverse direction) are expected,
routine states, not errors — they're handled as normal control flow
(described in the components above), not exceptions.

## Testing

Same split as Engine v0's spec: pure logic gets real unit tests, anything
needing a real GPU or DOM is manual-only.

- **Unit-tested:** `maze.js` (`isWall`, `cellToPixel`, pellet counting, the
  flood-fill connectivity check), `player.js`'s turning/movement logic
  (given a maze and a sequence of `update(dt)` calls plus buffered
  directions, assert resulting grid position/direction — no DOM, no
  `gl`), `ghost.js`'s direction-choice logic (inject a fake random source
  returning a fixed sequence, assert it never reverses when another option
  exists and never picks a wall direction).
- **Manual-only:** `renderer.js` (real WebGL draw calls), `main.js` (DOM
  overlay, keyboard wiring, `Engine` composition, visual collision/pellet
  behavior). Validation: run `vite`, open `games/pacman/`, play through a
  full round (eat pellets, get caught, win).

## Maze Layout

13 columns × 11 rows, `#` = wall, `.` = pellet, `o` = empty (spawn point,
no pellet). Row 0 is the top.

```
#############
#o..#...#..o#
#.#.#.#.#.#.#
#.#.......#.#
#.#.#####.#.#
#.....o...#.#
#.#.#####.#.#
#.#.......#.#
#.#.#.#.#.#.#
#...#...#...#
#############
```

`PLAYER_SPAWN = { col: 6, row: 5 }` (the `o` in row 5).
`GHOST_SPAWNS = [{ col: 1, row: 1 }, { col: 11, row: 1 }]` (the two `o`s in
row 1).

This layout has not been mechanically verified for full connectivity — that
verification is the flood-fill unit test's job (see Testing). If the test
finds an unreachable pocket, fix it by flipping the minimal number of
adjacent `#` cells to `.`, keeping the 13×11 size and the overall
cross-shaped corridor structure (left column at col 1 and right column at
col 11 both fully open top-to-bottom, connected across via rows 1, 3, 5, 7,
9).

## Out of Scope (later milestones, not this spec)

- Power pellets / ghost "vulnerable" state.
- Chase-based ghost AI (this version is pure random-valid-direction).
- Camera/projection matrices (milestone 3 — not needed for this static
  view).
- Sprite/texture assets, scene management (milestone 4).
- Sound effects.
