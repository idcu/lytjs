// src/types.ts
// @lytjs/core - 类型定义

import type { VNode } from '@lytjs/vdom';
import type { BaseAppConfig } from '@lytjs/shared-types';
import type { ComponentOptions, ComponentPublicInstance, InternalSlots } from '@lytjs/component';
import type {
  Renderer,
  Directive,
  DirectiveBinding,
  DirectiveArguments,
  DebuggerEvent,
} from '@lytjs/shared-types';

// Re-export shared types
export type { Renderer, Directive, DirectiveBinding, DirectiveArguments, DebuggerEvent };

/** 实例化的渲染器类型（绑定到具体 VNode 实现） */
export type DOMRenderer = Renderer<VNode>;

// ==================== App ====================

/** 插件安装函数签名 */
export type PluginInstallFunction<T = unknown> = (app: App, ...options: T[]) => void;

export interface App<HostElement = Element> {
  config: AppConfig;
  use(plugin: Plugin | PluginInstallFunction, ...options: unknown[]): App;
  mount(rootContainer: HostElement | string): Promise<ComponentPublicInstance | null>;
  unmount(): void;
  provide<T = unknown>(key: string | symbol, value: T): App;
  inject<T = unknown>(key: string | symbol): T | undefined;
  component(name: string, component: Component): App;
  directive(name: string, directive: Directive): App;
  mixin(mixin: ComponentOptions): App;
  /** 注册全局事件监听器，将在卸载时自动清理。 */
  on(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): App;
  /** 移除之前注册的全局事件监听器。 */
  off(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): App;
  errorHandler?: (err: unknown, instance: ComponentPublicInstance | null, info: string) => void;
  warnHandler?: (msg: string, instance: ComponentPublicInstance | null, trace: string) => void;
}

export interface AppConfig extends BaseAppConfig {
  performance: boolean;
  globalProperties: Record<string, unknown>;
  isCustomElement?: (tag: string) => boolean;
  compilerOptions?: Record<string, unknown>;
}

// ==================== App Options ====================

/** createApp 的配置选项 */
export interface AppOptions {
  /** 渲染模式：'vnode' 使用 VNode diff（默认），'signal' 使用 Signal + 直接 DOM 操作，'vapor' 是 'signal' 的别名 */
  rendererMode?: 'vnode' | 'signal' | 'vapor';
}

// ==================== Plugin ====================

export interface Plugin {
  install: PluginInstallFunction;
}

/**
 * 支持 cleanup 的插件接口
 * FIX: P2-40 定义 PluginWithCleanup 接口，替代类型断言链
 */
export interface PluginWithCleanup extends Plugin {
  /** 插件清理函数，在 app 卸载时调用 */
  cleanup?: () => void;
  /** 插件名称，用于错误报告 */
  name?: string;
}

/** 插件函数类型（支持 cleanup） */
export type PluginFunctionWithCleanup = PluginInstallFunction & {
  cleanup?: () => void;
  name?: string;
};

// ==================== Component ====================

export type Component = ComponentOptions | (() => VNode);

export type { ComponentOptions, ComponentPublicInstance } from '@lytjs/component';

// ==================== Async Component ====================

export type AsyncComponentLoader = () => Promise<Component>;

export interface AsyncComponentOptions {
  loader: AsyncComponentLoader;
  loadingComponent?: Component;
  errorComponent?: Component;
  delay?: number;
  timeout?: number;
  suspensible?: boolean;
  onError?: (error: Error, retry: () => void, fail: () => void, attempts: number) => void;
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

export type { VNode, VNodeChildren } from '@lytjs/vdom';
