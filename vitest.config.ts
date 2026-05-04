import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const commonRoot = resolve('/workspace/lytjs/packages/common/packages');

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/common-is': resolve(commonRoot, 'is/dist/index.mjs'),
      '@lytjs/common-scheduler': resolve(commonRoot, 'scheduler/dist/index.mjs'),
      '@lytjs/common-error': resolve(commonRoot, 'error/dist/index.mjs'),
      '@lytjs/common-vnode': resolve(commonRoot, 'vnode/dist/index.mjs'),
      '@lytjs/common-string': resolve(commonRoot, 'string/dist/index.mjs'),
      '@lytjs/common-security': resolve(commonRoot, 'security/dist/index.mjs'),
      '@lytjs/common-events': resolve(commonRoot, 'events/dist/index.mjs'),
      '@lytjs/common-object': resolve(commonRoot, 'object/dist/index.mjs'),
      '@lytjs/common-algorithm': resolve(commonRoot, 'algorithm/dist/index.mjs'),
      '@lytjs/common-timing': resolve(commonRoot, 'timing/dist/index.mjs'),
      '@lytjs/common-cache': resolve(commonRoot, 'cache/dist/index.mjs'),
      '@lytjs/common-env': resolve(commonRoot, 'env/dist/index.mjs'),
      '@lytjs/shared-types': resolve('/workspace/lytjs/packages/shared-types/src'),
      '@lytjs/vdom': resolve('/workspace/lytjs/packages/vdom/dist/index.mjs'),
      '@lytjs/core': resolve('/workspace/lytjs/packages/core/dist/index.mjs'),
      '@lytjs/reactivity': resolve('/workspace/lytjs/packages/reactivity/dist/index.mjs'),
      '@lytjs/renderer': resolve('/workspace/lytjs/packages/renderer/dist/index.mjs'),
      '@lytjs/component': resolve('/workspace/lytjs/packages/component/dist/index.mjs'),
      '@lytjs/compiler': resolve('/workspace/lytjs/packages/compiler/dist/index.mjs'),
      '@lytjs/core-vnode': resolve('/workspace/lytjs/packages/core-vnode/src'),
      '@lytjs/core-signal': resolve('/workspace/lytjs/packages/core-signal/src'),
      '@lytjs/adapter-web': resolve('/workspace/lytjs/packages/adapter-web/src'),
      '@lytjs/dom-runtime': resolve('/workspace/lytjs/packages/dom-runtime/src'),
      '@lytjs/runtime-convergence': resolve('/workspace/lytjs/packages/runtime-convergence/src'),
      '@lytjs/host-contract': resolve('/workspace/lytjs/packages/host-contract/src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./packages/reactivity/tests/setup.ts'],
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
        // 全局阈值 - 确保整体质量基线
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,
      },
    },
  },
});
