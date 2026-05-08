import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, '../common/packages');
const packagesRoot = resolve(__dirname, '..');

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/common-is': `${commonRoot}/is/dist/index.mjs`,
      '@lytjs/common-string': `${commonRoot}/string/dist/index.mjs`,
      '@lytjs/common-error': `${commonRoot}/error/dist/index.mjs`,
      '@lytjs/common-events': `${commonRoot}/events/dist/index.mjs`,
      '@lytjs/common-vnode': `${commonRoot}/vnode/dist/index.mjs`,
      '@lytjs/common-dom': `${commonRoot}/dom/dist/index.mjs`,
      '@lytjs/common-scheduler': `${commonRoot}/scheduler/dist/index.mjs`,
      '@lytjs/vdom': `${packagesRoot}/vdom/dist/index.mjs`,
      '@lytjs/core': `${packagesRoot}/core/dist/index.mjs`,
      '@lytjs/reactivity': `${packagesRoot}/reactivity/dist/index.mjs`,
      '@lytjs/dom-runtime': `${packagesRoot}/dom-runtime/dist/index.mjs`,
      '@lytjs/compiler': `${packagesRoot}/compiler/dist/index.mjs`,
      '@lytjs/host-contract': `${packagesRoot}/host-contract/dist/index.mjs`,
      '@lytjs/adapter-web': `${packagesRoot}/adapter-web/dist/index.mjs`,
      '@lytjs/shared-types': `${packagesRoot}/shared-types/dist/index.mjs`,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [resolve(__dirname, '../reactivity/tests/setup.ts')],
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
