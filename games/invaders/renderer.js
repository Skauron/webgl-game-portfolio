import { createProgram } from '../../engine/core/Shader.js';

const VERTEX_SOURCE = `
  attribute vec2 aPosition;
  attribute vec2 aUV;
  varying vec2 vUV;
  void main() {
    vUV = aUV;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SOURCE = `
  precision mediump float;
  uniform sampler2D uTexture;
  uniform vec4 uColor;
  uniform float uUseTexture;
  varying vec2 vUV;
  void main() {
    if (uUseTexture > 0.5) {
      gl_FragColor = texture2D(uTexture, vUV) * uColor;
    } else {
      gl_FragColor = uColor;
    }
  }
`;

const ATLAS_CELL_COUNT = 5;

export function createSpriteRenderer(gl, texture) {
  const program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  const uvLocation = gl.getAttribLocation(program, 'aUV');
  const colorLocation = gl.getUniformLocation(program, 'uColor');
  const useTextureLocation = gl.getUniformLocation(program, 'uUseTexture');
  const textureLocation = gl.getUniformLocation(program, 'uTexture');

  const positionBuffer = gl.createBuffer();
  const uvBuffer = gl.createBuffer();

  function toNDC(x, y, width, height) {
    const canvas = gl.canvas;
    const x0 = (x / canvas.width) * 2 - 1;
    const x1 = ((x + width) / canvas.width) * 2 - 1;
    const y0 = 1 - (y / canvas.height) * 2;
    const y1 = 1 - ((y + height) / canvas.height) * 2;
    return new Float32Array([x0, y0, x0, y1, x1, y0, x1, y0, x0, y1, x1, y1]);
  }

  function draw(positions, uv, useTexture, color) {
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(useTextureLocation, useTexture ? 1 : 0);
    gl.uniform4fv(colorLocation, color);

    if (useTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(textureLocation, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function drawSprite(x, y, width, height, cellIndex, color = [1, 1, 1, 1]) {
    const u0 = cellIndex / ATLAS_CELL_COUNT;
    const u1 = (cellIndex + 1) / ATLAS_CELL_COUNT;
    const uv = new Float32Array([u0, 0, u0, 1, u1, 0, u1, 0, u0, 1, u1, 1]);
    draw(toNDC(x, y, width, height), uv, true, color);
  }

  function drawQuad(x, y, width, height, color) {
    const uv = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    draw(toNDC(x, y, width, height), uv, false, color);
  }

  return { drawSprite, drawQuad };
}
