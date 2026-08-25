export function loadTexture(gl, url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Renderers using this texture pair UV v=0 with the top of the
      // on-screen quad (see games/invaders/renderer.js's toNDC/drawSprite).
      // With FLIP_Y left at its default (false), image row 0 (the visual
      // top of the source PNG) uploads to texel row 0 = v=0, which is
      // exactly the pairing that convention needs — no flip required.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      resolve({ texture, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => reject(new Error(`Failed to load texture: ${url}`));
    image.src = url;
  });
}
