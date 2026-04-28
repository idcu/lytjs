/**
 * Lyt.js Vue 3 兼容层
 *
 * 提供与 Vue 3 完全兼容的 API，使 Vue 3 用户可以无缝迁移到 Lyt.js
 *
 * @module @lytjs/compat
 */

// 重新导出 Lyt.js 的响应式 API（与 Vue 3 API 相同）
export {
  ref,
  shallowRef,
  isRef,
  unref,
  toRef,
  toRefs,
  triggerRef,
  reactive,
  readonly,
  shallowReactive,
  toRaw,
  isReactive,
  isReadonly,
  markRaw,
  computed,
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect,
  effect,
  nextTick,
  provide,
  inject,
  onMounted,
  onUpdated,
  onUnmounted,
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount,
  onErrorCaptured,
  onRenderTracked,
  onRenderTriggered,
  onActivated,
  onDeactivated,
  onServerPrefetch,
  getCurrentInstance,
  getCurrentScope,
  onScopeDispose,
  // 渲染函数
  h,
  Fragment,
  // 异步组件
  defineAsyncComponent,
  // 编译器宏
  defineProps,
  defineEmits,
  defineModel,
  withDefaults,
  defineExpose,
  // 组合式 API 工具
  useSlots,
  useAttrs,
  useTemplateRef,
  // 响应式工具
  isProxy,
  proxyRefs,
} from './vue3-api'

// 导出 SFC 转换工具
export {
  convertVueSfcToLyt,
  convertVueSfcToLytWithWarnings,
  VueSfcConverter,
} from './sfc-converter'

// 导出 createApp 兼容层
export { createApp } from './create-app'

// 导出 defineComponent 兼容层
export { defineComponent } from './define-component'

// 导出内置组件
export {
  KeepAlive,
  Teleport,
  Transition,
  TransitionGroup,
  Suspense,
} from './built-in-components'

// 导出类型
export type {
  Ref,
  ComputedRef,
  WritableComputedRef,
  Reactive,
  UnwrapRef,
  ComponentPublicInstance,
  SetupContext,
  ComponentOptions,
  DefineComponent,
  App,
  AppConfig,
  Plugin,
  Directive,
  DirectiveBinding,
  AsyncComponentLoader,
  AsyncComponentOptions,
  AsyncComponent,
  VNode,
} from './types'

// 导出工具函数
export {
  createCompatVue,
  useCompatMode,
} from './compat-mode'

// 导出迁移工具
export {
  migrateVueFile,
  analyzeVueFile,
  formatMigrationReport,
} from './migrate'

export type {
  MigrationIssue,
  MigrationIssueType,
  MigrationSeverity,
  MigrationReport,
} from './migrate'
