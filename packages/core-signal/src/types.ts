// src/types.ts
// @lytjs/core-signal - 类型定义

import type { BaseAppConfig } from '@lytjs/shared-types';
import type { ComponentOptions, ComponentPublicInstance } from '@lytjs/component';
import type {
  Directive,
  DirectiveBinding,
  DirectiveArguments,
  DebuggerEvent,
} from '@lytjs/shared-types';

// Re-export shared types
export type { Directive, DirectiveBinding, DirectiveArguments, DebuggerEvent };

// ==================== App ====================

/** 插件安装函数签名 */
export type PluginInstallFunction<T = unknown> = (app: App, ...options: T[]) => void;

export interface App<HostElement = Element> {
  config: AppConfig;
  use(plugin: Plugin | PluginInstallFunction, ...options: unknown[]): App;
  mount(rootContainer: HostElement | string): Promise<ComponentPublicInstance | null>;
  unmount(): void;
  provide<T = unknown>(key: string | symbol, value: T): App;
  inject<T = unknown>(key: string | symbol, defaultValue?: T): T;
  component(name: string, component: Component): App;
  directive(name: string, directive: Directive): App;
  mixin(mixin: ComponentOptions): App;
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

/** createApp 的配置选项（Signal 模式固定使用 signal 渲染，忽略 rendererMode） */
export interface AppOptions {
  /** Signal 模式下此选项被忽略，始终使用 Signal 渲染 */
  rendererMode?: 'signal' | 'vapor';
}

// ==================== Plugin ====================

export interface Plugin {
  install: PluginInstallFunction;
}

// ==================== Component ====================

/**
 * Signal 模式下的组件类型
 * 必须包含 template 属性，可选包含 data、setup、生命周期钩子
 */
export type Component = ComponentOptions & {
  template?: string;
};

export type { ComponentOptions, ComponentPublicInstance } from '@lytjs/component';

// ==================== Composition API ====================

export type ErrorCapturedHook = (
  err: Error,
  instance: ComponentPublicInstance | null,
  info: string,
) => boolean | void;

export type DebuggerHook = (event: DebuggerEvent) => void;
