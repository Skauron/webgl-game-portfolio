import { Engine } from '../../engine/core/Engine.js';
import { connect } from './net.js';
import { createRenderer } from './renderer.js';
import { WS_URL } from './config.js';

const canvas = document.querySelector('#viewport');
const statusEl = document.querySelector('#status');

let drawQuad;

function update() {}

function render(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  drawQuad(20, 185, 12, 80, [1, 1, 1, 1]);
  drawQuad(394, 219, 12, 12, [1, 1, 1, 1]);
}

const engine = new Engine({ canvas, update, render });
({ drawQuad } = createRenderer(engine.gl));
engine.start();

connect(WS_URL, {
  onOpen: () => {
    statusEl.textContent = 'Connected';
  },
  onMessage: (message) => {
    console.log('received:', message);
  },
});
