import { describe, it, expect } from 'vitest';
import { createBullet, updateBullet, BULLET_WIDTH, BULLET_HEIGHT } from './bullet.js';

describe('bullet', () => {
  it('creates a bullet with position, velocity, owner, and its fixed size', () => {
    const bullet = createBullet({ x: 100, y: 200, vy: -300, owner: 'player' });
    expect(bullet).toEqual({
      x: 100,
      y: 200,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      vy: -300,
      owner: 'player',
    });
  });

  it('moves the bullet by velocity * dt and reports it is still on-screen', () => {
    const bullet = createBullet({ x: 100, y: 200, vy: -300, owner: 'player' });
    const stillOnScreen = updateBullet(bullet, 0.1, 480);
    expect(bullet.y).toBeCloseTo(170); // 200 + (-300 * 0.1)
    expect(stillOnScreen).toBe(true);
  });

  it('reports off-screen once the bullet moves above the top edge', () => {
    const bullet = createBullet({ x: 100, y: 10, vy: -300, owner: 'player' });
    const stillOnScreen = updateBullet(bullet, 0.2, 480); // y: 10 -> -50; bottom edge -50+24=-26 <= 0
    expect(stillOnScreen).toBe(false);
  });

  it('reports off-screen once the bullet moves below the bottom edge', () => {
    const bullet = createBullet({ x: 100, y: 470, vy: 300, owner: 'enemy' });
    const stillOnScreen = updateBullet(bullet, 0.1, 480); // y: 470 -> 500; top edge 500 >= 480
    expect(stillOnScreen).toBe(false);
  });
});
