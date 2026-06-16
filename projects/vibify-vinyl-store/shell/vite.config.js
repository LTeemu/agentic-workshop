import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        mfCatalog: 'http://localhost:40071/assets/remoteEntry.js',
        mfPlayer: 'http://localhost:40072/assets/remoteEntry.js',
        mfCheckout: 'http://localhost:40073/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  server: {
    historyApiFallback: true,
    cors: true,
  },
  build: {
    target: 'esnext',
  },
});
