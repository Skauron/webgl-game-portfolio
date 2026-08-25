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

const FRAGMENT_SOURCE = `
  precision mediump float;
  uniform vec4 uColor;
  uniform float uAlpha;
  varying vec2 vOffset;
  void main() {
    float dist = length(vOffset);
    float glow = smoothstep(1.0, 0.0, dist);
    gl_FragColor = vec4(uColor.rgb, uColor.a * uAlpha * glow);
  }
`;

const QUAD_OFFSETS = new Float32Array([
  -1, -1, -1, 1, 1, -1,
  1, -1, -1, 1, 1, 1,
]);

const PARTICLE_SIZE = 5;
const PARTICLE_COLOR = [1.0, 0.6, 0.2, 1.0];

export function createParticleRenderer(gl) {
  const program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  const offsetLocation = gl.getAttribLocation(program, 'aOffset');
  const centerLocation = gl.getUniformLocation(program, 'uCenter');
  const sizeLocation = gl.getUniformLocation(program, 'uSize');
  const colorLocation = gl.getUniformLocation(program, 'uColor');
  const alphaLocation = gl.getUniformLocation(program, 'uAlpha');
  const projectionLocation = gl.getUniformLocation(program, 'uProjection');

  const offsetBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_OFFSETS, gl.STATIC_DRAW);

  // Real projection matrix (vs. the sprite renderer's manual NDC arithmetic):
  // pixel space (0,0 top-left .. canvas size bottom-right) straight to clip
  // space, y-flipped to match this game's top-left-origin convention.
  const projection = ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

  function drawParticles(particles) {
    if (particles.length === 0) return;

    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
    gl.enableVertexAttribArray(offsetLocation);
    gl.vertexAttribPointer(offsetLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(projectionLocation, false, projection);
    gl.uniform1f(sizeLocation, PARTICLE_SIZE);
    gl.uniform4fv(colorLocation, PARTICLE_COLOR);

    for (const particle of particles) {
      gl.uniform2f(centerLocation, particle.x, particle.y);
      gl.uniform1f(alphaLocation, particle.life / particle.maxLife);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.disable(gl.BLEND);
  }

  return { drawParticles };
}
