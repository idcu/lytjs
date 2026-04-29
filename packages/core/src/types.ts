// src/types.ts
// @lytjs/core - 类型定义

import type { VNode } from '@lytjs/vdom';
import type { ComponentOptions, ComponentPublicInstance, InternalSlots } from '@lytjs/component';

// ==================== App ====================

export interface App<HostElement = Element> {
  config: AppConfig;
  use(plugin: Plugin, ...options: any[]): App;
  mount(rootContainer: HostElement | string): ComponentPublicInstance;
  unmount(): void;
  provide<T>(key: string | symbol, value: T): App;
  inject<T>(key: string | symbol): T | undefined;
  component(name: string, component: Component): App;
  directive(name: string, directive: Directive): App;
  mixin(mixin: ComponentOptions): App;
  errorHandler?: (err: any, instance: ComponentPublicInstance | null, info: string) => void;
  warnHandler?: (msg: string, instance: ComponentPublicInstance | null, trace: string) => void;
}

export interface AppConfig {
  performance: boolean;
  errorHandler?: (err: any, instance: any, info: string) => void;
  warnHandler?: (msg: string, instance: any, trace: string) => void;
  globalProperties: Record<string, any>;
  isCustomElement?: (tag: string) => boolean;
  compilerOptions?: any;
}

// ==================== Plugin ====================

export interface Plugin {
  install: (app: App, ...options: any[]) => void;
}

// ==================== Component ====================

export type Component = ComponentOptions | (() => any);

export type { ComponentOptions, ComponentPublicInstance } from '@lytjs/component';

// ==================== Directive ====================

export interface Directive<T = any> {
  created?: (el: T, binding: DirectiveBinding, vnode: VNode, prevVNode: VNode) => void;
  beforeMount?: (el: T, binding: DirectiveBinding, vnode: VNode, prevVNode: VNode) => void;
  mounted?: (el: T, binding: DirectiveBinding, vnode: VNode, prevVNode: VNode) => void;
  beforeUpdate?: (el: T, binding: DirectiveBinding, vnode: VNode, prevVNode: VNode) => void;
  updated?: (el: T, binding: DirectiveBinding, vnode: VNode, prevVNode: VNode) => void;
  beforeUnmount?: (el: T, binding: DirectiveBinding, vnode: VNode, prevVNode: VNode) => void;
  unmounted?: (el: T, binding: DirectiveBinding, vnode: VNode, prevVNode: VNode) => void;
}

export interface DirectiveBinding {
  instance: ComponentPublicInstance | null;
  value: any;
  oldValue: any;
  arg?: string;
  modifiers: Record<string, boolean>;
  dir: Directive;
}

export type DirectiveArguments = [Directive, any, string?, Record<string, boolean>?][];

// ==================== Async Component ====================

export type AsyncComponentLoader = () => Promise<Component>;

export interface AsyncComponentOptions {
  loader: AsyncComponentLoader;
  loadingComponent?: Component;
  errorComponent?: Component;
  delay?: number;
  timeout?: number;
  suspensible?: boolean;
  onError?: (error: Error, retry: () => void, fail: () => void, attempts: number) => any;
}

// ==================== Composition API ====================

export type { InternalSlots };

export type ErrorCapturedHook = (
  err: Error,
  instance: ComponentPublicInstance | null,
  info: string
) => boolean | void;

export type DebuggerHook = (event: any) => void;

// ==================== Re-export VNode ====================

export type { VNode, VNodeChildren } from '@lytjs/vdom';
