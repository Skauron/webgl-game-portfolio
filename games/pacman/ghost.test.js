import { describe, it, expect } from 'vitest';
import { Ghost } from './ghost.js';

const RING_GRID_TEMPLATE = ['#####', '#...#', '#.#.#', '#...#', '#####'];
const ringGrid = () => RING_GRID_TEMPLATE.map((row) => row.split(''));

const DEAD_END_GRID_TEMPLATE = ['#####', '#...#', '#.###', '#####'];
const deadEndGrid = () => DEAD_END_GRID_TEMPLATE.map((row) => row.split(''));

describe('Ghost', () => {
  it('excludes reversing when another valid direction exists', () => {
    const grid = ringGrid();
    const ghost = new Ghost({ col: 2, row: 1, speed: 4, random: () => 0 });
    ghost.direction = 'left'; // was already moving left, arriving at (2,1)

    ghost.update(0.001, grid);

    // At (2,1): up/down are walls, left/right are both open. Reversing
    // 'left' would mean picking 'right' — it must not, since 'left' itself
    // (continuing) is a valid, non-reversing option.
    expect(ghost.direction).toBe('left');
  });

  it('reverses only when it is the sole valid direction (dead end)', () => {
    const grid = deadEndGrid();
    const ghost = new Ghost({ col: 1, row: 2, speed: 4, random: () => 0 });
    ghost.direction = 'down'; // arrived at the dead end moving down

    ghost.update(0.001, grid);

    // (1,2) only connects back to (1,1) via 'up' — the reverse of 'down'.
    // With no other option, it must take it.
    expect(ghost.direction).toBe('up');
  });

  it('never chooses a direction that leads into a wall, across many random draws', () => {
    const grid = ringGrid();

    for (let i = 0; i < 20; i += 1) {
      const randomValue = i / 20;
      const ghost = new Ghost({ col: 1, row: 1, speed: 4, random: () => randomValue });
      ghost.update(0.001, grid);
      // (1,1)'s only open neighbors are 'down' and 'right' — up/left are
      // the border walls.
      expect(['down', 'right']).toContain(ghost.direction);
    }
  });
});
