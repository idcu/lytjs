// src/types.ts
// All type definitions for @lytjs/component

import type { VNode } from "@lytjs/vdom";

// ==================== PropOptions ====================

/** Prop 类型构造器 */
export type PropType<T> = {
  new (...args: any[]): T & {};
} | { (): T };
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

// ==================== Slots ====================

export type SlotFunction = (props?: Record<string, unknown>) => VNode[];
export type InternalSlots = Record<string, SlotFunction | undefined>;

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
  errorCaptured?(err: Error, instance: ComponentPublicInstance | null, info: string): boolean | void;
  inheritAttrs?: boolean;
}

// ==================== AppContext ====================

export interface AppContext {
  config: Record<string, unknown>;
  components: Record<string, ComponentOptions>;
  directives: Record<string, unknown>;
  mixins: ComponentOptions[];
  provides: Map<string | symbol, unknown>;
}

export interface ComponentInternalInstance {
  uid: number;
  type: ComponentOptions;
  vnode: VNode | null;
  subTree: VNode | null;
  props: Record<string, unknown>;
  slots: InternalSlots;
  ctx: ComponentPublicInstance;
  setupState: Record<string, unknown>;
  data: Record<string, unknown>;
  propsOptions: Record<string, PropOptions>;
  emitsOptions: Record<string, unknown> | null;
  emit: (event: string, ...args: unknown[]) => void;
  isMounted: boolean;
  isUnmounted: boolean;
  isDeactivated: boolean;
  lifecycle: {
    beforeMount: Set<(...args: unknown[]) => void>;
    mounted: Set<(...args: unknown[]) => void>;
    beforeUpdate: Set<(...args: unknown[]) => void>;
    updated: Set<(...args: unknown[]) => void>;
    beforeUnmount: Set<(...args: unknown[]) => void>;
    unmounted: Set<(...args: unknown[]) => void>;
  };
  provides: Map<string | symbol, unknown>;
  parent: ComponentInternalInstance | null;
  root: ComponentInternalInstance;
  appContext: AppContext;
  render?: RenderFunction;
  exposed?: Record<string, unknown> | null;
  attrs: Record<string, unknown>;
  errorCapturedHooks?: Array<
    (err: Error, instance: ComponentPublicInstance | null, info: string) => boolean | void
  >;
  activatedHooks?: Array<() => void>;
  deactivatedHooks?: Array<() => void>;
}

// ==================== ComponentPublicInstance ====================

export interface ComponentPublicInstance {
  $data: Record<string, unknown>;
  $props: Record<string, unknown>;
  $el: Element | null;
  $options: ComponentOptions;
  $refs: Record<string, Element | ComponentPublicInstance | null>;
  $slots: InternalSlots;
  $emit: (event: string, ...args: unknown[]) => void;
  $forceUpdate: () => void;
  $nextTick: () => Promise<void>;
}
