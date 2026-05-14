import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/core': `${pkgRoot}/../../core/dist/index.mjs`,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
