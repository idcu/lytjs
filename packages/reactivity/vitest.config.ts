import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, '../common/packages');

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/common-is': `${commonRoot}/is/dist/index.mjs`,
      '@lytjs/common-scheduler': `${commonRoot}/scheduler/dist/index.mjs`,
      '@lytjs/common-error': `${commonRoot}/error/dist/index.mjs`,
      '@lytjs/common-constants': `${commonRoot}/constants/dist/index.mjs`,
      '@lytjs/common-assertions': `${commonRoot}/assertions/dist/index.mjs`,
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [resolve(__dirname, './tests/setup.ts')],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/edge-cases.test.ts',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/tests/edge-cases.test.ts',
      ],
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
