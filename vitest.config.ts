import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 使用 import.meta.url 获取当前目录（ESM 兼容）
const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  resolve: {
    alias: {
      // common 子包
      '@lytjs/common-is': resolve(root, 'packages/common/packages/is/dist/index.mjs'),
      '@lytjs/common-scheduler': resolve(root, 'packages/common/packages/scheduler/dist/index.mjs'),
      '@lytjs/common-error': resolve(root, 'packages/common/packages/error/dist/index.mjs'),
      '@lytjs/common-vnode': resolve(root, 'packages/common/packages/vnode/dist/index.mjs'),
      '@lytjs/common-string': resolve(root, 'packages/common/packages/string/dist/index.mjs'),
      '@lytjs/common-security': resolve(root, 'packages/common/packages/security/dist/index.mjs'),
      '@lytjs/common-events': resolve(root, 'packages/common/packages/events/dist/index.mjs'),
      '@lytjs/common-object': resolve(root, 'packages/common/packages/object/dist/index.mjs'),
      '@lytjs/common-algorithm': resolve(root, 'packages/common/packages/algorithm/dist/index.mjs'),
      '@lytjs/common-timing': resolve(root, 'packages/common/packages/timing/dist/index.mjs'),
      '@lytjs/common-cache': resolve(root, 'packages/common/packages/cache/dist/index.mjs'),
      '@lytjs/common-env': resolve(root, 'packages/common/packages/env/dist/index.mjs'),
      '@lytjs/common-constants': resolve(root, 'packages/common/packages/constants/dist/index.mjs'),
      '@lytjs/common-dom': resolve(root, 'packages/common/packages/dom/dist/index.mjs'),
      '@lytjs/common-dom-helpers': resolve(
        root,
        'packages/common/packages/dom-helpers/dist/index.mjs',
      ),
      '@lytjs/common-path': resolve(root, 'packages/common/packages/path/dist/index.mjs'),
      '@lytjs/common-query': resolve(root, 'packages/common/packages/query/dist/index.mjs'),
      '@lytjs/common-a11y': resolve(root, 'packages/common/packages/a11y/dist/index.mjs'),
      '@lytjs/common-keyboard': resolve(root, 'packages/common/packages/keyboard/dist/index.mjs'),
      '@lytjs/common-storage': resolve(root, 'packages/common/packages/storage/dist/index.mjs'),
      '@lytjs/common-validate': resolve(root, 'packages/common/packages/validate/dist/index.mjs'),
      '@lytjs/common-http': resolve(root, 'packages/common/packages/http/dist/index.mjs'),
      '@lytjs/common-raf': resolve(root, 'packages/common/packages/raf/dist/index.mjs'),
      '@lytjs/common-render-queue': resolve(
        root,
        'packages/common/packages/render-queue/dist/index.mjs',
      ),
      '@lytjs/common-event-normalizer': resolve(
        root,
        'packages/common/packages/event-normalizer/dist/index.mjs',
      ),
      '@lytjs/common-node-cache': resolve(
        root,
        'packages/common/packages/node-cache/dist/index.mjs',
      ),
      '@lytjs/common-async-scheduler': resolve(
        root,
        'packages/common/packages/async-scheduler/dist/index.mjs',
      ),
      '@lytjs/common-transition-engine': resolve(
        root,
        'packages/common/packages/transition-engine/dist/index.mjs',
      ),
      '@lytjs/common-performance': resolve(
        root,
        'packages/common/packages/performance/dist/index.mjs',
      ),
      '@lytjs/common-assertions': resolve(
        root,
        'packages/common/packages/assertions/dist/index.mjs',
      ),
      // 主包
      '@lytjs/shared-types': resolve(root, 'packages/shared-types/src'),
      '@lytjs/host-contract': resolve(root, 'packages/host-contract/src'),
      '@lytjs/vdom': resolve(root, 'packages/vdom/dist/index.mjs'),
      '@lytjs/vdom/transition': resolve(root, 'packages/vdom/dist/transition.mjs'),
      '@lytjs/core': resolve(root, 'packages/core/dist/index.mjs'),
      '@lytjs/reactivity': resolve(root, 'packages/reactivity/dist/index.mjs'),
      '@lytjs/reactivity/scope': resolve(root, 'packages/reactivity/dist/scope.mjs'),
      '@lytjs/reactivity/async': resolve(root, 'packages/reactivity/dist/async.mjs'),
      '@lytjs/renderer': resolve(root, 'packages/renderer/dist/index.mjs'),
      '@lytjs/component': resolve(root, 'packages/component/dist/index.mjs'),
      '@lytjs/compiler': resolve(root, 'packages/compiler/dist/index.mjs'),
      '@lytjs/core-vnode': resolve(root, 'packages/core-vnode/src'),
      '@lytjs/core-signal': resolve(root, 'packages/core-signal/src'),
      '@lytjs/adapter-web': resolve(root, 'packages/adapter-web/src'),
      '@lytjs/dom-runtime': resolve(root, 'packages/dom-runtime/src'),
      '@lytjs/dom': resolve(root, 'packages/dom/dist/index.mjs'),
      // 插件包
      '@lytjs/plugin-theme': resolve(root, 'packages/plugins/packages/plugin-theme/dist/index.mjs'),
      '@lytjs/plugin-logger': resolve(
        root,
        'packages/plugins/packages/plugin-logger/dist/index.mjs',
      ),
      '@lytjs/plugin-auth': resolve(root, 'packages/plugins/packages/plugin-auth/dist/index.mjs'),
      '@lytjs/plugin-storage': resolve(
        root,
        'packages/plugins/packages/plugin-storage/dist/index.mjs',
      ),
      '@lytjs/plugin-i18n': resolve(root, 'packages/plugins/packages/plugin-i18n/dist/index.mjs'),
      '@lytjs/plugin-vite': resolve(root, 'packages/plugins/packages/plugin-vite/dist/index.mjs'),
    },
    conditions: ['import', 'node', 'default'],
  },
  test: {
    environment: 'node',
    globals: true,
    // 使用绝对路径的全局 setup 文件
    setupFiles: [resolve(root, './vitest.setup.ts')],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    // 排除 E2E 测试（使用 Playwright，不是 Vitest）
    // 说明：此前还整体排除了 web / plugin-animation / devtools 等包级测试，
    // 但 CI 只跑根 test:coverage，这些"自己的 vitest 配置"从未被执行 —— 等于没测。
    // 现全部纳入根运行；需要浏览器环境的文件用文件头 `// @vitest-environment jsdom` 声明。
    // `**/dist/**` 必须排除：dist 是构建产物（每个包一份 .mjs/.cjs/.map），
    // 让 vitest 的 glob 去扫描它们既无意义又徒增开销（2026-09-24 环境排查时发现此前遗漏）。
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/playground/e2e/**'],
    coverage: {
      provider: 'v8',
      // 覆盖率分母覆盖全部源码区（此前漏掉 ecosystem / plugins / tools，
      // 导致约 49.5% 源码不参与 85% 阈值校验）
      include: [
        'packages/*/src/**/*.ts',
        'packages/common/packages/*/src/**/*.ts',
        'packages/ecosystem/packages/**/src/**/*.ts',
        'packages/ecosystem/packages/**/packages/*/src/**/*.ts',
        'packages/plugins/packages/*/src/**/*.ts',
        'packages/tools/packages/*/src/**/*.ts',
      ],
      exclude: [
        'packages/*/src/**/*.test.ts',
        'packages/*/src/**/*.spec.ts',
        'packages/shared-types/**',
        'packages/_templates/**',
      ],
      // ⚠️ 阈值口径（2026-09-21 实测校正）
      //
      // 此前 include 只覆盖 packages/*/src 与 common/packages/*/src，
      // 有约 49.5% 的源码（ecosystem / plugins / tools）不计入分母，
      // 于是"85% 达标"只是在半壁江山上成立。分母补全后的真实数字为：
      //   statements 48.77% / lines 48.77% / functions 63.46% / branches 80.09%
      // 这里把阈值设为**略低于当前真实值**，让门禁立刻变诚实且能防回退；
      // 之后每次覆盖提升都同步上调阈值（棘轮式收紧），目标 85%。
      // 规则：只允许上调，不允许为了让 CI 变绿而下调。
      thresholds: {
        lines: 48,
        functions: 63,
        branches: 80,
        statements: 48,
      },
    },
  },
});
