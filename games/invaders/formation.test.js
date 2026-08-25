import { describe, it, expect } from 'vitest';
import {
  createFormation,
  updateFormation,
  stepInterval,
  invaderPosition,
  killInvader,
  countAliveInvaders,
  STEP_DISTANCE,
  DESCEND_DISTANCE,
  PLAYFIELD_LEFT,
  PLAYFIELD_RIGHT,
  GRID_PIXEL_WIDTH,
  MIN_INTERVAL,
  MAX_INTERVAL,
  TOTAL_INVADERS,
  SPACING,
} from './formation.js';

describe('formation', () => {
  it('does nothing until the step interval elapses, then steps and toggles frame', () => {
    const formation = createFormation();
    const startX = formation.x;

    updateFormation(formation, 0.5);
    expect(formation.x).toBe(startX);
    expect(formation.frame).toBe('A');

    updateFormation(formation, 0.5);
    expect(formation.x).toBe(startX + STEP_DISTANCE);
    expect(formation.frame).toBe('B');
  });

  it('descends and reverses direction when the next step would cross the right edge', () => {
    const formation = createFormation();
    formation.x = PLAYFIELD_RIGHT - GRID_PIXEL_WIDTH;
    formation.direction = 1;
    const startY = formation.y;

    updateFormation(formation, MAX_INTERVAL);

    expect(formation.x).toBe(PLAYFIELD_RIGHT - GRID_PIXEL_WIDTH);
    expect(formation.y).toBe(startY + DESCEND_DISTANCE);
    expect(formation.direction).toBe(-1);
  });

  it('descends and reverses direction when the next step would cross the left edge', () => {
    const formation = createFormation();
    formation.x = PLAYFIELD_LEFT;
    formation.direction = -1;
    const startY = formation.y;

    updateFormation(formation, MAX_INTERVAL);

    expect(formation.x).toBe(PLAYFIELD_LEFT);
    expect(formation.y).toBe(startY + DESCEND_DISTANCE);
    expect(formation.direction).toBe(1);
  });

  it('shortens the step interval as invaders die', () => {
    expect(stepInterval(TOTAL_INVADERS)).toBeCloseTo(MAX_INTERVAL);
    expect(stepInterval(1)).toBeCloseTo(MIN_INTERVAL);
    expect(stepInterval(13)).toBeCloseTo((MIN_INTERVAL + MAX_INTERVAL) / 2, 2);
  });

  it('killInvader marks a cell dead, reducing the alive count', () => {
    const formation = createFormation();
    expect(countAliveInvaders(formation)).toBe(TOTAL_INVADERS);

    killInvader(formation, 2, 3);

    expect(formation.alive[3][2]).toBe(false);
    expect(countAliveInvaders(formation)).toBe(TOTAL_INVADERS - 1);
  });

  it('invaderPosition computes pixel position from the formation origin', () => {
    const formation = createFormation();
    formation.x = 100;
    formation.y = 50;
    const pos = invaderPosition(formation, 2, 1);
    expect(pos).toEqual({ x: 100 + 2 * SPACING, y: 50 + 1 * SPACING });
  });
});
