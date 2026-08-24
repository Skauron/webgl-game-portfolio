import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLoop } from './GameLoop.js';

describe('GameLoop', () => {
  let rafCallbacks;

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    let time = 0;
    vi.stubGlobal('performance', { now: () => time });
    globalThis.__advanceTime = (ms) => {
      time += ms;
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function flushOneFrame(ms) {
    globalThis.__advanceTime(ms);
    const cb = rafCallbacks.shift();
    cb(performance.now());
  }

  it('calls update with delta time in seconds and render on each frame', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop({ update, render });

    loop.start();
    flushOneFrame(16);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(0.016);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('does not run update or render after stop', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop({ update, render });

    loop.start();
    loop.stop();
    flushOneFrame(16);

    expect(update).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
});
