import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  test: {
    environment: 'node',
    globals: true,
    // 对齐根配置的全局 setup：本包 jsdom 存储用例依赖它把 Node ≥26 的空 localStorage
    // 换回 jsdom 自己的实现（见仓库根 vitest.setup.ts），否则 2 个用例假红。
    setupFiles: [resolve(here, '../../../../vitest.setup.ts')],
  },
});
