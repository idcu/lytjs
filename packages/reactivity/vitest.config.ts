import { defineConfig } from 'vitest/config';

const commonRoot = '/workspace/lytjs/packages/common/packages';

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/common-is': `${commonRoot}/is/dist/index.mjs`,
      '@lytjs/common-scheduler': `${commonRoot}/scheduler/dist/index.mjs`,
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
