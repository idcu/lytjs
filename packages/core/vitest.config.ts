import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, '../common/packages');
const packagesRoot = resolve(__dirname, '..');

export default defineConfig({
  resolve: {
    alias: {
      // common 子包
      '@lytjs/common-is': `${commonRoot}/is/dist/index.mjs`,
      '@lytjs/common-scheduler': `${commonRoot}/scheduler/dist/index.mjs`,
      '@lytjs/common-error': `${commonRoot}/error/dist/index.mjs`,
      '@lytjs/common-dom': `${commonRoot}/dom/dist/index.mjs`,
      '@lytjs/common-dom-helpers': `${commonRoot}/dom-helpers/dist/index.mjs`,
      '@lytjs/common-vnode': `${commonRoot}/vnode/dist/index.mjs`,
      '@lytjs/common-string': `${commonRoot}/string/dist/index.mjs`,
      '@lytjs/common-events': `${commonRoot}/events/dist/index.mjs`,
      '@lytjs/common-object': `${commonRoot}/object/dist/index.mjs`,
      '@lytjs/common-algorithm': `${commonRoot}/algorithm/dist/index.mjs`,
      '@lytjs/common-timing': `${commonRoot}/timing/dist/index.mjs`,
      '@lytjs/common-cache': `${commonRoot}/cache/dist/index.mjs`,
      '@lytjs/common-env': `${commonRoot}/env/dist/index.mjs`,
      '@lytjs/common-constants': `${commonRoot}/constants/dist/index.mjs`,
      '@lytjs/common-assertions': `${commonRoot}/assertions/dist/index.mjs`,
      '@lytjs/common-warn': `${commonRoot}/warn/dist/index.mjs`,
      '@lytjs/common-security': `${commonRoot}/security/dist/index.mjs`,
      '@lytjs/common-path': `${commonRoot}/path/dist/index.mjs`,
      '@lytjs/common-http': `${commonRoot}/http/dist/index.mjs`,
      '@lytjs/common-query': `${commonRoot}/query/dist/index.mjs`,
      '@lytjs/common-storage': `${commonRoot}/storage/dist/index.mjs`,
      '@lytjs/common-validate': `${commonRoot}/validate/dist/index.mjs`,
      '@lytjs/common-performance': `${commonRoot}/performance/dist/index.mjs`,
      '@lytjs/common-render-queue': `${commonRoot}/render-queue/dist/index.mjs`,
      '@lytjs/common-raf': `${commonRoot}/raf/dist/index.mjs`,
      '@lytjs/common-keyboard': `${commonRoot}/keyboard/dist/index.mjs`,
      '@lytjs/common-a11y': `${commonRoot}/a11y/dist/index.mjs`,
      '@lytjs/common-node-cache': `${commonRoot}/node-cache/dist/index.mjs`,
      '@lytjs/common-event-normalizer': `${commonRoot}/event-normalizer/dist/index.mjs`,
      '@lytjs/common-async-scheduler': `${commonRoot}/async-scheduler/dist/index.mjs`,
      '@lytjs/common-transition-engine': `${commonRoot}/transition-engine/dist/index.mjs`,
      // 主包
      '@lytjs/shared-types': resolve(packagesRoot, 'shared-types/src'),
      '@lytjs/vdom': resolve(packagesRoot, 'vdom/dist/index.mjs'),
      '@lytjs/reactivity': resolve(packagesRoot, 'reactivity/dist/index.mjs'),
      '@lytjs/reactivity/scope': resolve(packagesRoot, 'reactivity/dist/scope.mjs'),
      '@lytjs/reactivity/async': resolve(packagesRoot, 'reactivity/dist/async.mjs'),
      '@lytjs/renderer': resolve(packagesRoot, 'renderer/dist/index.mjs'),
      '@lytjs/component': resolve(packagesRoot, 'component/dist/index.mjs'),
      '@lytjs/compiler': resolve(packagesRoot, 'compiler/dist/index.mjs'),
      '@lytjs/host-contract': resolve(packagesRoot, 'host-contract/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
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
