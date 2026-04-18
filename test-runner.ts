/**
 * Lyt.js 测试聚合入口
 *
 * 导入所有包的测试文件，统一运行。
 * 用法：npx tsx test-runner.ts
 *
 * 注意：各测试文件仅注册测试用例（describe/it），
 * 由本文件统一调用 runAll() 执行，避免重复运行。
 */

// 注册 @lytjs/* 模块别名（让 tsx 能解析包名引用）
import { createRequire } from 'node:module'
import path from 'node:path'

const _require = createRequire(import.meta.url)
const ROOT = path.dirname(_require.resolve('./package.json'))

// Monkey-patch Node.js 模块解析以支持 @lytjs/* 子路径
const Module = _require('module') as any
const origResolve = Module._resolveFilename.bind(Module)
Module._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
  if (request.startsWith('@lytjs/')) {
    const parts = request.slice(5).split('/') // 去掉 '@lytjs/'
    const pkgName = parts[0]
    const subPath = parts.slice(1).join('/')
    // 尝试精确匹配：packages/<pkg>/src/<subPath>.ts
    const candidates = [
      path.join(ROOT, 'packages', pkgName, 'src', subPath + '.ts'),
      path.join(ROOT, 'packages', pkgName, 'src', subPath, 'index.ts'),
      path.join(ROOT, 'packages', pkgName, 'src', 'index.ts'),
    ]
    for (const c of candidates) {
      try { if (_require('fs').existsSync(c)) return c } catch {}
    }
  }
  return origResolve(request, parent, isMain, options)
}

// 核心引擎层测试
import './packages/reactivity/__tests__/reactive.test.ts'
import './packages/reactivity/__tests__/reactive-api.test.ts'
import './packages/vdom/__tests__/vdom.test.ts'
import './packages/compiler/__tests__/compiler.test.ts'
import './packages/compiler/__tests__/compiler-optimize.test.ts'

// 渲染与应用层测试
import './packages/renderer/__tests__/renderer.test.ts'
import './packages/renderer/__tests__/ssr.test.ts'
import './packages/component/__tests__/component.test.ts'
import './packages/component/__tests__/composition-api.test.ts'
import './packages/component/__tests__/keep-alive.test.ts'
import './packages/core/__tests__/core.test.ts'
import './packages/core/__tests__/error-handling.test.ts'
import './packages/router/__tests__/router.test.ts'
import './packages/store/__tests__/store.test.ts'
import './packages/store/__tests__/store-enhanced.test.ts'

// 工具层测试
import './packages/cli/__tests__/cli.test.ts'

// CLI 增强版测试（脚手架 + HMR）
import './packages/cli/__tests__/cli-enhanced.test.ts'

// 注意：devtools 和 components 测试需要浏览器环境，暂不在此运行
// import './packages/devtools/__tests__/devtools.test.ts'
// import './packages/components/__tests__/components.test.ts'

// 新增组件测试（不依赖浏览器 DOM，可在 Node.js 环境运行）
import './packages/components/__tests__/new-components.test.ts'

// 主题系统测试
import './packages/components/__tests__/theme.test.ts'

// 性能模块测试（不依赖浏览器 DOM，可在 Node.js 环境运行）
import './packages/devtools/__tests__/perf.test.ts'

// Signal 响应式系统测试
import './packages/reactivity/__tests__/signal.test.ts'

// DevTools 增强模块测试
import './packages/devtools/__tests__/devtools-enhanced.test.ts'

// LytX 元框架测试
import './packages/lytx/__tests__/lytx.test.ts'

// LytX API 路由和中间件测试
import './packages/lytx/__tests__/api-routes.test.ts'

// Vapor Mode 测试
import './packages/renderer/__tests__/vapor.test.ts'

// Signal State 组件集成测试
import './packages/component/__tests__/signal-state.test.ts'

// js-framework-benchmark 集成测试
import './benchmarks/js-framework-benchmark/test/benchmark.test.ts'

// Partial Hydration（Islands Architecture）测试（放在最后，避免 mock 污染其他测试）
import './packages/renderer/__tests__/hydration.test.ts'

// WASM 模拟层编译器测试
import './packages/compiler/__tests__/wasm-compiler.test.ts'

// Web Component 适配器测试
import './packages/core/__tests__/web-component.test.ts'

// 日志插件测试
import './packages/plugin-logger/__tests__/logger.test.ts'

// DOM 渲染器测试
import './packages/renderer/__tests__/dom-renderer.test.ts'

// Router History 测试
import './packages/router/__tests__/history.test.ts'

// Store 边界测试
import './packages/store/__tests__/store-edge-cases.test.ts'

// Reactivity 边界测试
import './packages/reactivity/__tests__/reactivity-edge-cases.test.ts'

// Compiler 边界测试
import './packages/compiler/__tests__/compiler-edge-cases.test.ts'

// VDOM 边界测试
import './packages/vdom/__tests__/vdom-edge-cases.test.ts'

// Component 边界测试
import './packages/component/__tests__/component-edge-cases.test.ts'

// DevTools 边界测试
import './packages/devtools/__tests__/devtools-edge-cases.test.ts'

// LytX 边界测试
import './packages/lytx/__tests__/lytx-edge-cases.test.ts'

// Plugins 边界测试
import './packages/plugins/__tests__/plugins-edge-cases.test.ts'

// Renderer 边界测试
import './packages/renderer/__tests__/renderer-edge-cases.test.ts'

// Core 边界测试
import './packages/core/__tests__/core-edge-cases.test.ts'

// SSR 渲染器边界测试（直接导入 ssr-renderer 模块）
import './packages/renderer/__tests__/ssr-renderer-edge-cases.test.ts'

// createApp 集成测试（jsdom）
import './packages/core/__tests__/create-app-integration.test.ts'

// Router 边界测试
import './packages/router/__tests__/router-edge-cases.test.ts'

// VDOM Patch 集成测试（jsdom）
import './packages/vdom/__tests__/patch-integration.test.ts'

// VDOM List Diff 集成测试（jsdom）
import './packages/vdom/__tests__/list-diff-integration.test.ts'

// Router createRouter 集成测试（jsdom）
import './packages/router/__tests__/create-router-integration.test.ts'

// Renderer DOM 操作集成测试（jsdom）
import './packages/renderer/__tests__/dom-ops-integration.test.ts'

// Renderer DOMRenderer 集成测试（jsdom）
import './packages/renderer/__tests__/dom-renderer-integration.test.ts'

// CLI 边界测试
import './packages/cli/__tests__/cli-edge-cases.test.ts'

// ================================================================
//  统一运行所有测试
// ================================================================

import { runAll } from './packages/test-utils/src/index'

// runAll() 是 async function，使用 .then() 确保 Promise 被等待
runAll().then((result) => {
  process.exit(result.failed > 0 ? 1 : 0)
}).catch((err) => {
  console.error('测试运行出错:', err)
  process.exit(1)
})
