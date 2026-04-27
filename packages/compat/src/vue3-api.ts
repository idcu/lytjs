/**
 * Vue 3 兼容 API 实现
 *
 * 重新导出 Lyt.js 的响应式 API，并提供 Vue 3 特有的 API
 */

// 从 @lytjs/reactivity 导入核心响应式 API
import {
  ref as lytRef,
  shallowRef as lytShallowRef,
  isRef as lytIsRef,
  unref as lytUnref,
  toRef as lytToRef,
  toRefs as lytToRefs,
  triggerRef as lytTriggerRef,
  reactive as lytReactive,
  readonly as lytReadonly,
  shallowReactive as lytShallowReactive,
  toRaw as lytToRaw,
  isReactive as lytIsReactive,
  isReadonly as lytIsReadonly,
  computed as lytComputed,
  watch as lytWatch,
  watchEffect as lytWatchEffect,
  effect as lytEffect,
  nextTick as lytNextTick,
} from '@lytjs/reactivity'

// 从 @lytjs/component 导入核心 API 和生命周期钩子
import {
  provide as lytProvide,
  inject as lytInject,
  onMounted as lytOnMounted,
  onUpdated as lytOnUpdated,
  onUnmounted as lytOnUnmounted,
  compositionOnBeforeMount as lytOnBeforeMount,
  onBeforeUpdate as lytOnBeforeUpdate,
  onBeforeUnmount as lytOnBeforeUnmount,
  defineEmits as lytDefineEmits,
} from '@lytjs/component'

// 从 @lytjs/core 导入渲染函数
import { h as lytH, Fragment as lytFragment } from '@lytjs/core'

// 从 @lytjs/component/builtins 导入异步组件
import { defineAsyncComponent as lytDefineAsyncComponent } from '@lytjs/component/builtins/async-component'

// ==========================================
// 响应式 API（直接重新导出）
// ==========================================

/**
 * 创建响应式引用
 * @see https://vuejs.org/api/reactivity-core.html#ref
 */
export const ref = lytRef

/**
 * 创建浅层响应式引用
 * @see https://vuejs.org/api/reactivity-advanced.html#shallowref
 */
export const shallowRef = lytShallowRef

/**
 * 检查值是否为 Ref
 * @see https://vuejs.org/api/reactivity-utilities.html#isref
 */
export const isRef = lytIsRef

/**
 * 解包 Ref
 * @see https://vuejs.org/api/reactivity-utilities.html#unref
 */
export const unref = lytUnref

/**
 * 为对象属性创建 Ref
 * @see https://vuejs.org/api/reactivity-utilities.html#toref
 */
export const toRef = lytToRef

/**
 * 将响应式对象转换为 Ref 对象
 * @see https://vuejs.org/api/reactivity-utilities.html#torefs
 */
export const toRefs = lytToRefs

/**
 * 手动触发 Ref 更新
 * @see https://vuejs.org/api/reactivity-advanced.html#triggerref
 */
export const triggerRef = lytTriggerRef

/**
 * 创建响应式代理
 * @see https://vuejs.org/api/reactivity-core.html#reactive
 */
export const reactive = lytReactive

/**
 * 创建只读响应式代理
 * @see https://vuejs.org/api/reactivity-core.html#readonly
 */
export const readonly = lytReadonly

/**
 * 创建浅层响应式代理
 * @see https://vuejs.org/api/reactivity-advanced.html#shallowreactive
 */
export const shallowReactive = lytShallowReactive

/**
 * 获取原始对象
 * @see https://vuejs.org/api/reactivity-advanced.html#toraw
 */
export const toRaw = lytToRaw

/**
 * 检查是否为响应式代理
 * @see https://vuejs.org/api/reactivity-utilities.html#isreactive
 */
export const isReactive = lytIsReactive

/**
 * 检查是否为只读代理
 * @see https://vuejs.org/api/reactivity-utilities.html#isreadonly
 */
export const isReadonly = lytIsReadonly

/**
 * 标记对象不进行响应式转换
 * @see https://vuejs.org/api/reactivity-advanced.html#markraw
 */
export function markRaw<T extends object>(value: T): T {
  ;(value as any).__v_skip = true
  return value
}

