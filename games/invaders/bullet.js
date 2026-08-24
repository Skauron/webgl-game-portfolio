export const BULLET_WIDTH = 8;
export const BULLET_HEIGHT = 24;

export function createBullet({ x, y, vy, owner }) {
  return { x, y, width: BULLET_WIDTH, height: BULLET_HEIGHT, vy, owner };
}

export function updateBullet(bullet, dt, canvasHeight) {
  bullet.y += bullet.vy * dt;
  return bullet.y + bullet.height > 0 && bullet.y < canvasHeight;
}
