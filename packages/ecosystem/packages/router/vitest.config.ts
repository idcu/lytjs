import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, '../../../common/packages');
const pkgRoot = resolve(__dirname, '../../..');

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/common-is': `${commonRoot}/is/dist/index.mjs`,
      '@lytjs/common-env': `${commonRoot}/env/dist/index.mjs`,
      '@lytjs/common-object': `${commonRoot}/object/dist/index.mjs`,
      '@lytjs/common-error': `${commonRoot}/error/dist/index.mjs`,
      '@lytjs/common-constants': `${commonRoot}/constants/dist/index.mjs`,
      '@lytjs/common-scheduler': `${commonRoot}/scheduler/dist/index.mjs`,
      '@lytjs/common-vnode': `${commonRoot}/vnode/dist/index.mjs`,
      '@lytjs/common-string': `${commonRoot}/string/dist/index.mjs`,
      '@lytjs/common-algorithm': `${commonRoot}/algorithm/dist/index.mjs`,
      '@lytjs/common-events': `${commonRoot}/events/dist/index.mjs`,
      '@lytjs/common-dom': `${commonRoot}/dom/dist/index.mjs`,
      '@lytjs/common-assertions': `${commonRoot}/assertions/dist/index.mjs`,
      '@lytjs/shared-types': `${pkgRoot}/shared-types/dist/index.mjs`,
      '@lytjs/host-contract': `${pkgRoot}/host-contract/dist/index.mjs`,
      '@lytjs/reactivity': `${pkgRoot}/reactivity/dist/index.mjs`,
      '@lytjs/component': `${pkgRoot}/component/dist/index.mjs`,
      '@lytjs/vdom': `${pkgRoot}/vdom/dist/index.mjs`,
    },
  },
  test: {
    environment: 'node',
    globals: true,
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
