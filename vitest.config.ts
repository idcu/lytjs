import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 使用 import.meta.url 获取当前目录（ESM 兼容）
const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
      '@lytjs/common-dom-helpers': resolve(root, 'packages/common/packages/dom-helpers/dist/index.mjs'),
      '@lytjs/common-path': resolve(root, 'packages/common/packages/path/dist/index.mjs'),
      '@lytjs/common-query': resolve(root, 'packages/common/packages/query/dist/index.mjs'),
      '@lytjs/common-a11y': resolve(root, 'packages/common/packages/a11y/dist/index.mjs'),
      '@lytjs/common-keyboard': resolve(root, 'packages/common/packages/keyboard/dist/index.mjs'),
      '@lytjs/common-storage': resolve(root, 'packages/common/packages/storage/dist/index.mjs'),
      '@lytjs/common-validate': resolve(root, 'packages/common/packages/validate/dist/index.mjs'),
      '@lytjs/common-http': resolve(root, 'packages/common/packages/http/dist/index.mjs'),
      '@lytjs/common-raf': resolve(root, 'packages/common/packages/raf/dist/index.mjs'),
      '@lytjs/common-render-queue': resolve(root, 'packages/common/packages/render-queue/dist/index.mjs'),
      '@lytjs/common-event-normalizer': resolve(root, 'packages/common/packages/event-normalizer/dist/index.mjs'),
      '@lytjs/common-node-cache': resolve(root, 'packages/common/packages/node-cache/dist/index.mjs'),
      '@lytjs/common-async-scheduler': resolve(root, 'packages/common/packages/async-scheduler/dist/index.mjs'),
      '@lytjs/common-transition-engine': resolve(root, 'packages/common/packages/transition-engine/dist/index.mjs'),
      '@lytjs/common-performance': resolve(root, 'packages/common/packages/performance/dist/index.mjs'),
      '@lytjs/common-assertions': resolve(root, 'packages/common/packages/assertions/dist/index.mjs'),
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
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./packages/reactivity/tests/setup.ts'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'packages/common/packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.test.ts',
        'packages/*/src/**/*.spec.ts',
        'packages/shared-types/**',
        'packages/_templates/**',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
