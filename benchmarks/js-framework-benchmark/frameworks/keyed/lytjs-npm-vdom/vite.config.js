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
      '@lytjs/adapter-web': path.resolve(__dirname, '../../../../../packages/adapter-web/dist/index.mjs'),
      '@lytjs/common': path.resolve(__dirname, '../../../../../packages/common/dist/index.mjs'),
      '@lytjs/common-constants': path.resolve(__dirname, '../../../../../packages/common/packages/constants/dist/index.mjs'),
      '@lytjs/common-dom': path.resolve(__dirname, '../../../../../packages/common/packages/dom/dist/index.mjs'),
      '@lytjs/common-error': path.resolve(__dirname, '../../../../../packages/common/packages/error/dist/index.mjs'),
      '@lytjs/common-events': path.resolve(__dirname, '../../../../../packages/common/packages/events/dist/index.mjs'),
      '@lytjs/common-is': path.resolve(__dirname, '../../../../../packages/common/packages/is/dist/index.mjs'),
      '@lytjs/common-scheduler': path.resolve(__dirname, '../../../../../packages/common/packages/scheduler/dist/index.mjs'),
      '@lytjs/common-string': path.resolve(__dirname, '../../../../../packages/common/packages/string/dist/index.mjs'),
      '@lytjs/common-object': path.resolve(__dirname, '../../../../../packages/common/packages/object/dist/index.mjs'),
      '@lytjs/common-algorithm': path.resolve(__dirname, '../../../../../packages/common/packages/algorithm/dist/index.mjs'),
      '@lytjs/common-security': path.resolve(__dirname, '../../../../../packages/common/packages/security/dist/index.mjs'),
      '@lytjs/common-assertions': path.resolve(__dirname, '../../../../../packages/common/packages/assertions/dist/index.mjs'),
      '@lytjs/common-vnode': path.resolve(__dirname, '../../../../../packages/common/packages/vnode/dist/index.mjs'),
      '@lytjs/common-warn': path.resolve(__dirname, '../../../../../packages/common/packages/warn/dist/index.mjs'),
      '@lytjs/component': path.resolve(__dirname, '../../../../../packages/component/dist/index.mjs'),
      '@lytjs/compiler': path.resolve(__dirname, '../../../../../packages/compiler/dist/index.mjs'),
      '@lytjs/core': path.resolve(__dirname, '../../../../../packages/core/dist/index.mjs'),
      '@lytjs/core-signal': path.resolve(__dirname, '../../../../../packages/core-signal/dist/index.mjs'),
      '@lytjs/core-vnode': path.resolve(__dirname, '../../../../../packages/core-vnode/dist/index.mjs'),
      '@lytjs/dom-runtime': path.resolve(__dirname, '../../../../../packages/dom-runtime/dist/index.mjs'),
      '@lytjs/host-contract': path.resolve(__dirname, '../../../../../packages/host-contract/dist/index.mjs'),
      '@lytjs/reactivity': path.resolve(__dirname, '../../../../../packages/reactivity/dist/index.mjs'),
      '@lytjs/renderer': path.resolve(__dirname, '../../../../../packages/renderer/dist/index.mjs'),
      '@lytjs/renderer/vapor': path.resolve(__dirname, '../../../../../packages/renderer/dist/vapor/vapor-app.mjs'),
      '@lytjs/shared-types': path.resolve(__dirname, '../../../../../packages/shared-types/dist/index.mjs'),
      '@lytjs/vdom': path.resolve(__dirname, '../../../../../packages/vdom/dist/index.mjs')
    }
  },
  optimizeDeps: {
    exclude: [
      '@lytjs/core',
      '@lytjs/core-vnode',
      '@lytjs/core-signal',
      '@lytjs/reactivity',
      '@lytjs/vdom',
      '@lytjs/renderer',
      '@lytjs/adapter-web',
      '@lytjs/dom-runtime',
      '@lytjs/component',
      '@lytjs/compiler',
      '@lytjs/host-contract',
      '@lytjs/common',
      '@lytjs/common-constants',
      '@lytjs/common-error',
      '@lytjs/common-string',
      '@lytjs/common-is',
      '@lytjs/common-events',
      '@lytjs/common-dom',
      '@lytjs/common-scheduler',
      '@lytjs/common-object',
      '@lytjs/common-algorithm',
      '@lytjs/common-security',
      '@lytjs/common-assertions',
      '@lytjs/common-vnode',
      '@lytjs/common-warn',
      '@lytjs/shared-types'
    ]
  }
})
