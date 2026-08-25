import { Engine } from '../../engine/core/Engine.js';
import { loadTexture } from '../../engine/core/Texture.js';
import { createSpriteRenderer } from './renderer.js';

const canvas = document.querySelector('#viewport');

function update() {}

let drawSprite;
let drawQuad;

function render(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  drawSprite(224, 200, 32, 32, 0);
  drawQuad(100, 350, 48, 24, [0.3, 0.3, 0.3, 1.0]);
}

const engine = new Engine({ canvas, update, render });

loadTexture(engine.gl, new URL('./assets/sprites.png', import.meta.url).href).then(({ texture }) => {
  ({ drawSprite, drawQuad } = createSpriteRenderer(engine.gl, texture));
  engine.start();
});
