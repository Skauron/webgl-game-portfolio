import { describe, it, expect } from 'vitest';
import { Player } from './player.js';

const RING_GRID_TEMPLATE = ['#####', '#...#', '#.#.#', '#...#', '#####'];
const ringGrid = () => RING_GRID_TEMPLATE.map((row) => row.split(''));

describe('Player', () => {
  it('turns onto the desired direction from rest and interpolates position while moving', () => {
    const grid = ringGrid();
    const player = new Player({ col: 1, row: 1, speed: 5 });
    player.setDesiredDirection('right');

    player.update(0.1, grid); // speed 5 * dt 0.1 = 0.5 progress
    expect(player.col).toBe(1);
    expect(player.row).toBe(1);
    expect(player.direction).toBe('right');
    expect(player.progress).toBeCloseTo(0.5);
    expect(player.getPixelPosition(32)).toEqual({ x: 48, y: 32 });

    player.update(0.1, grid); // progress reaches 1.0, arrives at (2,1)
    expect(player.col).toBe(2);
    expect(player.row).toBe(1);
    expect(player.progress).toBeCloseTo(0);
  });

  it('ignores a buffered turn into a wall and takes it once a valid intersection is reached', () => {
    const grid = ringGrid();
    const player = new Player({ col: 2, row: 1, speed: 5 });
    player.direction = 'right';
    player.setDesiredDirection('down'); // (2,2) is a wall — must be rejected here

    player.update(0.2, grid); // speed 5 * dt 0.2 = 1.0 progress: one full cell step
    // rejected at (2,1) since (2,2) is a wall; continues right to (3,1),
    // where (3,2) is open, so the buffered turn is taken there
    expect(player.col).toBe(3);
    expect(player.row).toBe(1);
    expect(player.direction).toBe('down');
    expect(player.progress).toBe(0);
  });

  it('cannot start moving into a wall and stays at rest', () => {
    const grid = ringGrid();
    const player = new Player({ col: 1, row: 1, speed: 5 });
    player.setDesiredDirection('up'); // (1,0) is the border wall

    player.update(0.2, grid);
    expect(player.col).toBe(1);
    expect(player.row).toBe(1);
    expect(player.direction).toBeNull();
    expect(player.progress).toBe(0);
  });

  it('stops upon arriving at a cell when it cannot continue and has no buffered alternative', () => {
    const grid = ringGrid();
    const player = new Player({ col: 2, row: 1, speed: 5 });
    player.direction = 'right'; // already moving right, no buffered direction set

    player.update(0.2, grid); // arrives at (3,1); continuing right hits the border wall at col 4
    expect(player.col).toBe(3);
    expect(player.row).toBe(1);
    expect(player.direction).toBeNull();
    expect(player.progress).toBe(0);
  });
});
