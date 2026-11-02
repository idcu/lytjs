// src/types.ts
// All type definitions for @lytjs/component

import type { VNode } from '@lytjs/vdom';
import type { EffectScope } from '@lytjs/reactivity';
import type { BaseAppContext } from '@lytjs/shared-types';
import type {
  SlotFunction,
  InternalSlots,
  ComponentPublicInstance,
  DebuggerEvent,
} from '@lytjs/shared-types';

// Re-export shared component types
export type { SlotFunction, InternalSlots };
export type { ComponentPublicInstance } from '@lytjs/shared-types';

// ==================== PropOptions ====================

/** Prop 类型构造器 */
export type PropType<T> =
  | {
      new (...args: unknown[]): T & {};
    }
  | { (): T };
type PropConstructor<T> = PropType<T> | true;

export interface PropOptions<T = unknown> {
  type?: PropConstructor<T>;
  required?: boolean;
  default?: T;
  validator?: (value: unknown) => boolean;
}

// ==================== SetupContext ====================

export interface SetupContext {
  attrs: Record<string, unknown>;
  slots: InternalSlots;
  emit: (event: string, ...args: unknown[]) => void;
  expose?: (exposed?: Record<string, unknown>) => void;
}

// ==================== RenderFunction ====================

export type RenderFunction = (ctx: ComponentPublicInstance) => VNode;

// ==================== ComponentOptions ====================

export interface ComponentOptions<
  Props = Record<string, unknown>,
  RawBindings = Record<string, unknown>,
  D = Record<string, unknown>,
  C extends Record<string, unknown> = Record<string, unknown>,
> {
  name?: string;
  /**
   * 声明本组件应由 **vdom 内置分派**处理，而不是走普通组件实例路径。
   *
   * 值取 `@lytjs/common-vnode` 里的符号（`Teleport` / `Suspense`），
   * 由 `getShapeFlag` 识别。用于那些**自身不参与渲染、逻辑全在 vdom 的
   * mount/patch 里**的内置组件（它们的 `setup` 注释即如此声明）。
   *
   * ⚠️ 不加这个字段时，这类组件对象会落进 `STATEFUL_COMPONENT` 分支 →
   * `mountComponent` 找不到 `render` → **静默渲染为空**（2026-10-02 实测）。
   */
  __vnodeType?: unknown;
  props?: Record<string, PropOptions<unknown>> & Props;
  emits?: string[] | Record<string, (...args: unknown[]) => void>;
  setup?: (props: Props, ctx: SetupContext) => RawBindings | RenderFunction | void;
  render?: RenderFunction;
  /**
   * 模板字符串（运行时编译）。
   *
   * 由注入的模板编译器编译为渲染函数 —— 见 component-init.ts 的
   * `setTemplateCompiler`（`@lytjs/core` 会注入 `compileTemplateToRender`）。
   *
   * 优先级：`setup` 返回的渲染函数 > `render` > `template`。
   *
   * ⚠️ 2026-09-26 补齐：此前本字段**不存在**，导致
   * ① TS 用户传 `template` 报类型错误（既有测试里被迫写 `as never`）；
   * ② 运行时 `finishComponentSetup` 没有 template 分支 ⇒ **静默渲染空白**。
   * 两点现已一并修复。
   *
   * ℹ️ 生产环境建议走 AOT 预编译，运行时编译会引入编译器体积与 `new Function` 开销。
   */
  template?: string;
  data?: () => D;
  computed?: C;
  watch?: Record<string, (...args: unknown[]) => void>;
  methods?: Record<string, (...args: unknown[]) => unknown>;
  provide?: Record<string, unknown> | (() => Record<string, unknown>);
  inject?: Record<string, unknown>;
  mixins?: ComponentOptions[];
  extends?: ComponentOptions;
  beforeCreate?(): void;
  created?(): void;
  beforeMount?(): void;
  mounted?(): void;
  beforeUpdate?(): void;
  updated?(): void;
  beforeUnmount?(): void;
  unmounted?(): void;
  activated?(): void;
  deactivated?(): void;
  errorCaptured?(
    err: Error,
    instance: ComponentPublicInstance | null,
    info: string,
  ): boolean | void;
  renderTracked?(e: DebuggerEvent): void;
  renderTriggered?(e: DebuggerEvent): void;
  inheritAttrs?: boolean;
}

// ==================== AppContext ====================

// FIX: P2-36 定义 AppContextConfig 接口，明确 config 的可选属性，
// 避免类型过于宽泛（原来 config 类型为 {}），提高类型安全性
export interface AppContextConfig {
  /** 全局属性，可通过组件实例的 $ 访问 */
  globalProperties?: Record<string, unknown>;
  /** 全局错误处理器 */
  errorHandler?: (err: Error, instance: unknown, info: string) => void;
  /** 全局警告处理器 */
  warnHandler?: (msg: string, instance: unknown, trace: string) => void;
  /** 是否为原生标签 */
  isNativeTag?: (tag: string) => boolean;
  /** 自定义配置字段 */
  [key: string]: unknown;
}

export interface AppContext extends BaseAppContext<AppContextConfig> {
  components: Record<string, ComponentOptions>;
  directives: Record<string, unknown>;
  mixins: ComponentOptions[];
  provides: Record<string | symbol, unknown>;
}

