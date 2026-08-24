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

  it('stopping from within update prevents render that frame and does not double-run after restart', () => {
    const render = vi.fn();
    let stopCalledOnFrame = 0;
    const loop = new GameLoop({
      update: () => {
        stopCalledOnFrame += 1;
        if (stopCalledOnFrame === 1) {
          loop.stop();
        }
      },
      render,
    });

    loop.start();
    flushOneFrame(16); // update() calls stop() on this frame

    expect(render).not.toHaveBeenCalled();
    expect(rafCallbacks.length).toBe(0); // no orphaned rAF scheduled

    // restart and confirm normal single-speed operation
    const update2 = vi.fn();
    const render2 = vi.fn();
    const loop2 = new GameLoop({ update: update2, render: render2 });
    loop2.start();
    flushOneFrame(16);
    flushOneFrame(16);

    expect(update2).toHaveBeenCalledTimes(2);
    expect(render2).toHaveBeenCalledTimes(2);
  });
});
