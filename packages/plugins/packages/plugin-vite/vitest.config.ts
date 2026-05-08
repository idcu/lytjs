import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, '../../../common/packages');
const pkgRoot = resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/compiler': `${pkgRoot}/../../compiler/dist/index.mjs`,
      '@lytjs/common-is': `${commonRoot}/is/dist/index.mjs`,
      '@lytjs/shared-types': `${pkgRoot}/../../shared-types/dist/index.mjs`,
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
