import { createProgram } from '../../engine/core/Shader.js';
import { ortho } from '../../engine/core/mat4.js';

const VERTEX_SOURCE = `
  attribute vec2 aOffset;
  uniform vec2 uCenter;
  uniform float uSize;
  uniform mat4 uProjection;
  varying vec2 vOffset;
  void main() {
    vOffset = aOffset;
    vec2 worldPos = uCenter + aOffset * uSize;
    gl_Position = uProjection * vec4(worldPos, 0.0, 1.0);
  }
`;

// uHard switches between two looks: a soft radial glow (smoothstep falloff
// across the whole radius — used for the halo/trail, where fuzziness is the
// point) and a hard-edged circle (a single step at the boundary, used for
// the ball itself — a full-radius fade there read as an undefined blur, not
// a defined round shape).
const FRAGMENT_SOURCE = `
  precision mediump float;
  uniform vec4 uColor;
  uniform float uBrightness;
  uniform float uHard;
  varying vec2 vOffset;
  void main() {
    float dist = length(vOffset);
    float mask = uHard > 0.5 ? step(dist, 1.0) : smoothstep(1.0, 0.0, dist);
    gl_FragColor = vec4(uColor.rgb * uBrightness * mask, uColor.a);
  }
`;

const QUAD_OFFSETS = new Float32Array([
  -1, -1, -1, 1, 1, -1,
  1, -1, -1, 1, 1, 1,
]);

export function createGlowRenderer(gl) {
  const program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  const offsetLocation = gl.getAttribLocation(program, 'aOffset');
  const centerLocation = gl.getUniformLocation(program, 'uCenter');
  const sizeLocation = gl.getUniformLocation(program, 'uSize');
  const colorLocation = gl.getUniformLocation(program, 'uColor');
  const brightnessLocation = gl.getUniformLocation(program, 'uBrightness');
  const hardLocation = gl.getUniformLocation(program, 'uHard');
  const projectionLocation = gl.getUniformLocation(program, 'uProjection');

  const offsetBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_OFFSETS, gl.STATIC_DRAW);

  // Real projection matrix (vs. the flat renderer's manual NDC arithmetic):
  // court pixel space straight to clip space, y-flipped to match this
  // game's top-left-origin convention. Same technique as the explosion
  // particle system, applied here to a second game.
  const projection = ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

  function drawGlow(x, y, size, color, brightness = 1, hard = false) {
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
    gl.enableVertexAttribArray(offsetLocation);
    gl.vertexAttribPointer(offsetLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(projectionLocation, false, projection);
    gl.uniform2f(centerLocation, x, y);
    gl.uniform1f(sizeLocation, size);
    gl.uniform4fv(colorLocation, color);
    gl.uniform1f(brightnessLocation, brightness);
    gl.uniform1f(hardLocation, hard ? 1 : 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { drawGlow };
}
