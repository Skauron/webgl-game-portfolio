import { describe, it, expect } from 'vitest';
import {
  createPlayer,
  updatePlayer,
  tryShoot,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_BULLET_SPEED,
} from './player.js';
import { PLAYFIELD_LEFT, PLAYFIELD_RIGHT } from './formation.js';
import { BULLET_WIDTH, BULLET_HEIGHT } from './bullet.js';

describe('player', () => {
  it('starts centered between the playfield bounds', () => {
    const player = createPlayer();
    expect(player.x).toBe((PLAYFIELD_LEFT + PLAYFIELD_RIGHT - PLAYER_WIDTH) / 2);
  });

  it('moves by speed * dt in the current move direction', () => {
    const player = createPlayer();
    const startX = player.x;
    player.moveDirection = 1;
    updatePlayer(player, 0.1);
    expect(player.x).toBeCloseTo(startX + PLAYER_SPEED * 0.1);
  });

  it('clamps to the left playfield edge', () => {
    const player = createPlayer();
    player.x = PLAYFIELD_LEFT + 1;
    player.moveDirection = -1;
    updatePlayer(player, 1); // large dt, would overshoot past the edge
    expect(player.x).toBe(PLAYFIELD_LEFT);
  });

  it('clamps to the right playfield edge', () => {
    const player = createPlayer();
    player.x = PLAYFIELD_RIGHT - PLAYER_WIDTH - 1;
    player.moveDirection = 1;
    updatePlayer(player, 1);
    expect(player.x).toBe(PLAYFIELD_RIGHT - PLAYER_WIDTH);
  });

  it('shoots a bullet from its center when no bullet is active', () => {
    const player = createPlayer();
    const bullet = tryShoot(player, false);
    expect(bullet).not.toBeNull();
    expect(bullet.x).toBeCloseTo(player.x + player.width / 2 - BULLET_WIDTH / 2);
    expect(bullet.y).toBe(player.y);
    expect(bullet.vy).toBe(PLAYER_BULLET_SPEED);
    expect(bullet.owner).toBe('player');
    expect(bullet.width).toBe(BULLET_WIDTH);
    expect(bullet.height).toBe(BULLET_HEIGHT);
  });

  it('refuses to shoot while a bullet is already active', () => {
    const player = createPlayer();
    const bullet = tryShoot(player, true);
    expect(bullet).toBeNull();
  });
});
