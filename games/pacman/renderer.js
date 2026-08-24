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

  function drawQuad(x, y, width, height, color, { time = 0, pulse = 0 } = {}) {
    const canvas = gl.canvas;
    const x0 = (x / canvas.width) * 2 - 1;
    const x1 = ((x + width) / canvas.width) * 2 - 1;
    const y0 = 1 - (y / canvas.height) * 2;
    const y1 = 1 - ((y + height) / canvas.height) * 2;

    const vertices = new Float32Array([x0, y0, x0, y1, x1, y0, x1, y0, x0, y1, x1, y1]);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(colorLocation, color);
    gl.uniform1f(timeLocation, time);
    gl.uniform1f(pulseLocation, pulse);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { drawQuad };
}
