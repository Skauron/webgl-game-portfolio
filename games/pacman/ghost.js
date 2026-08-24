import { advance, pixelPosition, DIRECTIONS, OPPOSITE, canMove } from './movement.js';
import { isWall } from './maze.js';

const ALL_DIRECTIONS = Object.keys(DIRECTIONS);

export class Ghost {
  constructor({ col, row, speed = 4, random = Math.random }) {
    this.col = col;
    this.row = row;
    this.progress = 0;
    this.direction = null;
    this.speed = speed;
    this._random = random;
  }

  update(dt, grid) {
    advance(this, dt, grid, isWall, (entity, g) => this._chooseDirection(entity, g));
  }

  _chooseDirection(entity, grid) {
    const options = ALL_DIRECTIONS.filter((direction) =>
      canMove(isWall, grid, entity.col, entity.row, direction)
    );
    const forward = options.filter((direction) => direction !== OPPOSITE[entity.direction]);
    const choices = forward.length > 0 ? forward : options;
    if (choices.length === 0) return null;
    const index = Math.floor(this._random() * choices.length);
    return choices[index];
  }

  getPixelPosition(cellSize) {
    return pixelPosition(this, cellSize);
  }
}
