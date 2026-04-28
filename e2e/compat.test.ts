/**
 * E2E 测试: @lytjs/compat Vue 3 兼容层测试
 *
 * 测试核心 API:
 * - ref/reactive/computed 等 API 正确导出
 * - defineProps 返回值
 * - withDefaults 合并默认值
 * - useSlots/useAttrs
 * - onActivated/onDeactivated 注册
 */

import { test, expect } from '@playwright/test'

// 从 dist 目录动态导入 compat 模块
const compatPath = new URL('../packages/compat/dist/index.mjs', import.meta.url).href

let compat: any

test.beforeAll(async () => {
  compat = await import(compatPath)
})

// ======================== 核心 API 导出测试 ========================

test('compat - ref API 正确导出', () => {
  expect(typeof compat.ref).toBe('function')
  const r = compat.ref(0)
  expect(r.value).toBe(0)
  r.value = 10
  expect(r.value).toBe(10)
})

test('compat - shallowRef API 正确导出', () => {
  expect(typeof compat.shallowRef).toBe('function')
  const sr = compat.shallowRef({ count: 0 })
  expect(sr.value.count).toBe(0)
})

test('compat - isRef API 正确导出', () => {
  expect(typeof compat.isRef).toBe('function')
  const r = compat.ref(1)
  expect(compat.isRef(r)).toBe(true)
  expect(compat.isRef(42)).toBe(false)
})

test('compat - unref API 正确导出', () => {
  expect(typeof compat.unref).toBe('function')
  expect(compat.unref(compat.ref(5))).toBe(5)
  expect(compat.unref(10)).toBe(10)
})

test('compat - toRef API 正确导出', () => {
  expect(typeof compat.toRef).toBe('function')
})

test('compat - toRefs API 正确导出', () => {
  expect(typeof compat.toRefs).toBe('function')
})

test('compat - triggerRef API 正确导出', () => {
  expect(typeof compat.triggerRef).toBe('function')
})

test('compat - reactive API 正确导出', () => {
  expect(typeof compat.reactive).toBe('function')
  const state = compat.reactive({ count: 0 })
  expect(state.count).toBe(0)
  state.count = 5
  expect(state.count).toBe(5)
})

test('compat - readonly API 正确导出', () => {
  expect(typeof compat.readonly).toBe('function')
  const ro = compat.readonly({ a: 1 })
  expect(compat.isReadonly(ro)).toBe(true)
})

test('compat - shallowReactive API 正确导出', () => {
  expect(typeof compat.shallowReactive).toBe('function')
})

test('compat - toRaw API 正确导出', () => {
  expect(typeof compat.toRaw).toBe('function')
})

test('compat - isReactive API 正确导出', () => {
  expect(typeof compat.isReactive).toBe('function')
  const state = compat.reactive({ a: 1 })
  expect(compat.isReactive(state)).toBe(true)
})

test('compat - isReadonly API 正确导出', () => {
  expect(typeof compat.isReadonly).toBe('function')
})

test('compat - markRaw API 正确导出', () => {
  expect(typeof compat.markRaw).toBe('function')
  const obj = compat.markRaw({ a: 1 })
  expect(obj.__v_skip).toBe(true)
})

test('compat - computed API 正确导出', () => {
  expect(typeof compat.computed).toBe('function')
  const count = compat.ref(1)
  const double = compat.computed(() => count.value * 2)
  expect(double.value).toBe(2)
  count.value = 5
  expect(double.value).toBe(10)
})

test('compat - watch API 正确导出', () => {
  expect(typeof compat.watch).toBe('function')
})

test('compat - watchEffect API 正确导出', () => {
  expect(typeof compat.watchEffect).toBe('function')
})

test('compat - watchPostEffect API 正确导出', () => {
  expect(typeof compat.watchPostEffect).toBe('function')
})

test('compat - watchSyncEffect API 正确导出', () => {
  expect(typeof compat.watchSyncEffect).toBe('function')
})

test('compat - effect API 正确导出', () => {
  expect(typeof compat.effect).toBe('function')
})

test('compat - nextTick API 正确导出', () => {
  expect(typeof compat.nextTick).toBe('function')
  expect(compat.nextTick()).toBeInstanceOf(Promise)
})

// ======================== 依赖注入 API ========================

test('compat - provide/inject API 正确导出', () => {
  expect(typeof compat.provide).toBe('function')
  expect(typeof compat.inject).toBe('function')
})

// ======================== 生命周期 API ========================

test('compat - onMounted API 正确导出', () => {
  expect(typeof compat.onMounted).toBe('function')
})

test('compat - onUpdated API 正确导出', () => {
  expect(typeof compat.onUpdated).toBe('function')
})

test('compat - onUnmounted API 正确导出', () => {
  expect(typeof compat.onUnmounted).toBe('function')
})

