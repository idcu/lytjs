import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  resolve: {
    alias: {
      // ⚠️ 指向 **src** 而非 dist：`tsup` 以 `define: { __DEV__: 'false' }` 产出**生产版** dist，
      // 其中 `warn` / `warnOnce` 被压成空操作。若走 dist，任何「DEV 下应告警」的断言都**永不成立**
      // ⇒ 包内运行会与根配置（已指向 src）结论不一致。此处与根配置保持一致。
      '@lytjs/common-error': resolve(__dirname, '../common/packages/error/src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
