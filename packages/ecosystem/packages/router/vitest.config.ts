import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../../../..');

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    deps: {
      interopDefault: true,
      // Inline workspace packages
      inline: [
        '@lytjs/reactivity',
        '@lytjs/component',
        '@lytjs/vdom',
        '@lytjs/shared-types',
        '@lytjs/common-is',
        '@lytjs/common-env',
        '@lytjs/common-object',
      ],
    },
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
