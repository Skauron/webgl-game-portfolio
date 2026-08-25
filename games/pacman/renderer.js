import { createProgram } from '../../engine/core/Shader.js';

const VERTEX_SOURCE = `
  attribute vec2 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SOURCE = `
  precision mediump float;
  uniform vec4 uColor;
  uniform float uTime;
  uniform float uPulse;
  void main() {
    float brightness = 1.0 - 0.3 * uPulse * (0.5 + 0.5 * sin(uTime * 6.0));
    gl_FragColor = vec4(uColor.rgb * brightness, uColor.a);
  }
`;

export function createQuadRenderer(gl) {
  const program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  const colorLocation = gl.getUniformLocation(program, 'uColor');
  const timeLocation = gl.getUniformLocation(program, 'uTime');
  const pulseLocation = gl.getUniformLocation(program, 'uPulse');

  const buffer = gl.createBuffer();

  function quadNDC(x, y, width, height) {
    const canvas = gl.canvas;
    const x0 = (x / canvas.width) * 2 - 1;
    const x1 = ((x + width) / canvas.width) * 2 - 1;
    const y0 = 1 - (y / canvas.height) * 2;
    const y1 = 1 - ((y + height) / canvas.height) * 2;
    return [x0, y0, x0, y1, x1, y0, x1, y0, x0, y1, x1, y1];
  }

  function draw(vertices, color, time, pulse, vertexCount) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(colorLocation, color);
    gl.uniform1f(timeLocation, time);
    gl.uniform1f(pulseLocation, pulse);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  }

  function drawQuad(x, y, width, height, color, { time = 0, pulse = 0 } = {}) {
    draw(new Float32Array(quadNDC(x, y, width, height)), color, time, pulse, 6);
  }

  // Draws many same-color quads (e.g. every maze wall cell, or every
  // uneaten pellet) in one bufferData/drawArrays pair instead of one pair
  // per cell. Pacman's 13x11 maze has up to ~140 wall+pellet cells, and
  // walls in particular never change during play — issuing 140 separate
  // draw calls a frame for mostly-static geometry was the single biggest
  // draw-call cost in this portfolio's four games (see the profiling
  // devlog). Batching only works within a group that shares one color/
  // pulse setting, so walls and pellets are still two separate batches.
  function drawQuadBatch(quads, color, { time = 0, pulse = 0 } = {}) {
    if (quads.length === 0) return;
    const vertices = new Float32Array(quads.length * 12);
    quads.forEach((quad, i) => {
      vertices.set(quadNDC(quad.x, quad.y, quad.width, quad.height), i * 12);
    });
    draw(vertices, color, time, pulse, quads.length * 6);
  }

  return { drawQuad, drawQuadBatch };
}
