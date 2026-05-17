import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, '../../../common/packages');

export default defineConfig({
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  resolve: {
    alias: {
      '@lytjs/common-is': `${commonRoot}/is/dist/index.mjs`,
      '@lytjs/common-env': `${commonRoot}/env/dist/index.mjs`,
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
