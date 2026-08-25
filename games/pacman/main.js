import { Engine } from '../../engine/core/Engine.js';
import { createQuadRenderer } from './renderer.js';
import { Player } from './player.js';
import { Ghost } from './ghost.js';
import {
  CELL_SIZE,
  PLAYER_SPAWN,
  GHOST_SPAWNS,
  createGrid,
  consumePellet,
  countRemainingPellets,
} from './maze.js';
import { createBurst, updateParticles } from '../../engine/core/particles.js';
import { createParticleRenderer } from '../../engine/core/ParticleRenderer.js';

const WALL_COLOR = [0.15, 0.15, 0.65, 1.0];
const PELLET_COLOR = [1.0, 1.0, 0.8, 1.0];
const PLAYER_COLOR = [1.0, 0.9, 0.1, 1.0];
const GHOST_COLORS = [
  [1.0, 0.2, 0.2, 1.0],
  [1.0, 0.4, 0.8, 1.0],
];

const DEATH_BURST_OPTIONS = { count: 12, life: 0.5, speedMin: 30, speedMax: 100 };
const DEATH_BURST_PALETTE = [
  [1.0, 1.0, 0.9],
  [1.0, 0.9, 0.2],
  [0.6, 0.5, 0.1],
];

const KEY_DIRECTIONS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

const canvas = document.querySelector('#viewport');
const scoreEl = document.querySelector('#score');
const livesEl = document.querySelector('#lives');
const overlayEl = document.querySelector('#overlay');
const overlayMessageEl = document.querySelector('#overlay-message');
const restartButtonEl = document.querySelector('#restart-button');

let grid;
let player;
let ghosts;
let score;
let lives;
let state; // 'playing' | 'gameover' | 'victory'
let particles;
let drawQuad;
let drawParticles;
let engine;

function resetGame() {
  grid = createGrid();
  player = new Player({ col: PLAYER_SPAWN.col, row: PLAYER_SPAWN.row, speed: 5 });
  ghosts = GHOST_SPAWNS.map((spawn) => new Ghost({ col: spawn.col, row: spawn.row, speed: 4 }));
  score = 0;
  lives = 3;
  state = 'playing';
  particles = [];
  overlayEl.classList.remove('visible');
  updateHud();
}

function updateHud() {
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
}

function endGame(message) {
  state = message === 'You Win!' ? 'victory' : 'gameover';
  overlayMessageEl.textContent = message;
  overlayEl.classList.add('visible');
  engine.stop();
}

function resetPositions() {
  player.col = PLAYER_SPAWN.col;
  player.row = PLAYER_SPAWN.row;
  player.progress = 0;
  player.direction = null;
  player.desiredDirection = null;
  ghosts.forEach((ghost, index) => {
    ghost.col = GHOST_SPAWNS[index].col;
    ghost.row = GHOST_SPAWNS[index].row;
    ghost.progress = 0;
    ghost.direction = null;
  });
}

function update(dt) {
  if (state !== 'playing') return;

  player.update(dt, grid);
  ghosts.forEach((ghost) => ghost.update(dt, grid));
  particles = updateParticles(particles, dt);

  if (consumePellet(grid, player.col, player.row)) {
    score += 10;
    updateHud();
    if (countRemainingPellets(grid) === 0) {
      endGame('You Win!');
      return;
    }
  }

  const caught = ghosts.some((ghost) => ghost.col === player.col && ghost.row === player.row);
  if (caught) {
    const playerPos = player.getPixelPosition(CELL_SIZE);
    particles.push(
      ...createBurst(playerPos.x + CELL_SIZE / 2, playerPos.y + CELL_SIZE / 2, DEATH_BURST_OPTIONS)
    );
    lives -= 1;
    updateHud();
    if (lives <= 0) {
      endGame('Game Over');
      return;
    }
    resetPositions();
  }
}

function render(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const time = performance.now() / 1000;

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      const cell = grid[row][col];
      if (cell === '#') {
        drawQuad(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE, WALL_COLOR);
      } else if (cell === '.') {
        const inset = CELL_SIZE * 0.35;
        drawQuad(
          col * CELL_SIZE + inset,
          row * CELL_SIZE + inset,
          CELL_SIZE - inset * 2,
          CELL_SIZE - inset * 2,
          PELLET_COLOR,
          { time, pulse: 1, glow: 1 }
        );
      }
    }
  }

  ghosts.forEach((ghost, index) => {
    const pos = ghost.getPixelPosition(CELL_SIZE);
    drawQuad(pos.x + 2, pos.y + 2, CELL_SIZE - 4, CELL_SIZE - 4, GHOST_COLORS[index]);
  });

  const playerPos = player.getPixelPosition(CELL_SIZE);
  drawQuad(playerPos.x + 2, playerPos.y + 2, CELL_SIZE - 4, CELL_SIZE - 4, PLAYER_COLOR);

  drawParticles(particles);
}

window.addEventListener('keydown', (event) => {
  const direction = KEY_DIRECTIONS[event.key];
  if (direction) {
    event.preventDefault(); // stop the browser's default scroll on Arrow keys
    player.setDesiredDirection(direction);
  }
});

document.querySelectorAll('.touch-btn[data-dir]').forEach((button) => {
  button.addEventListener('pointerdown', () => {
    player.setDesiredDirection(button.dataset.dir);
  });
});

restartButtonEl.addEventListener('click', () => {
  resetGame();
  engine.start();
});

resetGame();
engine = new Engine({ canvas, update, render });
({ drawQuad } = createQuadRenderer(engine.gl));
({ drawParticles } = createParticleRenderer(engine.gl, { size: 3, palette: DEATH_BURST_PALETTE }));
engine.start();
