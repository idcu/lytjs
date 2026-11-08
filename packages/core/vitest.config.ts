import { defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from '../../vitest.config';

// 单包配置以根配置为基线：alias / define / setupFiles 全部继承根配置的「指向 src」口径。
// 此前本文件自带一份 dist 别名表且漏了 @lytjs/core-vnode / @lytjs/core-signal：
// 包内源码的裸 import 解析到 dist，而测试直接 import 兄弟包 src ⇒ 身份对拍假红；
// 同时 dist 的 __DEV__ 已被压成 false ⇒ 「DEV 应告警」断言也假红。
export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.ts'],
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
  }),
);