test('compat - onBeforeMount API 正确导出', () => {
  expect(typeof compat.onBeforeMount).toBe('function')
})

test('compat - onBeforeUpdate API 正确导出', () => {
  expect(typeof compat.onBeforeUpdate).toBe('function')
})

test('compat - onBeforeUnmount API 正确导出', () => {
  expect(typeof compat.onBeforeUnmount).toBe('function')
})

test('compat - onErrorCaptured API 正确导出', () => {
  expect(typeof compat.onErrorCaptured).toBe('function')
  // 占位函数，不应抛错
  expect(() => compat.onErrorCaptured(() => {})).not.toThrow()
})

test('compat - onRenderTracked API 正确导出', () => {
  expect(typeof compat.onRenderTracked).toBe('function')
})

test('compat - onRenderTriggered API 正确导出', () => {
  expect(typeof compat.onRenderTriggered).toBe('function')
})

// ======================== onActivated / onDeactivated ========================

test('compat - onActivated 注册钩子', () => {
  // 无 currentInstance 时调用不应报错
  expect(() => compat.onActivated(() => {})).not.toThrow()
})

test('compat - onDeactivated 注册钩子', () => {
  // 无 currentInstance 时调用不应报错
  expect(() => compat.onDeactivated(() => {})).not.toThrow()
})

test('compat - onActivated 在有实例时注册', () => {
  // 设置一个模拟的 currentInstance
  const mockInstance: any = {}
  compat.setCurrentInstance(mockInstance)
  compat.onActivated(() => {})
  expect(mockInstance._activatedHooks).toBeTruthy()
  expect(mockInstance._activatedHooks.length).toBe(1)
  compat.setCurrentInstance(null)
})

test('compat - onDeactivated 在有实例时注册', () => {
  const mockInstance: any = {}
  compat.setCurrentInstance(mockInstance)
  compat.onDeactivated(() => {})
  expect(mockInstance._deactivatedHooks).toBeTruthy()
  expect(mockInstance._deactivatedHooks.length).toBe(1)
  compat.setCurrentInstance(null)
})

// ======================== onServerPrefetch ========================

test('compat - onServerPrefetch 占位函数', () => {
  expect(typeof compat.onServerPrefetch).toBe('function')
  // 占位函数，不应抛错
  expect(() => compat.onServerPrefetch(async () => {})).not.toThrow()
})

// ======================== 编译器宏（占位） ========================

test('compat - defineProps 返回值', () => {
  expect(typeof compat.defineProps).toBe('function')
  // 无 currentInstance 时返回空对象
  const props = compat.defineProps()
  expect(props).toBeTruthy()
  expect(typeof props).toBe('object')
})

test('compat - defineProps 在有实例时返回实例 props', () => {
  const mockInstance: any = { props: { title: 'Hello', count: 42 } }
  compat.setCurrentInstance(mockInstance)
  const props = compat.defineProps<{ title: string; count: number }>()
  expect(props.title).toBe('Hello')
  expect(props.count).toBe(42)
  compat.setCurrentInstance(null)
})

test('compat - defineEmits 正确导出', () => {
  expect(typeof compat.defineEmits).toBe('function')
})

test('compat - withDefaults 合并默认值', () => {
  expect(typeof compat.withDefaults).toBe('function')
  const props = { title: 'Custom' }
  const defaults = { title: 'Default', count: 0, active: true }
  const merged = compat.withDefaults(props, defaults)
  expect(merged.title).toBe('Custom') // props 优先
  expect(merged.count).toBe(0)         // 使用默认值
  expect(merged.active).toBe(true)     // 使用默认值
})

test('compat - withDefaults 空属性使用全部默认值', () => {
  const props = {}
  const defaults = { name: 'lyt', version: 5 }
  const merged = compat.withDefaults(props, defaults)
  expect(merged.name).toBe('lyt')
  expect(merged.version).toBe(5)
})

test('compat - defineExpose 占位函数', () => {
  expect(typeof compat.defineExpose).toBe('function')
  // 无 currentInstance 时不应报错
  expect(() => compat.defineExpose({ method: () => {} })).not.toThrow()
})

test('compat - defineExpose 在有实例时设置 _exposed', () => {
  const mockInstance: any = {}
  compat.setCurrentInstance(mockInstance)
  const exposed = { count: 0, method: () => {} }
  compat.defineExpose(exposed)
  expect(mockInstance._exposed).toBe(exposed)
  compat.setCurrentInstance(null)
})

// ======================== useSlots / useAttrs ========================

test('compat - useSlots 返回值', () => {
  expect(typeof compat.useSlots).toBe('function')
  // 无 currentInstance 时返回空对象
  const slots = compat.useSlots()
  expect(slots).toBeTruthy()
  expect(typeof slots).toBe('object')
})

