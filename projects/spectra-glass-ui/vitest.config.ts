import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright({}),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
    css: true,
  },
  optimizeDeps: {
    include: ['lit/directives/unsafe-html.js'],
  },
});
