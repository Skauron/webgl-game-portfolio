import { Engine } from '../../engine/core/Engine.js';
import { loadTexture } from '../../engine/core/Texture.js';
import { createSpriteRenderer } from './renderer.js';
import {
  createFormation,
  updateFormation,
  invaderPosition,
  killInvader,
  countAliveInvaders,
  GRID_COLS,
  GRID_ROWS,
  INVADER_SIZE,
  GRID_PIXEL_HEIGHT,
} from './formation.js';
import { createPlayer, updatePlayer, tryShoot, PLAYER_Y } from './player.js';
import { createBullet, updateBullet, BULLET_WIDTH } from './bullet.js';
import { createBarrier, hitBarrier } from './barrier.js';
import { rectsOverlap } from './collision.js';
import { createExplosion, updateParticles } from './particles.js';
import { createParticleRenderer } from './particleRenderer.js';

const CANVAS_SIZE = 480;
const PLAYER_CELL = 0;
const INVADER_CELL_A = 1;
const INVADER_CELL_B = 2;
const PLAYER_BULLET_CELL = 3;
const ENEMY_BULLET_CELL = 4;

const ENEMY_FIRE_MIN_INTERVAL = 0.5;
const ENEMY_FIRE_MAX_INTERVAL = 1.2;
const MAX_ENEMY_BULLETS = 2;
const ENEMY_BULLET_SPEED = 180;

const PLAYER_HIT_FLASH_DURATION = 1.0;
const PLAYER_HIT_FLASH_BLINK_RATE = 10; // toggles per second
const PLAYER_HIT_FLASH_COLOR = [1.0, 0.2, 0.2, 1.0];
const WHITE = [1.0, 1.0, 1.0, 1.0];

const canvas = document.querySelector('#viewport');
const scoreEl = document.querySelector('#score');
const livesEl = document.querySelector('#lives');
const overlayEl = document.querySelector('#overlay');
const overlayMessageEl = document.querySelector('#overlay-message');
const restartButtonEl = document.querySelector('#restart-button');

let formation;
let player;
let barriers;
let playerBullet;
let enemyBullets;
let score;
let lives;
let state; // 'playing' | 'gameover' | 'victory'
let enemyFireTimer;
let hitFlashTimer;
let particles;
let drawSprite;
let drawQuad;
let drawParticles;
let engine;

function resetGame() {
  formation = createFormation();
  player = createPlayer();
  barriers = [
    createBarrier(CANVAS_SIZE * 0.25 - 24, 360),
    createBarrier(CANVAS_SIZE * 0.5 - 24, 360),
    createBarrier(CANVAS_SIZE * 0.75 - 24, 360),
  ];
  playerBullet = null;
  enemyBullets = [];
  score = 0;
  lives = 3;
  state = 'playing';
  enemyFireTimer = ENEMY_FIRE_MIN_INTERVAL;
  hitFlashTimer = 0;
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

function randomEnemyFireInterval() {
  return (
    ENEMY_FIRE_MIN_INTERVAL + Math.random() * (ENEMY_FIRE_MAX_INTERVAL - ENEMY_FIRE_MIN_INTERVAL)
  );
}

function frontInvaders() {
  const front = [];
  for (let col = 0; col < GRID_COLS; col += 1) {
    for (let row = GRID_ROWS - 1; row >= 0; row -= 1) {
      if (formation.alive[row][col]) {
        front.push({ col, row });
        break;
      }
    }
  }
  return front;
}

function maybeEnemyFire(dt) {
  enemyFireTimer -= dt;
  if (enemyFireTimer > 0) return;
  enemyFireTimer = randomEnemyFireInterval();

  if (enemyBullets.length >= MAX_ENEMY_BULLETS) return;
  const candidates = frontInvaders();
  if (candidates.length === 0) return;

  const { col, row } = candidates[Math.floor(Math.random() * candidates.length)];
  const pos = invaderPosition(formation, col, row);
  enemyBullets.push(
    createBullet({
      x: pos.x + INVADER_SIZE / 2 - BULLET_WIDTH / 2,
      y: pos.y + INVADER_SIZE,
      vy: ENEMY_BULLET_SPEED,
      owner: 'enemy',
    })
  );
}

function checkPlayerBulletVsInvaders() {
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      if (!formation.alive[row][col]) continue;
      const pos = invaderPosition(formation, col, row);
      const invaderRect = { x: pos.x, y: pos.y, width: INVADER_SIZE, height: INVADER_SIZE };
      if (rectsOverlap(playerBullet, invaderRect)) {
        killInvader(formation, col, row);
        particles.push(...createExplosion(pos.x + INVADER_SIZE / 2, pos.y + INVADER_SIZE / 2));
        score += 10;
        updateHud();
        return true;
      }
    }
  }
  return false;
}

