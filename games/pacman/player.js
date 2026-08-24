import { advance, pixelPosition } from './movement.js';
import { isWall } from './maze.js';

export class Player {
  constructor({ col, row, speed = 5 }) {
    this.col = col;
    this.row = row;
    this.progress = 0;
    this.direction = null;
    this.desiredDirection = null;
    this.speed = speed;
  }

  setDesiredDirection(direction) {
    this.desiredDirection = direction;
  }

  update(dt, grid) {
    advance(this, dt, grid, isWall, (entity) => entity.desiredDirection);
  }

  getPixelPosition(cellSize) {
    return pixelPosition(this, cellSize);
  }
}
