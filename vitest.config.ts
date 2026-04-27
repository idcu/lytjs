import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@lytjs/common': resolve(__dirname, 'packages/common/src'),
      '@lytjs/common/': resolve(__dirname, 'packages/common/src/'),
      '@lytjs/reactivity': resolve(__dirname, 'packages/reactivity/src'),
      '@lytjs/reactivity/': resolve(__dirname, 'packages/reactivity/src/'),
      '@lytjs/vdom': resolve(__dirname, 'packages/vdom/src'),
      '@lytjs/vdom/': resolve(__dirname, 'packages/vdom/src/'),
      '@lytjs/compiler': resolve(__dirname, 'packages/compiler/src'),
      '@lytjs/compiler/': resolve(__dirname, 'packages/compiler/src/'),
      '@lytjs/renderer': resolve(__dirname, 'packages/renderer/src'),
      '@lytjs/renderer/': resolve(__dirname, 'packages/renderer/src/'),
      '@lytjs/component': resolve(__dirname, 'packages/component/src'),
      '@lytjs/component/': resolve(__dirname, 'packages/component/src/'),
      '@lytjs/core': resolve(__dirname, 'packages/core/src'),
      '@lytjs/core/': resolve(__dirname, 'packages/core/src/'),
      '@lytjs/router': resolve(__dirname, 'packages/router/src'),
      '@lytjs/router/': resolve(__dirname, 'packages/router/src/'),
      '@lytjs/store': resolve(__dirname, 'packages/store/src'),
      '@lytjs/store/': resolve(__dirname, 'packages/store/src/'),
      '@lytjs/cli': resolve(__dirname, 'packages/cli/src'),
      '@lytjs/cli/': resolve(__dirname, 'packages/cli/src/'),
      '@lytjs/devtools': resolve(__dirname, 'packages/devtools/src'),
      '@lytjs/devtools/': resolve(__dirname, 'packages/devtools/src/'),
      '@lytjs/components': resolve(__dirname, 'packages/components/src'),
      '@lytjs/components/': resolve(__dirname, 'packages/components/src/'),
      '@lytjs/lytx': resolve(__dirname, 'packages/lytx/src'),
      '@lytjs/lytx/': resolve(__dirname, 'packages/lytx/src/'),
      '@lytjs/plugin-i18n': resolve(__dirname, 'packages/plugin-i18n/src'),
      '@lytjs/plugin-auth': resolve(__dirname, 'packages/plugin-auth/src'),
      '@lytjs/plugin-logger': resolve(__dirname, 'packages/plugin-logger/src'),
      '@lytjs/test-utils': resolve(__dirname, 'packages/test-utils/src'),
      '@lytjs/plugins': resolve(__dirname, 'packages/plugins/src'),
      '@lytjs/lytjs': resolve(__dirname, 'packages/lytjs/src'),
    },
  },
  test: {
    include: ['packages/**/__tests__/**/*.test.ts'],
    // Use jsdom for tests that need DOM
    environment: 'node',
    globals: true,
  },
})
