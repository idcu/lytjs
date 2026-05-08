import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesRoot = resolve(__dirname, '..');
const commonRoot = resolve(packagesRoot, 'common/packages');

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/reactivity': resolve(packagesRoot, 'reactivity/dist/index.mjs'),
      '@lytjs/common-is': `${commonRoot}/is/dist/index.mjs`,
      '@lytjs/common-scheduler': `${commonRoot}/scheduler/dist/index.mjs`,
      '@lytjs/common-error': `${commonRoot}/error/dist/index.mjs`,
      '@lytjs/shared-types': resolve(packagesRoot, 'shared-types/dist/index.mjs'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: true,
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
  },
});
