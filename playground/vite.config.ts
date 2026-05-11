import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@lytjs/compiler': resolve(__dirname, '../packages/compiler/dist'),
      '@lytjs/core': resolve(__dirname, '../packages/core/dist'),
      '@lytjs/reactivity': resolve(__dirname, '../packages/reactivity/dist'),
      '@lytjs/dom-runtime': resolve(__dirname, '../packages/dom-runtime/dist'),
      '@lytjs/renderer': resolve(__dirname, '../packages/renderer/dist'),
      '@lytjs/vdom': resolve(__dirname, '../packages/vdom/dist'),
      '@lytjs/shared': resolve(__dirname, '../packages/shared/dist'),
      '@lytjs/shared-types': resolve(__dirname, '../packages/shared-types/dist'),
      '@lytjs/component': resolve(__dirname, '../packages/component/dist'),
      '@lytjs/adapter-web': resolve(__dirname, '../packages/adapter-web/dist'),
      '@lytjs/host-contract': resolve(__dirname, '../packages/host-contract/dist'),
      '@lytjs/common-error': resolve(__dirname, '../packages/common/packages/error/dist'),
      '@lytjs/common-object': resolve(__dirname, '../packages/common/packages/object/dist'),
      '@lytjs/common-string': resolve(__dirname, '../packages/common/packages/string/dist'),
      '@lytjs/common-constants': resolve(__dirname, '../packages/common/packages/constants/dist'),
      '@lytjs/common-events': resolve(__dirname, '../packages/common/packages/events/dist'),
      '@lytjs/common-is': resolve(__dirname, '../packages/common/packages/is/dist'),
    },
  },
  define: {
    __DEV__: true,
  },
  server: {
    port: 3000,
    strictPort: false,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
  },
});
