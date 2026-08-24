export const BARRIER_WIDTH = 48;
export const BARRIER_HEIGHT = 24;
export const BARRIER_MAX_HITS = 4;

export function createBarrier(x, y) {
  return { x, y, width: BARRIER_WIDTH, height: BARRIER_HEIGHT, hitPoints: BARRIER_MAX_HITS };
}

export function hitBarrier(barrier) {
  barrier.hitPoints -= 1;
  return barrier.hitPoints <= 0;
}
