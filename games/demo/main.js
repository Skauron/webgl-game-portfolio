import { Engine } from '../../engine/core/Engine.js';
import { createProgram } from '../../engine/core/Shader.js';

const canvas = document.querySelector('#viewport');

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
resize();
window.addEventListener('resize', resize);

const VERTEX_SOURCE = `
  attribute vec2 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SOURCE = `
  precision mediump float;
  void main() {
    gl_FragColor = vec4(1.0, 0.4, 0.1, 1.0);
  }
`;

const TRIANGLE_VERTICES = new Float32Array([
  0.0, 0.6,
  -0.6, -0.6,
  0.6, -0.6,
]);

let drawTriangle = null;

function setup(gl) {
  const program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  const positionLocation = gl.getAttribLocation(program, 'aPosition');

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE_VERTICES, gl.STATIC_DRAW);

  drawTriangle = () => {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

function update() {}

function render(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.07, 0.07, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  drawTriangle();
}

const engine = new Engine({ canvas, update, render });
setup(engine.gl);
engine.start();
