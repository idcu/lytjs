import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const commonRoot = resolve(root, 'packages/common/packages');
const packagesRoot = resolve(root, 'packages');

export default defineConfig({
  plugins: [tsconfigPaths()],
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  resolve: {
    alias: [
      // common 子包
      { find: '@lytjs/common-is', replacement: `${commonRoot}/is/dist/index.mjs` },
      { find: '@lytjs/common-scheduler', replacement: `${commonRoot}/scheduler/dist/index.mjs` },
      { find: '@lytjs/common-error', replacement: `${commonRoot}/error/dist/index.mjs` },
      { find: '@lytjs/common-dom', replacement: `${commonRoot}/dom/dist/index.mjs` },
      { find: '@lytjs/common-dom-helpers', replacement: `${commonRoot}/dom-helpers/dist/index.mjs` },
      { find: '@lytjs/common-vnode', replacement: `${commonRoot}/vnode/dist/index.mjs` },
      { find: '@lytjs/common-string', replacement: `${commonRoot}/string/dist/index.mjs` },
      { find: '@lytjs/common-events', replacement: `${commonRoot}/events/dist/index.mjs` },
      { find: '@lytjs/common-object', replacement: `${commonRoot}/object/dist/index.mjs` },
      { find: '@lytjs/common-algorithm', replacement: `${commonRoot}/algorithm/dist/index.mjs` },
      { find: '@lytjs/common-timing', replacement: `${commonRoot}/timing/dist/index.mjs` },
      { find: '@lytjs/common-cache', replacement: `${commonRoot}/cache/dist/index.mjs` },
      { find: '@lytjs/common-env', replacement: `${commonRoot}/env/dist/index.mjs` },
      { find: '@lytjs/common-constants', replacement: `${commonRoot}/constants/dist/index.mjs` },
      { find: '@lytjs/common-assertions', replacement: `${commonRoot}/assertions/dist/index.mjs` },
      { find: '@lytjs/common-warn', replacement: `${commonRoot}/warn/dist/index.mjs` },
      { find: '@lytjs/common-security', replacement: `${commonRoot}/security/dist/index.mjs` },
      { find: '@lytjs/common-path', replacement: `${commonRoot}/path/dist/index.mjs` },
      { find: '@lytjs/common-http', replacement: `${commonRoot}/http/dist/index.mjs` },
      { find: '@lytjs/common-query', replacement: `${commonRoot}/query/dist/index.mjs` },
      { find: '@lytjs/common-storage', replacement: `${commonRoot}/storage/dist/index.mjs` },
      { find: '@lytjs/common-validate', replacement: `${commonRoot}/validate/dist/index.mjs` },
      { find: '@lytjs/common-performance', replacement: `${commonRoot}/performance/dist/index.mjs` },
      { find: '@lytjs/common-render-queue', replacement: `${commonRoot}/render-queue/dist/index.mjs` },
      { find: '@lytjs/common-raf', replacement: `${commonRoot}/raf/dist/index.mjs` },
      { find: '@lytjs/common-keyboard', replacement: `${commonRoot}/keyboard/dist/index.mjs` },
      { find: '@lytjs/common-a11y', replacement: `${commonRoot}/a11y/dist/index.mjs` },
      { find: '@lytjs/common-node-cache', replacement: `${commonRoot}/node-cache/dist/index.mjs` },
      { find: '@lytjs/common-event-normalizer', replacement: `${commonRoot}/event-normalizer/dist/index.mjs` },
      { find: '@lytjs/common-async-scheduler', replacement: `${commonRoot}/async-scheduler/dist/index.mjs` },
      { find: '@lytjs/common-transition-engine', replacement: `${commonRoot}/transition-engine/dist/index.mjs` },
      // 主包
      { find: '@lytjs/shared-types', replacement: resolve(packagesRoot, 'shared-types/src') },
      { find: '@lytjs/vdom', replacement: resolve(packagesRoot, 'vdom/dist/index.mjs') },
      { find: '@lytjs/reactivity', replacement: resolve(packagesRoot, 'reactivity/dist/index.mjs') },
      { find: /^@lytjs\/reactivity\/scope$/, replacement: resolve(packagesRoot, 'reactivity/dist/scope.mjs') },
      { find: /^@lytjs\/reactivity\/async$/, replacement: resolve(packagesRoot, 'reactivity/dist/async.mjs') },
      { find: '@lytjs/renderer', replacement: resolve(packagesRoot, 'renderer/dist/index.mjs') },
      { find: '@lytjs/component', replacement: resolve(packagesRoot, 'component/dist/index.mjs') },
      { find: '@lytjs/compiler', replacement: resolve(packagesRoot, 'compiler/dist/index.mjs') },
      { find: '@lytjs/host-contract', replacement: resolve(packagesRoot, 'host-contract/src') },
      { find: '@lytjs/core', replacement: resolve(packagesRoot, 'core/dist/index.mjs') },
    ],
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
