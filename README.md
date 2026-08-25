# WebGL Game Portfolio

Four small browser games built on a hand-rolled JavaScript/WebGL engine —
no game framework (no Three.js/Babylon/Phaser). Raw WebGL calls, GLSL
shaders, and the "engine" itself are all hand-written; that's the point of
the project.

**Live:** https://skauron.github.io/webgl-game-portfolio/

| Game | What it adds |
|---|---|
| [Engine v0 Demo](games/demo/) | Pipeline smoke test: context, shader compile/link, one draw call |
| [Pacman](games/pacman/) | First playable game, grid movement, simple ghost AI, a `uTime`-driven GLSL pulse effect |
| [Space Invaders](games/invaders/) | Real PNG sprite textures, texture tinting, marching formation logic |
| [Pong Multiplayer](games/pong/) | Real-time 2-player over raw WebSockets, server-authoritative + client-side prediction |

Each game has its own README with the specific WebGL/GLSL techniques it
demonstrates, its architecture, and how it was tested. A repo-wide
[profiling and optimization pass](docs/profiling.md) audits all four
games' draw-call counts and documents what got optimized (and, just as
importantly, what was audited and left alone).

## Clone and run

```bash
git clone https://github.com/Skauron/webgl-game-portfolio.git
cd webgl-game-portfolio
npm install
npm run dev
```

Open the printed local URL (e.g. `http://localhost:5173/webgl-game-portfolio/`)
— the landing page links to all four games.

**Pong** needs its own WebSocket server running locally too (the other
three games are self-contained):

```bash
cd server
npm install
node server.js
```

`games/pong/config.js` points at `ws://localhost:8080` outside of
production builds, so it connects to that local server automatically.

## Other commands

```bash
npm run build   # production build, output to dist/
npm test        # unit tests (Vitest) for pure game logic + engine pieces
```

`server/`'s tests run separately with Node's built-in test runner (no extra
dependency for the deployable server package):

```bash
cd server
node --test
```

## Built with

- **Client:** vanilla JavaScript (ES modules), raw WebGL/WebGL2, hand-rolled
  GLSL shaders. No TypeScript, no rendering framework.
- **Tooling:** [Vite](https://vitejs.dev/) (multi-page build, dev server),
  [Vitest](https://vitest.dev/) for pure-logic unit tests.
- **Multiplayer server** (`server/`): Node.js + [`ws`](https://github.com/websockets/ws)
  (raw WebSockets, no Socket.io), deployed on [Render](https://render.com/)
  via the checked-in `render.yaml` blueprint.
- **Hosting:** static site on GitHub Pages (this repo, `master` branch, via
  GitHub Actions); the Pong server is a separate always-on-ish free-tier
  Render service (cold-starts after inactivity — the client shows a
  "waking the server" message rather than looking frozen).

## Repo structure

```
engine/core/     shared engine pieces (context setup, shader compile,
                 game loop, texture loading) — used by every game
games/<name>/    one folder per game: index.html, main.js entry point,
                 game-specific modules, its own README
server/          separate deployable Node package for Pong's WebSocket
                 server (its own package.json, not part of the Vite build)
docs/superpowers/  design specs and implementation plans written before
                 each game was built
```

## Built with Claude Code

This entire portfolio — engine, all four games, and the multiplayer
server — was built with [Claude Code](https://claude.com/claude-code)
(Anthropic), following a consistent workflow per feature: a brainstormed
design spec, an implementation plan, then per-task execution with a code
review before merge (a whole-branch review for the larger features). Each
game's README names the real bugs that review process caught before they
shipped. Full specs live under
[`docs/superpowers/specs/`](docs/superpowers/specs/); the original
project goals and build plan are in [`CLAUDE.md`](CLAUDE.md).

## License

Personal portfolio project — no license granted for reuse.
