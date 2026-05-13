import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, '../../../common/packages');
const pkgRoot = resolve(__dirname, '../../..');

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@lytjs\/reactivity\/(.*)$/, replacement: `${pkgRoot}/reactivity/dist/$1.mjs` },
      { find: '@lytjs/common-is', replacement: `${commonRoot}/is/dist/index.mjs` },
      { find: '@lytjs/common-env', replacement: `${commonRoot}/env/dist/index.mjs` },
      { find: '@lytjs/common-dom', replacement: `${commonRoot}/dom/dist/index.mjs` },
      { find: '@lytjs/common-error', replacement: `${commonRoot}/error/dist/index.mjs` },
      { find: '@lytjs/common-constants', replacement: `${commonRoot}/constants/dist/index.mjs` },
      { find: '@lytjs/common-scheduler', replacement: `${commonRoot}/scheduler/dist/index.mjs` },
      { find: '@lytjs/common-vnode', replacement: `${commonRoot}/vnode/dist/index.mjs` },
      { find: '@lytjs/common-string', replacement: `${commonRoot}/string/dist/index.mjs` },
      { find: '@lytjs/common-object', replacement: `${commonRoot}/object/dist/index.mjs` },
      { find: '@lytjs/common-algorithm', replacement: `${commonRoot}/algorithm/dist/index.mjs` },
      { find: '@lytjs/common-events', replacement: `${commonRoot}/events/dist/index.mjs` },
      { find: '@lytjs/common-assertions', replacement: `${commonRoot}/assertions/dist/index.mjs` },
      { find: '@lytjs/shared-types', replacement: `${pkgRoot}/shared-types/dist/index.mjs` },
      { find: '@lytjs/host-contract', replacement: `${pkgRoot}/host-contract/dist/index.mjs` },
      { find: '@lytjs/reactivity', replacement: `${pkgRoot}/reactivity/dist/index.mjs` },
      { find: '@lytjs/component', replacement: `${pkgRoot}/component/dist/index.mjs` },
      { find: '@lytjs/vdom', replacement: `${pkgRoot}/vdom/dist/index.mjs` },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
