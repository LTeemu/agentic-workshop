import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 4469,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
  },
});
