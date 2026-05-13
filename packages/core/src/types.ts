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
import type { PluginRegistry } from './plugin-registry';
import type { PluginValidator } from './plugin-validator';

// Re-export shared types
export type { Renderer, Directive, DirectiveBinding, DirectiveArguments, DebuggerEvent };

/** 实例化的渲染器类型（绑定到具体 VNode 实现） */
export type DOMRenderer = Renderer<VNode>;

// ==================== App ====================

// PluginInstallFunction 已在下方 Plugin 区域定义

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
  /** 获取插件注册表实例（内部 API，用于高级插件管理） */
  readonly _pluginRegistry: PluginRegistry;
  /** 获取插件验证器实例（内部 API，用于自定义验证） */
  readonly _pluginValidator: PluginValidator;
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

/** 插件安装函数签名（支持泛型选项） */
export type PluginInstallFunction<T = unknown> = (
  app: App,
  ...options: T[]
) => void | Promise<void>;

/**
 * 基础插件接口
 * @description 所有 LytJS 插件必须实现此接口
 */
export interface Plugin<TOptions = unknown> {
  /** 插件安装函数 */
  install: PluginInstallFunction<TOptions>;
}

/**
 * 插件元数据信息
 * @description 描述插件的附加信息，用于文档生成和插件市场展示
 */
export interface PluginMeta {
  /** 插件描述 */
  description?: string;
  /** 插件作者 */
  author?: string;
  /** 关键词标签 */
  keywords?: string[];
  /** 插件主页 */
  homepage?: string;
  /** 许可证 */
  license?: string;
  /** 仓库地址 */
  repository?: string;
}

/**
 * 插件依赖声明
 * @description 声明插件对其他插件或框架版本的依赖关系
 */
export interface PluginDependency {
  /** 依赖的插件名称 */
  name: string;
  /** 版本范围要求（semver 格式） */
  version?: string;
  /** 是否为可选依赖 */
  optional?: boolean;
}

/**
 * 增强版插件接口（v6.0 Plugin System Enhancement）
 * @description 包含名称、版本、元数据、生命周期钩子和依赖管理
 */
export interface EnhancedPlugin<TOptions = unknown> extends Plugin<TOptions> {
  /** 插件唯一标识名称（必填） */
  name: string;
  /** 插件版本号（semver 格式） */
  version?: string;
  /** 插件元数据 */
  meta?: PluginMeta;
  /** 依赖的其他插件 */
  dependencies?: PluginDependency[];
  /** 可选依赖的插件 */
  optionalDependencies?: PluginDependency[];
  /** 冲突的插件名称列表 */
  conflicts?: string[];
  /** 对宿主框架的版本要求 */
  peerRequirements?: {
    lytjs?: string;
    node?: string;
  };

  // === 生命周期钩子 ===

  /** 安装前钩子，返回 false 可取消安装 */
  beforeInstall?: (app: App) => boolean | Promise<boolean>;
  /** 安装后钩子 */
  afterInstall?: (app: App) => void | Promise<void>;
  /** 应用挂载前钩子 */
  beforeMount?: (app: App) => void | Promise<void>;
  /** 应用挂载后钩子 */
  afterMount?: (app: App) => void | Promise<void>;
  /** 清理函数，在 app 卸载时调用 */
  cleanup?: () => void | Promise<void>;
}

/**
 * 支持 cleanup 的插件接口（向后兼容）
 * FIX: P2-40 定义 PluginWithCleanup 接口，替代类型断言链
 * @deprecated 推荐使用 EnhancedPlugin 替代
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

// ==================== Plugin Registry ====================

/** 已注册插件的信息 */
export interface RegisteredPlugin {
  /** 插件实例 */
  plugin: EnhancedPlugin;
  /** 安装时传入的选项 */
  options: unknown;
  /** 是否已安装 */
  installed: boolean;
  /** 注册时间戳 */
  registeredAt: number;
  /** 安装时间戳 */
  installedAt?: number;
}

/** 插件注册结果 */
export interface RegistrationResult {
  /** 是否成功 */
  success: boolean;
  /** 插件名称 */
  name: string;
  /** 错误信息（如果失败） */
  error?: string;
}

/** 依赖检查结果 */
export interface DependencyResult {
  /** 是否满足所有依赖 */
  satisfied: boolean;
  /** 缺少的必需依赖 */
  missing: Array<{ name: string; version?: string }>;
  /** 缺少的可选依赖 */
  missingOptional: Array<{ name: string; version?: string }>;
  /** 版本不兼容的依赖 */
  versionMismatch: Array<{ name: string; expected: string; actual?: string }>;
}

/** 插件生命周期事件类型 */
export type PluginLifecycleEvent =
  | 'before:register'
  | 'after:register'
  | 'before:install'
  | 'after:install'
  | 'before:unregister'
  | 'after:unregister'
  | 'error';

/** 插件事件监听器 */
export type PluginEventListener = (event: PluginLifecycleEvent, data: unknown) => void;

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
