// src/types.ts
// All type definitions for @lytjs/component

import type { VNode } from '@lytjs/vdom';
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
  update?: () => void;
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
