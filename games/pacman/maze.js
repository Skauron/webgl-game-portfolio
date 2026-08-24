export const WALL = '#';
export const PELLET = '.';
export const EMPTY = 'o';

export const CELL_SIZE = 32;

export const MAZE_TEMPLATE = [
  '#############',
  '#o..#...#..o#',
  '#.#.#.#.#.#.#',
  '#.#.......#.#',
  '#.#.#####.#.#',
  '#.....o...#.#',
  '#.#.#####.#.#',
  '#.#.......#.#',
  '#.#.#.#.#.#.#',
  '#...#...#...#',
  '#############',
];

export const PLAYER_SPAWN = { col: 6, row: 5 };
export const GHOST_SPAWNS = [
  { col: 1, row: 1 },
  { col: 11, row: 1 },
];

export function createGrid() {
  return MAZE_TEMPLATE.map((row) => row.split(''));
}

export function isWall(grid, col, row) {
  if (row < 0 || row >= grid.length) return true;
  if (col < 0 || col >= grid[row].length) return true;
  return grid[row][col] === WALL;
}

export function cellToPixel(col, row, cellSize = CELL_SIZE) {
  return { x: col * cellSize, y: row * cellSize };
}

export function countRemainingPellets(grid) {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === PELLET) count += 1;
    }
  }
  return count;
}

export function consumePellet(grid, col, row) {
  if (grid[row][col] === PELLET) {
    grid[row][col] = EMPTY;
    return true;
  }
  return false;
}
