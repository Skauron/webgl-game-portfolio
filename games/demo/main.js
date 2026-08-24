import { Engine } from '../../engine/core/Engine.js';

const canvas = document.querySelector('#viewport');

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
resize();
window.addEventListener('resize', resize);

let hue = 0;

function update(dt) {
  hue = (hue + dt * 60) % 360;
}

function render(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  const [r, g, b] = hslToRgb(hue / 360, 0.5, 0.5);
  gl.clearColor(r, g, b, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function hslToRgb(h, s, l) {
  const k = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

const engine = new Engine({ canvas, update, render });
engine.start();
