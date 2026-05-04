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
  props?: Record<string, PropOptions<unknown>> & Props;
  emits?: string[] | Record<string, (...args: unknown[]) => void>;
  setup?: (props: Props, ctx: SetupContext) => RawBindings | RenderFunction | void;
  render?: RenderFunction;
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
  inheritAttrs?: boolean;
}

// ==================== AppContext ====================

export interface AppContext extends BaseAppContext {
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
