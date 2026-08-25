import { defineConfig, configDefaults } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/webgl-game-portfolio/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'games/demo/index.html'),
        pacman: resolve(__dirname, 'games/pacman/index.html'),
        invaders: resolve(__dirname, 'games/invaders/index.html'),
        pong: resolve(__dirname, 'games/pong/index.html'),
      },
    },
  },
  test: {
    exclude: [...configDefaults.exclude, 'server/**'],
  },
});
