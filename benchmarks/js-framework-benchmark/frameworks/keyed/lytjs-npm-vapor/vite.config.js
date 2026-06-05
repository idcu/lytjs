import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: 'terser',
    target: 'esnext'
  },
  server: {
    port: 8080,
    fs: {
      allow: [
        path.resolve(__dirname, '../../../../../packages'),
        path.resolve(__dirname, '..')
      ]
    }
  },
  define: {
    __DEV__: true
  },
  resolve: {
    alias: {
      '@lytjs/renderer/vapor/vapor-app': path.resolve(__dirname, '../../../../../packages/renderer/dist/vapor/vapor-app.mjs'),
      '@lytjs/reactivity': path.resolve(__dirname, '../../../../../packages/reactivity/dist/index.mjs'),
      '@lytjs/compiler': path.resolve(__dirname, '../../../../../packages/compiler/dist/index.mjs'),
      '@lytjs/dom-runtime': path.resolve(__dirname, '../../../../../packages/dom-runtime/dist/index.mjs'),
      '@lytjs/vdom': path.resolve(__dirname, '../../../../../packages/vdom/dist/index.mjs'),
      '@lytjs/common-error': path.resolve(__dirname, '../../../../../packages/common/packages/error/dist/index.mjs'),
      '@lytjs/common-is': path.resolve(__dirname, '../../../../../packages/common/packages/is/dist/index.mjs'),
      '@lytjs/common-scheduler': path.resolve(__dirname, '../../../../../packages/common/packages/scheduler/dist/index.mjs'),
      '@lytjs/common-constants': path.resolve(__dirname, '../../../../../packages/common/packages/constants/dist/index.mjs'),
      '@lytjs/common-assertions': path.resolve(__dirname, '../../../../../packages/common/packages/assertions/dist/index.mjs'),
      '@lytjs/common-vnode': path.resolve(__dirname, '../../../../../packages/common/packages/vnode/dist/index.mjs'),
      '@lytjs/common-string': path.resolve(__dirname, '../../../../../packages/common/packages/string/dist/index.mjs'),
      '@lytjs/common-events': path.resolve(__dirname, '../../../../../packages/common/packages/events/dist/index.mjs'),
      '@lytjs/adapter-web': path.resolve(__dirname, '../../../../../packages/adapter-web/dist/index.mjs'),
      '@lytjs/host-contract': path.resolve(__dirname, '../../../../../packages/host-contract/dist/index.mjs'),
      '@lytjs/shared-types': path.resolve(__dirname, '../../../../../packages/shared-types/dist/index.mjs'),
    }
  },
  optimizeDeps: {
    exclude: [
      '@lytjs/reactivity',
      '@lytjs/compiler',
      '@lytjs/dom-runtime',
      '@lytjs/vdom',
      '@lytjs/common-error',
      '@lytjs/common-is',
      '@lytjs/common-scheduler',
      '@lytjs/common-constants',
      '@lytjs/common-assertions',
      '@lytjs/common-vnode',
      '@lytjs/common-string',
      '@lytjs/common-events',
      '@lytjs/adapter-web',
      '@lytjs/host-contract',
      '@lytjs/shared-types',
    ]
  }
})
