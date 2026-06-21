import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: parseInt(process.env.PORT, 10) || 5173,
    strictPort: false,
  },
});
