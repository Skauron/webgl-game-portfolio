import { describe, it, expect } from 'vitest';
import {
  WALL,
  PELLET,
  EMPTY,
  MAZE_TEMPLATE,
  PLAYER_SPAWN,
  createGrid,
  isWall,
  cellToPixel,
  countRemainingPellets,
  consumePellet,
} from './maze.js';

describe('maze', () => {
  it('isWall reports walls, open cells, and out-of-bounds correctly', () => {
    const grid = createGrid();
    expect(isWall(grid, 0, 0)).toBe(true); // border wall
    expect(isWall(grid, 6, 5)).toBe(false); // player spawn (EMPTY, not a wall)
    expect(isWall(grid, -1, 5)).toBe(true); // out of bounds (negative col)
    expect(isWall(grid, 13, 5)).toBe(true); // out of bounds (col beyond width)
    expect(isWall(grid, 6, -1)).toBe(true); // out of bounds (negative row)
    expect(isWall(grid, 6, 11)).toBe(true); // out of bounds (row beyond height)
  });

  it('cellToPixel converts grid coordinates to top-left pixel coordinates', () => {
    expect(cellToPixel(2, 3, 32)).toEqual({ x: 64, y: 96 });
  });

  it('countRemainingPellets matches the number of PELLET cells in the template', () => {
    const expectedPellets = MAZE_TEMPLATE.join('')
      .split('')
      .filter((c) => c === PELLET).length;
    expect(countRemainingPellets(createGrid())).toBe(expectedPellets);
  });

  it('consumePellet clears a pellet and decrements the remaining count; no-ops on non-pellet cells', () => {
    const grid = createGrid();
    const before = countRemainingPellets(grid);

    expect(consumePellet(grid, 1, 3)).toBe(true); // (1,3) is a pellet in the template
    expect(grid[3][1]).toBe(EMPTY);
    expect(countRemainingPellets(grid)).toBe(before - 1);

    expect(consumePellet(grid, 0, 0)).toBe(false); // wall cell, no-op
    expect(consumePellet(grid, 6, 5)).toBe(false); // EMPTY spawn cell, no-op
    expect(countRemainingPellets(grid)).toBe(before - 1);
  });

  it('every non-wall cell is reachable from the player spawn (maze is fully connected)', () => {
    const grid = createGrid();
    const totalOpenCells = grid.flat().filter((cell) => cell !== WALL).length;

    const visited = new Set([`${PLAYER_SPAWN.col},${PLAYER_SPAWN.row}`]);
    const queue = [[PLAYER_SPAWN.col, PLAYER_SPAWN.row]];

    while (queue.length > 0) {
      const [col, row] = queue.shift();
      const neighbors = [
        [col + 1, row],
        [col - 1, row],
        [col, row + 1],
        [col, row - 1],
      ];
      for (const [nc, nr] of neighbors) {
        const key = `${nc},${nr}`;
        if (!visited.has(key) && !isWall(grid, nc, nr)) {
          visited.add(key);
          queue.push([nc, nr]);
        }
      }
    }

    expect(visited.size).toBe(totalOpenCells);
  });
});
