/**
 * Vue 3 兼容类型定义
 */

// 从 @lytjs/reactivity 导入类型
import type {
  Ref as LytRef,
  ComputedRef as LytComputedRef,
  WritableComputedRef as LytWritableComputedRef,
} from '@lytjs/reactivity'

// ==========================================
// 响应式类型
// ==========================================

/**
 * Ref 类型
 * @see https://vuejs.org/api/reactivity-core.html#ref
 */
export type Ref<T = any> = LytRef<T>

/**
 * 计算属性类型（只读）
 * @see https://vuejs.org/api/reactivity-core.html#computed
 */
export type ComputedRef<T = any> = LytComputedRef<T>

/**
 * 可写计算属性类型
 * @see https://vuejs.org/api/reactivity-core.html#computed
 */
export type WritableComputedRef<T = any> = LytWritableComputedRef<T>

/**
 * 响应式对象类型
 * @see https://vuejs.org/api/reactivity-core.html#reactive
 */
export type Reactive<T = any> = T

/**
 * 解包 Ref 类型
 * @see https://vuejs.org/api/reactivity-utilities.html#unref
 */
export type UnwrapRef<T> = T extends Ref<infer V> ? V : T

// ==========================================
// 组件类型
// ==========================================

/**
 * 组件公共实例类型
 * @see https://vuejs.org/api/component-instance.html
 */
export interface ComponentPublicInstance {
  $el: any
  $data: any
  $props: any
  $attrs: any
  $slots: any
  $refs: any
  $parent: any
  $root: any
  $emit: (event: string, ...args: any[]) => void
  $forceUpdate: () => void
  $nextTick: (fn: () => void) => Promise<void>
}

/**
 * Setup 上下文类型
 * @see https://vuejs.org/api/composition-api-setup.html#setup-context
 */
export interface SetupContext {
  attrs: Record<string, any>
  slots: Record<string, any>
  emit: (event: string, ...args: any[]) => void
  expose: (exposed?: Record<string, any>) => void
}

/**
 * 组件选项类型
 * @see https://vuejs.org/api/options-state.html
 */
export interface ComponentOptions {
  name?: string
  props?: any
  emits?: any
  data?: () => object
  computed?: Record<string, any>
  methods?: Record<string, Function>
  watch?: Record<string, any>
  setup?: (props: any, ctx: SetupContext) => any
  render?: () => any
  template?: string
  components?: Record<string, any>
  directives?: Record<string, any>
  provide?: any
  inject?: any
  beforeCreate?: () => void
  created?: () => void
  beforeMount?: () => void
  mounted?: () => void
  beforeUpdate?: () => void
  updated?: () => void
  beforeUnmount?: () => void
  unmounted?: () => void
  errorCaptured?: (err: any, instance: any, info: string) => boolean | void
}

/**
 * defineComponent 返回类型
 * @see https://vuejs.org/api/general.html#definecomponent
 */
export type DefineComponent<Props = any, RawBindings = any, D = any, C extends ComputedOptions = ComputedOptions, M extends MethodOptions = MethodOptions, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = {}, EE extends string = string, I extends ComponentInjectOptions = {}, II extends string = string, S extends SlotsType = {}, PP = Props> = any

/**
 * 计算选项类型
 */
export interface ComputedOptions {
  [key: string]: ((...args: any[]) => any) | { get?: (...args: any[]) => any; set?: (v: any) => any }
}

/**
 * 方法选项类型
 */
export interface MethodOptions {
  [key: string]: (...args: any[]) => any
}

/**
 * 组件混入选项类型
 */
export type ComponentOptionsMixin = ComponentOptions

/**
 * 触发选项类型
 */
export interface EmitsOptions {
  [key: string]: ((...args: any[]) => any) | null
}

/**
 * 组件注入选项类型
 */
export type ComponentInjectOptions = string[] | { [key: string]: string | symbol | { from?: string | symbol; default?: any } }

/**
 * 插槽类型
 */
export type SlotsType = { [key: string]: any }

// ==========================================
// 应用类型
// ==========================================

/**
 * App 实例类型
 * @see https://vuejs.org/api/application.html
 */
export interface App {
  config: AppConfig
  use(plugin: Plugin, ...options: any[]): this
  mixin(mixin: ComponentOptions): this
  component(name: string, component?: any): any
  directive(name: string, directive?: Directive): any
  mount(rootContainer: any, isHydrate?: boolean): ComponentPublicInstance
  unmount(): void
  provide<T>(key: string | symbol, value: T): this
}

/**
 * App 配置类型
 * @see https://vuejs.org/api/application.html#app-config
 */
export interface AppConfig {
  errorHandler?: (err: any, instance: any, info: string) => void
  warnHandler?: (msg: string, instance: any, trace: string) => void
  performance?: boolean
  compilerOptions?: any
  globalProperties?: any
}

/**
 * 插件类型
 * @see https://vuejs.org/guide/reusability/plugins.html
 */
export type Plugin = ((app: App, ...options: any[]) => any) | { install: (app: App, ...options: any[]) => any }

/**
 * 指令类型
 * @see https://vuejs.org/guide/reusability/custom-directives.html
 */
export interface Directive {
  created?: (el: any, binding: any, vnode: any, prevVnode: any) => void
  beforeMount?: (el: any, binding: any, vnode: any, prevVnode: any) => void
  mounted?: (el: any, binding: any, vnode: any, prevVnode: any) => void
  beforeUpdate?: (el: any, binding: any, vnode: any, prevVnode: any) => void
  updated?: (el: any, binding: any, vnode: any, prevVnode: any) => void
  beforeUnmount?: (el: any, binding: any, vnode: any, prevVnode: any) => void
  unmounted?: (el: any, binding: any, vnode: any, prevVnode: any) => void
}
