import { Engine } from '../../engine/core/Engine.js';
import { createQuadRenderer } from './renderer.js';

const canvas = document.querySelector('#viewport');

function update() {}

let drawQuad;

function render(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  drawQuad(100, 100, 64, 64, [0.2, 0.6, 1.0, 1.0]);
}

const engine = new Engine({ canvas, update, render });
({ drawQuad } = createQuadRenderer(engine.gl));
engine.start();
