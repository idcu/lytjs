import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
