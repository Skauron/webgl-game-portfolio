export const DIRECTIONS = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

export const OPPOSITE = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function canMove(isWallFn, grid, col, row, direction) {
  if (!direction) return false;
  const { dc, dr } = DIRECTIONS[direction];
  return !isWallFn(grid, col + dc, row + dr);
}

export function advance(entity, dt, grid, isWallFn, chooseDirection) {
  if (entity.progress === 0) {
    const next = chooseDirection(entity, grid);
    if (next && canMove(isWallFn, grid, entity.col, entity.row, next)) {
      entity.direction = next;
    }
  }

  if (entity.direction === null) return;

  entity.progress += entity.speed * dt;

  while (entity.progress >= 1) {
    entity.progress -= 1;
    const { dc, dr } = DIRECTIONS[entity.direction];
    entity.col += dc;
    entity.row += dr;

    const next = chooseDirection(entity, grid);
    if (next && canMove(isWallFn, grid, entity.col, entity.row, next)) {
      entity.direction = next;
    }

    if (!canMove(isWallFn, grid, entity.col, entity.row, entity.direction)) {
      entity.direction = null;
      entity.progress = 0;
      break;
    }
  }
}

export function pixelPosition(entity, cellSize) {
  const { dc, dr } = entity.direction ? DIRECTIONS[entity.direction] : { dc: 0, dr: 0 };
  return {
    x: (entity.col + dc * entity.progress) * cellSize,
    y: (entity.row + dr * entity.progress) * cellSize,
  };
}
