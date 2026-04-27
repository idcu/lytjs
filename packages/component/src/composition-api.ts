/**
 * Lyt.js Composition API
 *
 * 提供 setup() 函数式组件编写能力，包括：
 * - 生命周期钩子（onMounted / onUnmounted / onUpdated / onBeforeMount / onBeforeUnmount）
 * - 依赖注入（provide / inject）
 * - setup 执行器（runSetup）
 * - 当前实例访问（getCurrentInstance）
 *
 * 纯原生实现，零外部依赖。
 */

// ============================================================
// 类型定义
// ============================================================

/** 生命周期钩子回调函数类型 */
type LifecycleHook = () => void

/** setup 函数类型 */
export type SetupFunction = (props: any, ctx: any) => object | Function

// ============================================================
// 内部状态
// ============================================================

/** 当前正在执行的 setup 对应的组件实例 */
let currentSetupInstance: any = null

// ============================================================
// 生命周期钩子
// ============================================================

/**
 * 注册挂载完成钩子
 *
 * 在组件挂载到 DOM 后调用。必须在 setup() 函数内调用。
 *
 * @param hook - 钩子回调函数
 */
export function onMounted(hook: LifecycleHook): void {
  if (currentSetupInstance) {
    const hooks = currentSetupInstance._lifecycleHooks || (currentSetupInstance._lifecycleHooks = {})
    const mounted = hooks.mounted || (hooks.mounted = [])
    mounted.push(hook)
  }
}

/**
 * 注册卸载完成钩子
 *
 * 在组件从 DOM 移除后调用。必须在 setup() 函数内调用。
 *
 * @param hook - 钩子回调函数
 */
export function onUnmounted(hook: LifecycleHook): void {
  if (currentSetupInstance) {
    const hooks = currentSetupInstance._lifecycleHooks || (currentSetupInstance._lifecycleHooks = {})
    const unmounted = hooks.unmounted || (hooks.unmounted = [])
    unmounted.push(hook)
  }
}

/**
 * 注册更新完成钩子
 *
 * 在组件响应式数据变化导致 DOM 更新后调用。必须在 setup() 函数内调用。
 *
 * @param hook - 钩子回调函数
 */
export function onUpdated(hook: LifecycleHook): void {
  if (currentSetupInstance) {
    const hooks = currentSetupInstance._lifecycleHooks || (currentSetupInstance._lifecycleHooks = {})
    const updated = hooks.updated || (hooks.updated = [])
    updated.push(hook)
  }
}

/**
 * 注册挂载前钩子
 *
 * 在组件挂载到 DOM 前调用。必须在 setup() 函数内调用。
 *
 * @param hook - 钩子回调函数
 */
export function onBeforeMount(hook: LifecycleHook): void {
  if (currentSetupInstance) {
    const hooks = currentSetupInstance._lifecycleHooks || (currentSetupInstance._lifecycleHooks = {})
    const beforeMount = hooks.beforeMount || (hooks.beforeMount = [])
    beforeMount.push(hook)
  }
}

/**
 * 注册卸载前钩子
 *
 * 在组件从 DOM 移除前调用。必须在 setup() 函数内调用。
 *
 * @param hook - 钩子回调函数
 */
export function onBeforeUnmount(hook: LifecycleHook): void {
  if (currentSetupInstance) {
    const hooks = currentSetupInstance._lifecycleHooks || (currentSetupInstance._lifecycleHooks = {})
    const beforeUnmount = hooks.beforeUnmount || (hooks.beforeUnmount = [])
    beforeUnmount.push(hook)
  }
}

// ============================================================
// provide / inject
// ============================================================

/** provide 数据存储：组件实例 → (key → value) 映射 */
const provideMap = new WeakMap<object, Map<string | symbol, any>>()

/**
 * 提供依赖
 *
 * 在祖先组件的 setup() 中调用，为后代组件提供数据。
 *
 * @param key - 依赖的唯一标识
 * @param value - 要提供的值
 *
 * @example
 * ```ts
 * setup(props, ctx) {
 *   provide('theme', 'dark')
 *   provide('config', reactive({ debug: true }))
 * }
 * ```
 */
export function provide<T>(key: string | symbol, value: T): void {
  if (currentSetupInstance) {
    let map = provideMap.get(currentSetupInstance)
    if (!map) {
      map = new Map()
      provideMap.set(currentSetupInstance, map)
    }
    map.set(key, value)
  }
}

/**
 * 注入依赖
 *
 * 在后代组件的 setup() 中调用，从祖先组件查找并获取提供的数据。
 * 沿着组件实例的 _parent 链向上查找，直到找到匹配的 key 或到达根组件。
 *
 * @param key - 依赖的唯一标识
 * @param defaultValue - 找不到时的默认值（可选）
 * @returns 注入的值或默认值
 *
 * @example
 * ```ts
 * setup(props, ctx) {
 *   const theme = inject<string>('theme')          // 'dark'
 *   const config = inject('config', { debug: false }) // 使用默认值
 * }
 * ```
 */
export function inject<T>(key: string | symbol, defaultValue?: T): T | undefined {
  if (currentSetupInstance) {
    let instance: any = currentSetupInstance
    while (instance) {
      const map = provideMap.get(instance)
      if (map && map.has(key)) {
        return map.get(key)
      }
      instance = instance._parent
    }
  }
  return defaultValue
}

// ============================================================
// setup 执行器
// ============================================================

/**
 * 执行 setup 函数
 *
 * 在组件初始化阶段调用，设置当前实例上下文后执行用户定义的 setup 函数。
 * setup 可以返回：
 * - 对象：属性合并到组件上下文（renderProxy）
 * - 函数：作为组件的渲染函数
 *
 * @param setupFn - 用户定义的 setup 函数
 * @param instance - 组件内部实例
 * @param props - 组件 props
 * @param ctx - 组件上下文（包含 attrs、slots、emit 等）
 * @returns setup 返回值（对象或函数）
 */
export function runSetup(setupFn: Function, instance: any, props: any, ctx: any): any {
  currentSetupInstance = instance
  try {
    const result = setupFn(props, ctx)
    return result
  } finally {
    // 组件卸载时自动清理 provideMap，避免内存泄漏
    const hooks = instance._lifecycleHooks || (instance._lifecycleHooks = {})
    const unmounted = hooks.unmounted || (hooks.unmounted = [])
    unmounted.push(() => {
      provideMap.delete(instance)
    })
    currentSetupInstance = null
  }
}

/**
 * 获取当前正在执行的 setup 对应的组件实例
 *
 * 只能在 setup() 执行期间调用，其他时候返回 null。
 *
 * @returns 当前组件实例或 null
 */
export function getCurrentInstance(): any {
  return currentSetupInstance
}
