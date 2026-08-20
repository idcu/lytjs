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
      // 指向 monorepo 内 core/reactivity 构建产物，避免 renderer 内部惰性 import('@lytjs/core') 解析失败
      '@lytjs/core': `${pkgRoot}/../core/dist/index.mjs`,
      '@lytjs/reactivity': `${pkgRoot}/../reactivity/dist/index.mjs`,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
    },
  },
});
