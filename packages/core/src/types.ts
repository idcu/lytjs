// src/types.ts
// @lytjs/core - 类型定义

import type { VNode } from "@lytjs/vdom";
import type { BaseAppConfig } from "@lytjs/shared-types";
import type {
  ComponentOptions,
  ComponentPublicInstance,
  InternalSlots,
} from "@lytjs/component";
import type {
  Renderer,
  Directive,
  DirectiveBinding,
  DirectiveArguments,
  DebuggerEvent,
} from "@lytjs/shared-types";

// Re-export shared types
export type {
  Renderer,
  Directive,
  DirectiveBinding,
  DirectiveArguments,
  DebuggerEvent,
};

/** 实例化的渲染器类型（绑定到具体 VNode 实现） */
export type DOMRenderer = Renderer<VNode>;

// ==================== App ====================

/** 插件安装函数签名 */
export type PluginInstallFunction<T = unknown> = (
  app: App,
  ...options: T[]
) => void;

export interface App<HostElement = Element> {
  config: AppConfig;
  use(plugin: Plugin | PluginInstallFunction, ...options: unknown[]): App;
  mount(rootContainer: HostElement | string): ComponentPublicInstance;
  unmount(): void;
  provide<T = unknown>(key: string | symbol, value: T): App;
  inject<T = unknown>(key: string | symbol): T | undefined;
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

export interface AppConfig extends BaseAppConfig {
  performance: boolean;
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

// ==================== Re-export VNode ====================

export type { VNode, VNodeChildren } from "@lytjs/vdom";
