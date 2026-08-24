import { createGLContext } from '../../engine/core/GLContext.js';

const canvas = document.querySelector('#viewport');
const gl = createGLContext(canvas);
console.log('WebGL context acquired:', gl.getParameter(gl.VERSION));