test('compat - useSlots 在有实例时返回实例 slots', () => {
  const mockSlots = { default: () => 'content', header: () => 'header' }
  const mockInstance: any = { slots: mockSlots }
  compat.setCurrentInstance(mockInstance)
  const slots = compat.useSlots()
  expect(slots).toBe(mockSlots)
  compat.setCurrentInstance(null)
})

test('compat - useAttrs 返回值', () => {
  expect(typeof compat.useAttrs).toBe('function')
  // 无 currentInstance 时返回空对象
  const attrs = compat.useAttrs()
  expect(attrs).toBeTruthy()
  expect(typeof attrs).toBe('object')
})

test('compat - useAttrs 在有实例时返回实例 attrs', () => {
  const mockAttrs = { class: 'test', id: 'app' }
  const mockInstance: any = { attrs: mockAttrs }
  compat.setCurrentInstance(mockInstance)
  const attrs = compat.useAttrs()
  expect(attrs).toBe(mockAttrs)
  compat.setCurrentInstance(null)
})

test('compat - useTemplateRef 占位函数', () => {
  expect(typeof compat.useTemplateRef).toBe('function')
  const ref = compat.useTemplateRef('myRef')
  expect(ref.value).toBeNull()
})

// ======================== 响应式工具 ========================

test('compat - isProxy API', () => {
  expect(typeof compat.isProxy).toBe('function')
  const state = compat.reactive({ a: 1 })
  expect(compat.isProxy(state)).toBe(true)
  expect(compat.isProxy({ a: 1 })).toBe(false)
})

test('compat - proxyRefs API', () => {
  expect(typeof compat.proxyRefs).toBe('function')
  const r = compat.ref(5)
  const obj = { count: r, name: 'lyt' }
  const proxied = compat.proxyRefs(obj)
  expect(proxied.count).toBe(5)
  expect(proxied.name).toBe('lyt')
})

// ======================== 渲染函数 ========================

test('compat - h 函数正确导出', () => {
  expect(typeof compat.h).toBe('function')
})

test('compat - Fragment 正确导出', () => {
  expect(compat.Fragment).toBeTruthy()
})

// ======================== 异步组件 ========================

test('compat - defineAsyncComponent 正确导出', () => {
  expect(typeof compat.defineAsyncComponent).toBe('function')
})

// ======================== getCurrentInstance ========================

test('compat - getCurrentInstance API', () => {
  expect(typeof compat.getCurrentInstance).toBe('function')
  expect(compat.getCurrentInstance()).toBeNull()
})

test('compat - getCurrentScope API', () => {
  expect(typeof compat.getCurrentScope).toBe('function')
})

test('compat - onScopeDispose 占位函数', () => {
  expect(typeof compat.onScopeDispose).toBe('function')
  expect(() => compat.onScopeDispose(() => {})).not.toThrow()
})

// ======================== createApp / defineComponent ========================

test('compat - createApp 正确导出', () => {
  expect(typeof compat.createApp).toBe('function')
})

test('compat - defineComponent 正确导出', () => {
  expect(typeof compat.defineComponent).toBe('function')
})

// ======================== 内置组件 ========================

test('compat - KeepAlive 正确导出', () => {
  expect(compat.KeepAlive).toBeTruthy()
})

test('compat - Teleport 正确导出', () => {
  expect(compat.Teleport).toBeTruthy()
})

test('compat - Transition 正确导出', () => {
  expect(compat.Transition).toBeTruthy()
})

test('compat - TransitionGroup 正确导出', () => {
  expect(compat.TransitionGroup).toBeTruthy()
})

test('compat - Suspense 正确导出', () => {
  expect(compat.Suspense).toBeTruthy()
})

// ======================== SFC 转换工具 ========================

test('compat - convertVueSfcToLyt 正确导出', () => {
  expect(typeof compat.convertVueSfcToLyt).toBe('function')
})

test('compat - convertVueSfcToLytWithWarnings 正确导出', () => {
  expect(typeof compat.convertVueSfcToLytWithWarnings).toBe('function')
})

test('compat - VueSfcConverter 正确导出', () => {
  expect(compat.VueSfcConverter).toBeTruthy()
})

// ======================== 迁移工具 ========================

test('compat - migrateVueFile 正确导出', () => {
  expect(typeof compat.migrateVueFile).toBe('function')
})

test('compat - analyzeVueFile 正确导出', () => {
  expect(typeof compat.analyzeVueFile).toBe('function')
})

test('compat - formatMigrationReport 正确导出', () => {
  expect(typeof compat.formatMigrationReport).toBe('function')
})

// ======================== 兼容模式工具 ========================

test('compat - createCompatVue 正确导出', () => {
  expect(typeof compat.createCompatVue).toBe('function')
})

test('compat - useCompatMode 正确导出', () => {
  expect(typeof compat.useCompatMode).toBe('function')
})
