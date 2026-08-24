import { createGLContext } from './GLContext.js';
import { GameLoop } from './GameLoop.js';

export class Engine {
  constructor({ canvas, update, render }) {
    this.canvas = canvas;
    this.gl = createGLContext(canvas);
    this.loop = new GameLoop({
      update,
      render: () => render(this.gl),
    });
  }

  start() {
    this.loop.start();
  }

  stop() {
    this.loop.stop();
  }
}
