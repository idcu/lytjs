// packages/ecosystem/packages/plugin/src/types.ts
// 通用插件系统 - 类型定义（零框架依赖，宿主上下文泛型化）

import type { ConfigSchema } from '@lytjs/config';

/**
 * 插件安装函数签名
 * @template TContext 宿主上下文类型（如框架的 App 实例），默认 unknown
 * @template TOptions 插件选项类型
 */
export type PluginInstallFunction<TContext = unknown, TOptions = unknown> = (
  ctx: TContext,
  ...options: TOptions[]
) => void | Promise<void>;

/**
 * 基础插件接口
 * @description 所有插件必须实现安装函数
 * @template TContext 宿主上下文类型（默认 unknown，框架可将其绑定为具体的 App）
 * @template TOptions 插件选项类型
 */
export interface Plugin<TContext = unknown, TOptions = unknown> {
  /** 插件安装函数 */
  install: PluginInstallFunction<TContext, TOptions>;
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
 * 增强版插件接口
 * @description 包含名称、版本、元数据、生命周期钩子和依赖管理
 * @template TContext 宿主上下文类型（默认 unknown）
 * @template TOptions 插件选项类型
 */
export interface EnhancedPlugin<TContext = unknown, TOptions = unknown>
  extends Plugin<TContext, TOptions> {
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

  // === 配置系统 ===

  /** 插件选项的 Schema 定义，用于验证和文档生成 */
  configSchema?: ConfigSchema<TOptions>;

  // === 生命周期钩子 ===

  /** 安装前钩子，返回 false 可取消安装 */
  beforeInstall?: (ctx: TContext) => boolean | Promise<boolean>;
  /** 安装后钩子 */
  afterInstall?: (ctx: TContext) => void | Promise<void>;
  /** 应用挂载前钩子 */
  beforeMount?: (ctx: TContext) => void | Promise<void>;
  /** 应用挂载后钩子 */
  afterMount?: (ctx: TContext) => void | Promise<void>;
  /** 清理函数，在宿主编卸载时调用 */
  cleanup?: () => void | Promise<void>;
}

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