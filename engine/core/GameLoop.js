export class GameLoop {
  constructor({ update, render }) {
    this.update = update;
    this.render = render;
    this._running = false;
    this._lastTime = 0;
    this._rafId = null;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick(now) {
    if (!this._running) return;
    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    this.update(dt);
    if (!this._running) return;
    this.render();
    this._rafId = requestAnimationFrame(this._tick);
  }
}
