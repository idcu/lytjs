import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, '../common/packages');
const packagesRoot = resolve(__dirname, '..');

export default defineConfig({
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  resolve: {
    alias: {
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
      '@lytjs/shared-types': resolve(packagesRoot, 'shared-types/src'),
      '@lytjs/reactivity': resolve(packagesRoot, 'reactivity/dist/index.mjs'),
      '@lytjs/renderer': resolve(packagesRoot, 'renderer/dist/index.mjs'),
      '@lytjs/component': resolve(packagesRoot, 'component/dist/index.mjs'),
      '@lytjs/compiler': resolve(packagesRoot, 'compiler/dist/index.mjs'),
      '@lytjs/dom-runtime': resolve(packagesRoot, 'dom-runtime/dist/index.mjs'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
