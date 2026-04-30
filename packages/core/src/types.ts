// src/types.ts
// @lytjs/core - 类型定义

import type { VNode } from "@lytjs/vdom";
import type {
  ComponentOptions,
  ComponentPublicInstance,
  InternalSlots,
} from "@lytjs/component";

// ==================== App ====================

/** 渲染器接口（跨包抽象） */
export interface Renderer {
  mount(vnode: VNode | null, container: Element): void;
  unmount(vnode: VNode | null): void;
  patch(oldVNode: VNode | null, newVNode: VNode | null, container: Element): void;
  move(vnode: VNode, container: Element, anchor: Element | null): void;
}

/** 插件安装函数签名 */
export type PluginInstallFunction<T = any> = (
  app: App,
  ...options: T[]
) => void;

export interface App<HostElement = Element> {
  config: AppConfig;
  use(plugin: Plugin | PluginInstallFunction, ...options: any[]): App;
  mount(rootContainer: HostElement | string): ComponentPublicInstance;
  unmount(): void;
  provide<T = any>(key: string | symbol, value: T): App;
  inject<T = any>(key: string | symbol): T | undefined;
  component(name: string, component: Component): App;
  directive(name: string, directive: Directive): App;
  mixin(mixin: ComponentOptions): App;
  errorHandler?: (
    err: unknown,
    instance: ComponentPublicInstance | null,
    info: string,
  ) => void;
  warnHandler?: (
    msg: string,
    instance: ComponentPublicInstance | null,
    trace: string,
  ) => void;
}

export interface AppConfig {
  performance: boolean;
  errorHandler?: (err: unknown, instance: ComponentPublicInstance | null, info: string) => void;
  warnHandler?: (msg: string, instance: ComponentPublicInstance | null, trace: string) => void;
  globalProperties: Record<string, unknown>;
  isCustomElement?: (tag: string) => boolean;
  compilerOptions?: Record<string, unknown>;
}

// ==================== Plugin ====================

export interface Plugin {
  install: PluginInstallFunction;
}

// ==================== Component ====================

export type Component = ComponentOptions | (() => VNode);

export type {
  ComponentOptions,
  ComponentPublicInstance,
} from "@lytjs/component";

// ==================== Directive ====================

export interface Directive<T = Element> {
  created?: (
    el: T,
    binding: DirectiveBinding,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  beforeMount?: (
    el: T,
    binding: DirectiveBinding,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  mounted?: (
    el: T,
    binding: DirectiveBinding,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  beforeUpdate?: (
    el: T,
    binding: DirectiveBinding,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  updated?: (
    el: T,
    binding: DirectiveBinding,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  beforeUnmount?: (
    el: T,
    binding: DirectiveBinding,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
  unmounted?: (
    el: T,
    binding: DirectiveBinding,
    vnode: VNode,
    prevVNode: VNode | null,
  ) => void;
}

export interface DirectiveBinding {
  instance: ComponentPublicInstance | null;
  value: unknown;
  oldValue: unknown;
  arg?: string;
  modifiers: Record<string, boolean>;
  dir: Directive;
}

export type DirectiveArguments = [
  Directive,
  unknown,
  string?,
  Record<string, boolean>?,
][];

// ==================== Async Component ====================

export type AsyncComponentLoader = () => Promise<Component>;

export interface AsyncComponentOptions {
  loader: AsyncComponentLoader;
  loadingComponent?: Component;
  errorComponent?: Component;
  delay?: number;
  timeout?: number;
  suspensible?: boolean;
  onError?: (
    error: Error,
    retry: () => void,
    fail: () => void,
    attempts: number,
  ) => void;
}

// ==================== Composition API ====================

export type { InternalSlots };

export type ErrorCapturedHook = (
  err: Error,
  instance: ComponentPublicInstance | null,
  info: string,
) => boolean | void;

export type DebuggerHook = (event: DebuggerEvent) => void;

export interface DebuggerEvent {
  effect: { id: number; active: boolean };
  target: object;
  type: "track" | "trigger";
  key: string | symbol | undefined;
}

// ==================== Re-export VNode ====================

export type { VNode, VNodeChildren } from "@lytjs/vdom";
