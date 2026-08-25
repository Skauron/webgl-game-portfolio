import { createProgram } from '../../engine/core/Shader.js';

const VERTEX_SOURCE = `
  attribute vec2 aPosition;
  attribute vec2 aLocal;
  varying vec2 vLocal;
  void main() {
    vLocal = aLocal;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

// uGlow toggles a per-fragment radial gradient (bright center fading to the
// quad's edge) on top of the existing time-based pulse — used for pellets
// only. Since the backdrop is pure black, fading the RGB itself toward 0
// reads identically to fading alpha, so no blending state is needed here.
const FRAGMENT_SOURCE = `
  precision mediump float;
  uniform vec4 uColor;
  uniform float uTime;
  uniform float uPulse;
  uniform float uGlow;
  varying vec2 vLocal;
  void main() {
    float brightness = 1.0 - 0.3 * uPulse * (0.5 + 0.5 * sin(uTime * 6.0));
    if (uGlow > 0.5) {
      float radial = smoothstep(1.0, 0.0, length(vLocal));
      gl_FragColor = vec4(uColor.rgb * brightness * radial, uColor.a);
    } else {
      gl_FragColor = vec4(uColor.rgb * brightness, uColor.a);
    }
  }
`;

const LOCAL_OFFSETS = new Float32Array([
  -1, -1, -1, 1, 1, -1,
  1, -1, -1, 1, 1, 1,
]);

export function createQuadRenderer(gl) {
  const program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  const localLocation = gl.getAttribLocation(program, 'aLocal');
  const colorLocation = gl.getUniformLocation(program, 'uColor');
  const timeLocation = gl.getUniformLocation(program, 'uTime');
  const pulseLocation = gl.getUniformLocation(program, 'uPulse');
  const glowLocation = gl.getUniformLocation(program, 'uGlow');

  const buffer = gl.createBuffer();
  const localBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, localBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, LOCAL_OFFSETS, gl.STATIC_DRAW);

  function drawQuad(x, y, width, height, color, { time = 0, pulse = 0, glow = 0 } = {}) {
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

    gl.bindBuffer(gl.ARRAY_BUFFER, localBuffer);
    gl.enableVertexAttribArray(localLocation);
    gl.vertexAttribPointer(localLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(colorLocation, color);
    gl.uniform1f(timeLocation, time);
    gl.uniform1f(pulseLocation, pulse);
    gl.uniform1f(glowLocation, glow);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { drawQuad };
}
