export const GRID_COLS = 5;
export const GRID_ROWS = 5;
export const SPACING = 48;
export const INVADER_SIZE = 32;
export const STEP_DISTANCE = 8;
export const DESCEND_DISTANCE = 16;
export const PLAYFIELD_LEFT = 16;
export const PLAYFIELD_RIGHT = 464;
export const MIN_INTERVAL = 0.15;
export const MAX_INTERVAL = 0.8;
export const TOTAL_INVADERS = GRID_COLS * GRID_ROWS;
export const GRID_PIXEL_WIDTH = (GRID_COLS - 1) * SPACING + INVADER_SIZE;
export const GRID_PIXEL_HEIGHT = (GRID_ROWS - 1) * SPACING + INVADER_SIZE;

export function createFormation() {
  const alive = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    alive.push(new Array(GRID_COLS).fill(true));
  }
  return {
    alive,
    x: 96,
    y: 48,
    direction: 1,
    frame: 'A',
    stepTimer: 0,
  };
}

export function countAliveInvaders(formation) {
  let count = 0;
  for (const row of formation.alive) {
    for (const cell of row) {
      if (cell) count += 1;
    }
  }
  return count;
}

export function stepInterval(aliveCount) {
  const clamped = Math.max(1, Math.min(TOTAL_INVADERS, aliveCount));
  const t = (clamped - 1) / (TOTAL_INVADERS - 1);
  return MIN_INTERVAL + (MAX_INTERVAL - MIN_INTERVAL) * t;
}

export function updateFormation(formation, dt) {
  formation.stepTimer += dt;
  const interval = stepInterval(countAliveInvaders(formation));
  if (formation.stepTimer < interval) return;
  formation.stepTimer = 0;

  const nextX = formation.x + formation.direction * STEP_DISTANCE;

  if (nextX < PLAYFIELD_LEFT || nextX + GRID_PIXEL_WIDTH > PLAYFIELD_RIGHT) {
    formation.y += DESCEND_DISTANCE;
    formation.direction *= -1;
  } else {
    formation.x = nextX;
  }

  formation.frame = formation.frame === 'A' ? 'B' : 'A';
}

export function invaderPosition(formation, col, row) {
  return {
    x: formation.x + col * SPACING,
    y: formation.y + row * SPACING,
  };
}

export function killInvader(formation, col, row) {
  formation.alive[row][col] = false;
}