/**
 * 创建计算属性
 * @see https://vuejs.org/api/reactivity-core.html#computed
 */
export const computed = lytComputed

/**
 * 侦听响应式数据变化
 * @see https://vuejs.org/api/reactivity-core.html#watch
 */
export const watch = lytWatch

/**
 * 侦听副作用
 * @see https://vuejs.org/api/reactivity-core.html#watcheffect
 */
export const watchEffect = lytWatchEffect

/**
 * 侦听副作用（post 模式）
 * @see https://vuejs.org/api/reactivity-core.html#watchposteffect
 */
export function watchPostEffect(
  fn: (onCleanup: (cleanupFn: () => void) => void) => void
): () => void {
  return lytWatchEffect(fn, { flush: 'post' })
}

/**
 * 侦听副作用（sync 模式）
 * @see https://vuejs.org/api/reactivity-core.html#watchsynceffect
 */
export function watchSyncEffect(
  fn: (onCleanup: (cleanupFn: () => void) => void) => void
): () => void {
  return lytWatchEffect(fn, { flush: 'sync' })
}

/**
 * 创建副作用
 * @see https://vuejs.org/api/reactivity-advanced.html#effect
 */
export const effect = lytEffect

/**
 * 在下一个微任务中执行回调
 * @see https://vuejs.org/api/general.html#nexttick
 */
export const nextTick = lytNextTick

// ==========================================
// 依赖注入
// ==========================================

/**
 * 提供依赖
 * @see https://vuejs.org/api/composition-api-dependency-injection.html#provide
 */
export const provide = lytProvide

/**
 * 注入依赖
 * @see https://vuejs.org/api/composition-api-dependency-injection.html#inject
 */
export const inject = lytInject

// ==========================================
// 生命周期钩子
// ==========================================

/**
 * 组件挂载后调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onmounted
 */
export const onMounted = lytOnMounted

/**
 * 组件更新后调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onupdated
 */
export const onUpdated = lytOnUpdated

/**
 * 组件卸载前调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onunmounted
 */
export const onUnmounted = lytOnUnmounted

/**
 * 组件挂载前调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onbeforemount
 */
export const onBeforeMount = lytOnBeforeMount

/**
 * 组件更新前调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onbeforeupdate
 */
export const onBeforeUpdate = lytOnBeforeUpdate

/**
 * 组件卸载前调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onbeforeunmount
 */
export const onBeforeUnmount = lytOnBeforeUnmount

/**
 * 捕获后代组件的错误
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured
 */
export function onErrorCaptured(fn: (err: any, instance: any, info: string) => boolean | void): void {
  console.warn('[Compat: onErrorCaptured is a placeholder')
}

/**
 * 响应式依赖被追踪时调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onrendertracked
 */
export function onRenderTracked(fn: (event: any) => void): void {
  console.warn('[Compat: onRenderTracked is a placeholder')
}

/**
 * 响应式依赖触发更新时调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onrendertriggered
 */
export function onRenderTriggered(fn: (event: any) => void): void {
  console.warn('[Compat: onRenderTriggered is a placeholder')
}

/**
 * KeepAlive 组件激活时调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onactivated
 */
export function onActivated(fn: () => void): void {
  console.warn('[Compat: onActivated is a placeholder')
}

/**
 * KeepAlive 组件停用时调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#ondeactivated
 */
export function onDeactivated(fn: () => void): void {
  console.warn('[Compat: onDeactivated is a placeholder')
}

/**
 * 服务器端预取时调用
 * @see https://vuejs.org/api/composition-api-lifecycle.html#onserverprefetch
 */
export function onServerPrefetch(fn: () => Promise<any>): void {
  console.warn('[Compat: onServerPrefetch is a placeholder')
}

// ==========================================
// 高级 API
// ==========================================

let currentInstance: any = null
let currentScope: any = null

/**
 * 获取当前组件实例
 * @see https://vuejs.org/api/composition-api-general.html#getcurrentinstance
 */
export function getCurrentInstance(): any {
  return currentInstance
}

/**
 * 设置当前组件实例（内部使用）
 */
export function setCurrentInstance(instance: any): void {
  currentInstance = instance
}

