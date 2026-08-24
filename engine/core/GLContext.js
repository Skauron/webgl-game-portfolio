export function createGLContext(canvas) {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) {
    throw new Error('WebGL is not supported in this browser.');
  }
  return gl;
}