// ==================== ComponentInternalInstance 子接口 ====================

/** 组件身份标识：type、name、uid 等 */
export interface ComponentIdentity {
  uid: number;
  type: ComponentOptions;
}

/** 组件生命周期状态：挂载/卸载标记、生命周期钩子等 */
export interface ComponentLifecycleState {
  isMounted: boolean;
  isUnmounted: boolean;
  isDeactivated: boolean;
  isKeepingAlive: boolean;
  refs: Record<string, unknown>;
  lifecycle: {
    beforeMount: Set<(...args: unknown[]) => void>;
    mounted: Set<(...args: unknown[]) => void>;
    beforeUpdate: Set<(...args: unknown[]) => void>;
    updated: Set<(...args: unknown[]) => void>;
    beforeUnmount: Set<(...args: unknown[]) => void>;
    unmounted: Set<(...args: unknown[]) => void>;
  };
  errorCapturedHooks?: Array<
    (err: Error, instance: ComponentPublicInstance | null, info: string) => boolean | void
  >;
  activatedHooks?: Array<() => void>;
  deactivatedHooks?: Array<() => void>;
  renderTrackedHooks?: Array<(e: DebuggerEvent) => void>;
  renderTriggeredHooks?: Array<(e: DebuggerEvent) => void>;
}

/** 组件渲染状态：render、subTree、update 等 */
export interface ComponentRenderState {
  vnode: VNode | null;
  subTree: VNode | null;
  render?: RenderFunction;
  effects?: Array<{ stop(): void }>;
  /**
   * 组件自己的 effect scope：`setup()` 里创建的 effect / watch / watchEffect /
   * computed 全部收集在这里，卸载时一次性 `stop()`。
   *
   * ⚠️ 2026-11-03 新增（P0）。此前**没有任何 scope**：`runSetup` 只是
   * `setCurrentInstance(instance); setup(...)`，而 setup 里 `watch(...)` 创建的
   * effect 落在**当前活跃 scope**（顶层调用时根本没有 scope）⇒ 无人持有、无人停止。
   * 实测后果（`scripts/check-lifecycle-release.mjs`）：
   *   · `app.unmount()` 后 `onUnmounted` 正常触发（4/4）、DOM 也清空，
   *     但 `watch` 回调**照样继续跑**（改一次状态 → 4 个已卸载组件的回调全被调用）；
   *   · watcher 持有组件实例引用 ⇒ 实例 → subTree → 已脱离文档的 DOM 全部无法回收；
   *   · 反复挂载/卸载会线性累积（实测 20 轮 → 20 个残留监听器）。
   *
   * `detached: true`：子组件的 scope 不挂到父 scope 上 —— 子组件的销毁由渲染器
   * 递归 unmount 负责（KeepAlive 停用时**不能**被父级连带停掉）。
   */
  scope?: EffectScope;
  update?: () => void;
  /**
   * `async setup` 返回的 Promise（同步 setup 时为 undefined）。
   *
   * ⚠️ 2026-11-01 新增：此前 Promise 只在 `setupComponent` 内部被 `.then` 掉，
   *   **外部拿不到** ⇒ 任何"等服务端数据就绪再渲染"的调用方（如 SSR 的
   *   `renderToStringAsync`）只能靠猜时间，没法真正 await。
   */
  asyncDep?: Promise<unknown>;
  /**
   * `setup()` 抛出的错误（正常时为 undefined）。
   *
   * ⚠️ 2026-11-03 新增。此前 `runSetup` 的 catch 只做两件事：`handleError(...)` +
   *   `instance.render = () => null`，**错误本身没有被记录**。客户端这样处理是对的
   *   （降级为"这个组件不渲染"，整棵树还能用）；但 **SSR 会把"不渲染"直接变成空串**，
   *   服务端于是返回 `200 + 空页` —— 正是本仓反复列为最难排查的失败方式。
   *
   *   SSR 侧据此判断「这个组件是不是根本没起来」，从而明确抛错而不是静默输出空页。
   */
  setupError?: Error;
}

/** 组件上下文状态：props、slots、attrs、emit、provides 等 */
export interface ComponentContextState {
  props: Record<string, unknown>;
  slots: InternalSlots;
  ctx: ComponentPublicInstance;
  setupState: Record<string, unknown>;
  data: Record<string, unknown>;
  propsOptions: Record<string, PropOptions>;
  emitsOptions: Record<string, unknown> | null;
  emit: (event: string, ...args: unknown[]) => void;
  provides: Record<string | symbol, unknown>;
  exposed?: Record<string, unknown> | null;
  attrs: Record<string, unknown>;
  accessCache: Record<string, number> | null;
}

/** 组件层级关系：parent、root、appContext 等 */
export interface ComponentParentState {
  parent: ComponentInternalInstance | null;
  root: ComponentInternalInstance;
  appContext: AppContext;
}

// ==================== ComponentInternalInstance ====================

export interface ComponentInternalInstance
  extends
    ComponentIdentity,
    ComponentLifecycleState,
    ComponentRenderState,
    ComponentContextState,
    ComponentParentState {}
