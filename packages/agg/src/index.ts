// Lyt.js 聚合入口 — 一键安装所有运行时能力

// core 核心
export { createApp, h, Fragment } from '@lytjs/core'

// core 插件系统（子路径）
export {
  createProvidesContext,
  installPlugin,
  uninstallPlugin,
  isPluginObject,
  isPluginFunction,
  getPluginName,
} from '@lytjs/core/plugin'

// core 错误处理（子路径）
export {
  LytError,
  LytErrorCodes,
  ErrorBoundary,
  handleError,
  callWithErrorHandling,
  warn,
  warnOnce,
  setDevMode,
  createMessage,
  ErrorCategory,
  getErrorMessage,
  getCategory,
  createCompilerError,
  createRendererError,
  createComponentError,
} from '@lytjs/core/error'

// core Web Component（子路径）
export {
  defineCustomElement,
  registerComponents,
  unregisterElement,
  isBrowser,
  defineCustomElementFromSFC,
} from '@lytjs/core/web-component'

// reactivity
export { reactive, ref, computed, watch, watchEffect, effect, nextTick, toRaw, isReactive, isRef, shallowReactive, shallowRef, triggerRef, unref, toRef, toRefs, readonly } from '@lytjs/reactivity'

// compiler 核心
export { compile, parseHTML, transform, optimize, generate } from '@lytjs/compiler'

// compiler SFC（子路径）
export { parseSFC, compileSFC, scopeCSS } from '@lytjs/compiler/sfc'

// renderer（主入口仅含 DOM）
export { createRenderer } from '@lytjs/renderer'

// renderer SSR（子路径）
export { ssrRenderer, renderToString, renderToStream } from '@lytjs/renderer/ssr'

// component 核心
export { defineComponent } from '@lytjs/component'

// component 内置组件（子路径）
export { defineAsyncComponent, Transition, TransitionGroup, KeepAlive, Suspense } from '@lytjs/component/builtins'

// router
export { createRouter } from '@lytjs/router'

// store
export { createStore, getStore, getStoreIds } from '@lytjs/store'
