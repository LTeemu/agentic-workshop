import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfCheckout',
      filename: 'remoteEntry.js',
      exposes: { './bootstrap': './src/bootstrap.jsx' },
      shared: { react: 'peer', 'react-dom': 'peer' },
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
