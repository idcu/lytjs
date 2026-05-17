import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const commonRoot = resolve(__dirname, '../../../..');

export default defineConfig({
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  resolve: {
    alias: {
      '@lytjs/common-is': resolve(commonRoot, 'packages/common/packages/is/dist/index.mjs'),
      '@lytjs/common-string': resolve(commonRoot, 'packages/common/packages/string/dist/index.mjs'),
      '@lytjs/common-events': resolve(commonRoot, 'packages/common/packages/events/dist/index.mjs'),
      '@lytjs/common-error': resolve(commonRoot, 'packages/common/packages/error/dist/index.mjs'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
