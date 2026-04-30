// src/types.ts
// All type definitions for @lytjs/component

import type { VNode } from "@lytjs/vdom";

export interface ComponentOptions {
  name?: string;
  props?: Record<string, PropOptions>;
  emits?: string[] | Record<string, (...args: any[]) => any>;
  setup?: (props: any, ctx: SetupContext) => any;
  render?: RenderFunction;
  data?: () => Record<string, any>;
  computed?: Record<string, any>;
  watch?: Record<string, any>;
  methods?: Record<string, Function>;
  provide?: Record<string, any> | (() => Record<string, any>);
  inject?: Record<string, any>;
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
  errorCaptured?(err: Error, instance: any, info: string): boolean | void;
  inheritAttrs?: boolean;
}

export interface PropOptions {
  type?: any;
  required?: boolean;
  default?: any;
  validator?: (value: any) => boolean;
}

export interface ComponentInternalInstance {
  uid: number;
  type: ComponentOptions;
  vnode: VNode | null;
  subTree: VNode | null;
  props: Record<string, unknown>;
  slots: InternalSlots;
  ctx: ComponentPublicInstance;
  setupState: Record<string, any>;
  data: Record<string, any>;
  propsOptions: Record<string, PropOptions>;
  emitsOptions: Record<string, any> | null;
  emit: (event: string, ...args: any[]) => void;
  isMounted: boolean;
  isUnmounted: boolean;
  isDeactivated: boolean;
  lifecycle: {
    beforeMount: Set<Function>;
    mounted: Set<Function>;
    beforeUpdate: Set<Function>;
    updated: Set<Function>;
    beforeUnmount: Set<Function>;
    unmounted: Set<Function>;
  };
  provides: Record<string, any>;
  parent: ComponentInternalInstance | null;
  root: ComponentInternalInstance;
  appContext: AppContext;
  render?: RenderFunction;
  exposed?: Record<string, any> | null;
  attrs: Record<string, any>;
  errorCapturedHooks?: Array<
    (err: Error, instance: any, info: string) => boolean | void
  >;
}

export interface ComponentPublicInstance {
  $data: Record<string, any>;
  $props: any;
  $el: any;
  $options: ComponentOptions;
  $refs: Record<string, any>;
  $slots: InternalSlots;
  $emit: (event: string, ...args: any[]) => void;
  $forceUpdate: () => void;
  $nextTick: () => Promise<void>;
}

export interface SetupContext {
  attrs: Record<string, any>;
  slots: InternalSlots;
  emit: (event: string, ...args: any[]) => void;
  expose?: (exposed?: Record<string, any>) => void;
}

export interface AppContext {
  config: any;
  components: Record<string, any>;
  directives: Record<string, any>;
  mixins: ComponentOptions[];
  provides: Record<string, any>;
}

export type RenderFunction = (...args: any[]) => any;
export type SlotFunction = (props?: any) => any[];
export type InternalSlots = Record<string, SlotFunction | undefined>;
