/**
 * Playwright 自定义模块解析器
 *
 * 将 @lytjs/* workspace 包名映射到对应的 dist/index.mjs 文件，
 * 解决 Playwright 运行时无法解析 workspace 包的问题。
 */

import type { Resolver } from '@playwright/test'
import path from 'path'

// workspace 包名到 dist 目录的映射
const packageMap: Record<string, string> = {
  '@lytjs/common': 'packages/common/dist/index.mjs',
  '@lytjs/reactivity': 'packages/reactivity/dist/index.mjs',
  '@lytjs/vdom': 'packages/vdom/dist/index.mjs',
  '@lytjs/compiler': 'packages/compiler/dist/index.mjs',
  '@lytjs/renderer': 'packages/renderer/dist/index.mjs',
  '@lytjs/component': 'packages/component/dist/index.mjs',
  '@lytjs/core': 'packages/core/dist/index.mjs',
  '@lytjs/router': 'packages/router/dist/index.mjs',
  '@lytjs/store': 'packages/store/dist/index.mjs',
  '@lytjs/cli': 'packages/cli/dist/index.mjs',
  '@lytjs/devtools': 'packages/devtools/dist/index.mjs',
  '@lytjs/components': 'packages/components/dist/index.mjs',
  '@lytjs/performance': 'packages/performance/dist/index.mjs',
  '@lytjs/plugin-i18n': 'packages/plugin-i18n/dist/index.mjs',
  '@lytjs/plugin-auth': 'packages/plugin-auth/dist/index.mjs',
  '@lytjs/plugin-logger': 'packages/plugin-logger/dist/index.mjs',
  '@lytjs/plugin-theme': 'packages/plugin-theme/dist/index.mjs',
  '@lytjs/plugin-storage': 'packages/plugin-storage/dist/index.mjs',
  '@lytjs/plugin-sdk': 'packages/plugin-sdk/dist/index.mjs',
  '@lytjs/plugin-chart': 'packages/plugin-chart/dist/index.mjs',
  '@lytjs/plugin-highlight': 'packages/plugin-highlight/dist/index.mjs',
  '@lytjs/plugin-virtual-list': 'packages/plugin-virtual-list/dist/index.mjs',
  '@lytjs/plugin-registry': 'packages/plugin-registry/dist/index.mjs',
  '@lytjs/micro-frontend': 'packages/micro-frontend/dist/index.mjs',
  '@lytjs/test-utils': 'packages/test-utils/dist/index.mjs',
  '@lytjs/plugins': 'packages/plugins/dist/index.mjs',
  '@lytjs/lytjs': 'packages/lytjs/dist/index.mjs',
  '@lytjs/lytx': 'packages/lytx/dist/index.mjs',
  '@lytjs/ai': 'packages/ai/dist/index.mjs',
  '@lytjs/compat': 'packages/compat/dist/index.mjs',
}

// 子路径映射（如 @lytjs/reactivity/signal）
const subpathMap: Record<string, string> = {
  '@lytjs/reactivity/signal': 'packages/reactivity/dist/signal.mjs',
  '@lytjs/compiler/sfc': 'packages/compiler/dist/sfc-entry.mjs',
  '@lytjs/compiler/wasm': 'packages/compiler/dist/wasm-entry.mjs',
  '@lytjs/compiler/block-tree': 'packages/compiler/dist/block-tree-entry.mjs',
  '@lytjs/compiler/patch-flags': 'packages/compiler/dist/patch-flags-entry.mjs',
  '@lytjs/compiler/hoist': 'packages/compiler/dist/hoist-entry.mjs',
  '@lytjs/compiler/optimize-output': 'packages/compiler/dist/optimize-output-entry.mjs',
  '@lytjs/component/builtins': 'packages/component/dist/builtins-entry.mjs',
  '@lytjs/core/plugin': 'packages/core/dist/plugin-entry.mjs',
  '@lytjs/core/error': 'packages/core/dist/error-entry.mjs',
  '@lytjs/core/web-component': 'packages/core/dist/web-component-entry.mjs',
  '@lytjs/core/shared': 'packages/core/dist/shared-entry.mjs',
  '@lytjs/renderer/dom': 'packages/renderer/dist/dom/index.mjs',
  '@lytjs/renderer/ssr': 'packages/renderer/dist/ssr/index.mjs',
  '@lytjs/renderer/native': 'packages/renderer/dist/native/index.mjs',
  '@lytjs/renderer/miniapp': 'packages/renderer/dist/miniapp/index.mjs',
  '@lytjs/renderer/vapor': 'packages/renderer/dist/vapor/index.mjs',
}

const projectRoot = path.resolve(__dirname, '..')

export default {
  async require(modulePath: string, context: string): Promise<any> {
    return require(modulePath)
  },

  async resolveId(modulePath: string, context: string): Promise<any> {
    // 先检查子路径映射
    if (subpathMap[modulePath]) {
      const fullPath = path.resolve(projectRoot, subpathMap[modulePath])
      return { path: fullPath }
    }

    // 检查主包映射
    if (packageMap[modulePath]) {
      const fullPath = path.resolve(projectRoot, packageMap[modulePath])
      return { path: fullPath }
    }

    // 处理 @lytjs/xxx/yyy 形式的子路径（未在 subpathMap 中的）
    const subpathMatch = modulePath.match(/^(@lytjs\/[\w-]+)\/(.+)$/)
    if (subpathMatch) {
      const [, pkgName, subPath] = subpathMatch
      if (packageMap[pkgName]) {
        const baseDir = path.dirname(path.resolve(projectRoot, packageMap[pkgName]))
        const resolvedPath = path.resolve(baseDir, subPath)
        return { path: resolvedPath }
      }
    }

    return { path: modulePath }
  },
} satisfies Resolver
