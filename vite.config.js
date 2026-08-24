import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        demo: resolve(__dirname, 'games/demo/index.html'),
      },
    },
  },
});