function update(dt) {
  if (state !== 'playing') return;

  updateFormation(formation, dt);

  if (formation.y + GRID_PIXEL_HEIGHT >= PLAYER_Y) {
    endGame('Game Over');
    return;
  }

  updatePlayer(player, dt);
  maybeEnemyFire(dt);

  if (hitFlashTimer > 0) {
    hitFlashTimer = Math.max(0, hitFlashTimer - dt);
  }

  particles = updateParticles(particles, dt);

  if (playerBullet) {
    const stillOnScreen = updateBullet(playerBullet, dt, CANVAS_SIZE);
    if (!stillOnScreen) playerBullet = null;
  }

  enemyBullets = enemyBullets.filter((bullet) => updateBullet(bullet, dt, CANVAS_SIZE));

  if (playerBullet && checkPlayerBulletVsInvaders()) {
    playerBullet = null;
  }

  if (playerBullet) {
    for (const barrier of barriers) {
      if (barrier.hitPoints > 0 && rectsOverlap(playerBullet, barrier)) {
        hitBarrier(barrier);
        playerBullet = null;
        break;
      }
    }
  }

  enemyBullets = enemyBullets.filter((bullet) => {
    for (const barrier of barriers) {
      if (barrier.hitPoints > 0 && rectsOverlap(bullet, barrier)) {
        hitBarrier(barrier);
        return false;
      }
    }
    return true;
  });

  const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };
  const hitByEnemy = enemyBullets.some((bullet) => rectsOverlap(bullet, playerRect));
  if (hitByEnemy) {
    enemyBullets = enemyBullets.filter((bullet) => !rectsOverlap(bullet, playerRect));
    lives -= 1;
    hitFlashTimer = PLAYER_HIT_FLASH_DURATION;
    updateHud();
    if (lives <= 0) {
      endGame('Game Over');
      return;
    }
  }

  if (countAliveInvaders(formation) === 0) {
    endGame('You Win!');
  }
}

function render(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (const barrier of barriers) {
    if (barrier.hitPoints <= 0) continue;
    const shade = 0.15 + 0.25 * (barrier.hitPoints / 4);
    drawQuad(barrier.x, barrier.y, barrier.width, barrier.height, [shade, shade, shade + 0.05, 1.0]);
  }

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      if (!formation.alive[row][col]) continue;
      const pos = invaderPosition(formation, col, row);
      const cell = formation.frame === 'A' ? INVADER_CELL_A : INVADER_CELL_B;
      drawSprite(pos.x, pos.y, INVADER_SIZE, INVADER_SIZE, cell);
    }
  }

  const isFlashing =
    hitFlashTimer > 0 && Math.floor(hitFlashTimer * PLAYER_HIT_FLASH_BLINK_RATE) % 2 === 0;
  const playerColor = isFlashing ? PLAYER_HIT_FLASH_COLOR : WHITE;
  drawSprite(player.x, player.y, player.width, player.height, PLAYER_CELL, playerColor);

  if (playerBullet) {
    drawSprite(playerBullet.x, playerBullet.y, playerBullet.width, playerBullet.height, PLAYER_BULLET_CELL);
  }
  for (const bullet of enemyBullets) {
    drawSprite(bullet.x, bullet.y, bullet.width, bullet.height, ENEMY_BULLET_CELL);
  }

  drawParticles(particles);
}

const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'a', 'd', ' ']);

window.addEventListener('keydown', (event) => {
  if (!GAME_KEYS.has(event.key)) return;
  event.preventDefault(); // stop the browser's default scroll on Space/Arrow keys

  if (event.key === 'ArrowLeft' || event.key === 'a') player.moveDirection = -1;
  if (event.key === 'ArrowRight' || event.key === 'd') player.moveDirection = 1;
  if (event.key === ' ') {
    const bullet = tryShoot(player, playerBullet !== null);
    if (bullet) playerBullet = bullet;
  }
});

window.addEventListener('keyup', (event) => {
  if ((event.key === 'ArrowLeft' || event.key === 'a') && player.moveDirection === -1) {
    player.moveDirection = 0;
  }
  if ((event.key === 'ArrowRight' || event.key === 'd') && player.moveDirection === 1) {
    player.moveDirection = 0;
  }
});

restartButtonEl.addEventListener('click', () => {
  resetGame();
  engine.start();
});

const leftButtonEl = document.querySelector('#btn-left');
const rightButtonEl = document.querySelector('#btn-right');
const fireButtonEl = document.querySelector('#btn-fire');

leftButtonEl.addEventListener('pointerdown', () => {
  player.moveDirection = -1;
});
leftButtonEl.addEventListener('pointerup', () => {
  if (player.moveDirection === -1) player.moveDirection = 0;
});
leftButtonEl.addEventListener('pointerleave', () => {
  if (player.moveDirection === -1) player.moveDirection = 0;
});

rightButtonEl.addEventListener('pointerdown', () => {
  player.moveDirection = 1;
});
rightButtonEl.addEventListener('pointerup', () => {
  if (player.moveDirection === 1) player.moveDirection = 0;
});
rightButtonEl.addEventListener('pointerleave', () => {
  if (player.moveDirection === 1) player.moveDirection = 0;
});

fireButtonEl.addEventListener('pointerdown', () => {
  const bullet = tryShoot(player, playerBullet !== null);
  if (bullet) playerBullet = bullet;
});

resetGame();
engine = new Engine({ canvas, update, render });
({ drawParticles } = createParticleRenderer(engine.gl));

loadTexture(engine.gl, new URL('./assets/sprites.png', import.meta.url).href).then(({ texture }) => {
  ({ drawSprite, drawQuad } = createSpriteRenderer(engine.gl, texture));
  engine.start();
});
