import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../../../');
const commonRoot = resolve(root, 'packages/common/packages');

export default defineConfig({
  resolve: {
    alias: {
      // compiler 子路径
      '@lytjs/compiler': resolve(root, 'packages/compiler/dist/index.mjs'),
      '@lytjs/compiler/sfc': resolve(root, 'packages/compiler/dist/sfc.mjs'),
      '@lytjs/compiler/signal': resolve(root, 'packages/compiler/dist/signal.mjs'),
      '@lytjs/compiler/ssr': resolve(root, 'packages/compiler/dist/ssr.mjs'),
      '@lytjs/compiler/wasm': resolve(root, 'packages/compiler/dist/wasm.mjs'),
      // common 子包
      '@lytjs/common-is': resolve(commonRoot, 'is/dist/index.mjs'),
      '@lytjs/common-error': resolve(commonRoot, 'error/dist/index.mjs'),
      '@lytjs/common-vnode': resolve(commonRoot, 'vnode/dist/index.mjs'),
      '@lytjs/common-string': resolve(commonRoot, 'string/dist/index.mjs'),
      '@lytjs/common-constants': resolve(commonRoot, 'constants/dist/index.mjs'),
      // shared-types
      '@lytjs/shared-types': resolve(root, 'packages/shared-types/src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