/**
 * 获取当前作用域
 * @see https://vuejs.org/api/reactivity-advanced.html#getcurrentscope
 */
export function getCurrentScope(): any {
  return currentScope
}

/**
 * 在当前作用域销毁时调用
 * @see https://vuejs.org/api/reactivity-advanced.html#onscopedispose
 */
export function onScopeDispose(fn: () => void): void {
  console.warn('[Compat: onScopeDispose is a placeholder')
}

// ==========================================
// 渲染函数
// ==========================================

/**
 * 创建虚拟节点
 * @see https://vuejs.org/api/render-function.html#h
 */
export const h = lytH

/**
 * Fragment 片段组件
 * @see https://vuejs.org/api/render-function.html#fragment
 */
export const Fragment = lytFragment

// ==========================================
// 异步组件
// ==========================================

/**
 * 定义异步组件
 * @see https://vuejs.org/api/general.html#defineasynccomponent
 */
export const defineAsyncComponent = lytDefineAsyncComponent

// ==========================================
// 编译器宏（占位）
// ==========================================

/**
 * 定义组件 props（编译器宏占位）
 *
 * 在 Lyt.js 中，props 通过 defineComponent 的 props 选项定义。
 * 此函数仅用于代码兼容，运行时返回空对象。
 *
 * @see https://vuejs.org/api/sfc-script-setup.html#defineprops
 */
export function defineProps<T = any>(): T {
  console.warn('[Compat: defineProps is a compiler macro. Use defineComponent({ props: {...} }) instead.')
  return {} as T
}

/**
 * 定义组件 emits（编译器宏占位）
 *
 * 在 Lyt.js 中，emits 通过 defineComponent 的 emits 选项定义。
 * 此函数包装了 @lytjs/component 的 defineEmits。
 *
 * @see https://vuejs.org/api/sfc-script-setup.html#defineemits
 */
export const defineEmits = lytDefineEmits

/**
 * 为 props 设置默认值（编译器宏占位）
 *
 * @see https://vuejs.org/api/sfc-script-setup.html#withdefaults
 */
export function withDefaults<T, D>(props: T, defaults: D): T & D {
  console.warn('[Compat: withDefaults is a compiler macro. Use defineComponent({ props: { ...withDefaults } }) instead.')
  return { ...props, ...defaults } as T & D
}

/**
 * 暴露组件公共属性（编译器宏占位）
 *
 * 在 Lyt.js 中，setup 返回的对象自动暴露为公共属性。
 *
 * @see https://vuejs.org/api/sfc-script-setup.html#defineexpose
 */
export function defineExpose<T = any>(exposed?: T): void {
  console.warn('[Compat: defineExpose is a compiler macro. In Lyt.js, setup return values are automatically exposed.')
}

// ==========================================
// 组合式 API 工具函数
// ==========================================

/**
 * 使用插槽（占位）
 * @see https://vuejs.org/api/composition-api-setup.html#useslots
 */
export function useSlots(): Record<string, any> {
  console.warn('[Compat: useSlots is a placeholder. Access slots via setup context.')
  return {}
}

/**
 * 使用 attrs（占位）
 * @see https://vuejs.org/api/composition-api-setup.html#useattrs
 */
export function useAttrs(): Record<string, any> {
  console.warn('[Compat: useAttrs is a placeholder. Access attrs via setup context.')
  return {}
}

/**
 * 使用模板引用（占位）
 * @see https://vuejs.org/api/composition-api-setup.html#usetemplateRef
 */
export function useTemplateRef<T = any>(key: string): { value: T | null } {
  console.warn('[Compat: useTemplateRef is a placeholder. Use ref() and template ref attribute instead.')
  return { value: null }
}

// ==========================================
// 响应式工具函数
// ==========================================

/**
 * 检查值是否为代理对象（reactive / readonly）
 * @see https://vuejs.org/api/reactivity-utilities.html#isproxy
 */
export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value)
}

/**
 * 将 ref 标记为不再需要跟踪
 * @see https://vuejs.org/api/reactivity-utilities.html#toraw
 */
export function proxyRefs<T extends object>(objectWithRefs: T): T {
  console.warn('[Compat: proxyRefs is a placeholder. Use reactive() or toRefs() instead.')
  return objectWithRefs
}
