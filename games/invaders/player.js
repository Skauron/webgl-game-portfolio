import { createBullet, BULLET_WIDTH } from './bullet.js';
import { PLAYFIELD_LEFT, PLAYFIELD_RIGHT } from './formation.js';

export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 32;
export const PLAYER_SPEED = 220;
export const PLAYER_Y = 440;
export const PLAYER_BULLET_SPEED = -300;

export function createPlayer() {
  return {
    x: (PLAYFIELD_LEFT + PLAYFIELD_RIGHT - PLAYER_WIDTH) / 2,
    y: PLAYER_Y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    moveDirection: 0,
  };
}

export function updatePlayer(player, dt) {
  player.x += player.moveDirection * PLAYER_SPEED * dt;
  const maxX = PLAYFIELD_RIGHT - PLAYER_WIDTH;
  if (player.x < PLAYFIELD_LEFT) player.x = PLAYFIELD_LEFT;
  if (player.x > maxX) player.x = maxX;
}

export function tryShoot(player, hasActiveBullet) {
  if (hasActiveBullet) return null;
  return createBullet({
    x: player.x + player.width / 2 - BULLET_WIDTH / 2,
    y: player.y,
    vy: PLAYER_BULLET_SPEED,
    owner: 'player',
  });
}
