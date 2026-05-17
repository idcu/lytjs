import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '../..');

export default defineConfig({
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  resolve: {
    alias: {
      '@lytjs/reactivity': `${pkgRoot}/../../reactivity/dist/index.mjs`,
      '@lytjs/component': `${pkgRoot}/../../component/dist/index.mjs`,
      '@lytjs/shared-types': `${pkgRoot}/../../shared-types/dist/index.mjs`,
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
