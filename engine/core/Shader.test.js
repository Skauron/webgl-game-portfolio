import { describe, it, expect, vi } from 'vitest';
import { createProgram } from './Shader.js';

function createMockGL({ shaderCompiles = true, programLinks = true } = {}) {
  return {
    VERTEX_SHADER: 'VERTEX_SHADER',
    FRAGMENT_SHADER: 'FRAGMENT_SHADER',
    COMPILE_STATUS: 'COMPILE_STATUS',
    LINK_STATUS: 'LINK_STATUS',
    createShader: vi.fn((type) => ({ type })),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => shaderCompiles),
    getShaderInfoLog: vi.fn(() => 'mock shader error'),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => programLinks),
    getProgramInfoLog: vi.fn(() => 'mock link error'),
    deleteProgram: vi.fn(),
  };
}

describe('createProgram', () => {
  it('returns a linked program when compilation and linking succeed', () => {
    const gl = createMockGL();
    const program = createProgram(gl, 'vertex source', 'fragment source');

    expect(program).toBeDefined();
    expect(gl.linkProgram).toHaveBeenCalledWith(program);

    const vertexShader = gl.createShader.mock.results[0].value;
    const fragmentShader = gl.createShader.mock.results[1].value;
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(gl.deleteShader).toHaveBeenCalledWith(vertexShader);
    expect(gl.deleteShader).toHaveBeenCalledWith(fragmentShader);
    expect(gl.deleteProgram).not.toHaveBeenCalled();
  });

  it('throws with the driver log when shader compilation fails', () => {
    const gl = createMockGL({ shaderCompiles: false });

    expect(() => createProgram(gl, 'bad vertex', 'fragment source')).toThrow(
      'Shader compile failed: mock shader error'
    );
  });

  it('throws with the driver log when program linking fails', () => {
    const gl = createMockGL({ programLinks: false });

    expect(() => createProgram(gl, 'vertex source', 'fragment source')).toThrow(
      'Program link failed: mock link error'
    );
  });

  it('deletes both shaders and the program when linking fails', () => {
    const gl = createMockGL({ programLinks: false });

    expect(() => createProgram(gl, 'vertex source', 'fragment source')).toThrow();

    const vertexShader = gl.createShader.mock.results[0].value;
    const fragmentShader = gl.createShader.mock.results[1].value;
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(gl.deleteShader).toHaveBeenCalledWith(vertexShader);
    expect(gl.deleteShader).toHaveBeenCalledWith(fragmentShader);
  });
});
