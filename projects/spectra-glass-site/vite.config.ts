import { defineConfig } from 'vite';

/** Use the workshop PORT env var if set, otherwise default to 4245. */
const port = process.env.PORT ? Number(process.env.PORT) : 4245;

export default defineConfig({
  server: {
    port,
    strictPort: true,
  },
  build: {
    target: 'esnext',
  },
});
