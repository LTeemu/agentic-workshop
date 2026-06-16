import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    svelte(),
    federation({
      name: 'mfPlayer',
      filename: 'remoteEntry.js',
      exposes: { './bootstrap': './src/bootstrap.js' },
      shared: {
        svelte: 'peer',
      },
    }),
  ],
  server: {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  },
  build: {
    target: 'esnext',
  },
});
