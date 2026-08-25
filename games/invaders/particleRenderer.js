import { createProgram } from '../../engine/core/Shader.js';
import { ortho } from '../../engine/core/mat4.js';

const VERTEX_SOURCE = `
  attribute vec2 aOffset;
  uniform vec2 uCenter;
  uniform float uSize;
  uniform mat4 uProjection;
  void main() {
    vec2 worldPos = uCenter + aOffset * uSize;
    gl_Position = uProjection * vec4(worldPos, 0.0, 1.0);
  }
`;

// Hard-edged square (no radial falloff) so particles read as blocky pixel-art
// embers, not soft photographic glow — matches the sprite atlas's NEAREST-
// filtered look. Color cools through a fixed, quantized ramp (bright white-
// yellow -> orange -> dark red) as the particle ages, the way limited-palette
// sprite explosions animate through a handful of discrete frames rather than
// a smooth analog fade.
const FRAGMENT_SOURCE = `
  precision mediump float;
  uniform float uLifeRatio;
  void main() {
    float step4 = ceil(uLifeRatio * 4.0) / 4.0;
    vec3 color;
    if (step4 > 0.7) {
      color = vec3(1.0, 0.95, 0.55);
    } else if (step4 > 0.45) {
      color = vec3(1.0, 0.55, 0.15);
    } else {
      color = vec3(0.65, 0.12, 0.05);
    }
    gl_FragColor = vec4(color, step4);
  }
`;

const QUAD_OFFSETS = new Float32Array([
  -1, -1, -1, 1, 1, -1,
  1, -1, -1, 1, 1, 1,
]);

const PARTICLE_SIZE = 4;

export function createParticleRenderer(gl) {
  const program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  const offsetLocation = gl.getAttribLocation(program, 'aOffset');
  const centerLocation = gl.getUniformLocation(program, 'uCenter');
  const sizeLocation = gl.getUniformLocation(program, 'uSize');
  const lifeRatioLocation = gl.getUniformLocation(program, 'uLifeRatio');
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

    for (const particle of particles) {
      // Round to whole canvas pixels so blocky-square edges stay crisp
      // instead of picking up sub-pixel antialiasing at this resolution.
      gl.uniform2f(centerLocation, Math.round(particle.x), Math.round(particle.y));
      gl.uniform1f(lifeRatioLocation, particle.life / particle.maxLife);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.disable(gl.BLEND);
  }

  return { drawParticles };
}
