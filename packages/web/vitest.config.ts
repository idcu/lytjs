import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/common-is': resolve(root, '../../common/packages/is/dist/index.mjs'),
      '@lytjs/common-dom': resolve(root, '../../common/packages/dom/dist/index.mjs'),
      '@lytjs/common-object': resolve(root, '../../common/packages/object/dist/index.mjs'),
    },
    conditions: ['import', 'node', 'default'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
