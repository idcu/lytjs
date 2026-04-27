/**
 * Lyt.js Plugin SDK — 类型系统
 *
 * 定义插件系统的完整类型体系，包括：
 * - 插件清单（LytPlugin / LytPluginManifest）
 * - 插件 API（LytPluginAPI）
 * - 插件生命周期钩子（LytPluginHook）
 * - 插件权限（LytPluginPermission）
 * - 插件分类（LytPluginCategory）
 * - 插件配置（LytPluginConfig）
 * - 操作结果（LytPluginResult）
 * - 验证结果（ValidationResult）
 * - 插件安装器（PluginInstaller）
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 基础类型
// ============================================================

/** 插件分类 */
export type LytPluginCategory =
  | 'ui'
  | 'tool'
  | 'integration'
  | 'theme'
  | 'analytics'
  | 'auth'
  | 'storage'
  | 'other';

/** 插件权限 */
export type LytPluginPermission =
  | 'storage'
  | 'network'
  | 'clipboard'
  | 'notification'
  | 'theme'
  | 'router'
  | 'i18n';

/** 插件生命周期钩子 */
export type LytPluginHook =
  | 'beforeInstall'
  | 'afterInstall'
  | 'beforeUninstall'
  | 'afterUninstall'
  | 'onEnable'
  | 'onDisable'
  | 'onConfigChange';

// ============================================================
// 插件清单
// ============================================================

/** 插件基本信息（静态清单） */
export interface LytPlugin {
  /** 插件唯一名称（必须符合命名规范） */
  name: string;
  /** 插件版本号（语义化版本） */
  version: string;
  /** 插件描述 */
  description: string;
  /** 插件作者 */
  author: string;
  /** 开源协议 */
  license: string;
  /** 关键词列表 */
  keywords: string[];
  /** 入口文件路径 */
  main: string;
  /** 插件图标 URL */
  icon?: string;
  /** 插件分类 */
  category: LytPluginCategory;
  /** 插件主页 */
  homepage?: string;
  /** 代码仓库 */
  repository?: string;
  /** 对等依赖（框架版本要求等） */
  peerDependencies?: Record<string, string>;
  /** 插件安装钩子 */
  install?: (api: LytPluginAPI) => void | Promise<void>;
  /** 插件卸载钩子 */
  uninstall?: (api: LytPluginAPI) => void | Promise<void>;
  /** 生命周期钩子映射 */
  hooks?: Partial<Record<LytPluginHook, (api: LytPluginAPI, ...args: any[]) => void | Promise<void>>>;
  /** 插件配置 Schema */
  config?: LytPluginConfig;
  /** 所需权限 */
  permissions?: LytPluginPermission[];
  /** 兼容的框架版本范围 */
  lytVersion?: string;
}

/** 插件运行时清单（继承静态信息，增加运行时状态） */
export interface LytPluginManifest extends Omit<LytPlugin, 'config'> {
  /** 是否已安装 */
  installed: boolean;
  /** 是否已启用 */
  enabled: boolean;
  /** 当前配置值 */
  config?: Record<string, any>;
  /** 已授权的权限 */
  permissions?: LytPluginPermission[];
  /** 安装时间 */
  installedAt?: number;
  /** 更新时间 */
  updatedAt?: number;
}

// ============================================================
// 插件 API
// ============================================================

/** 插件可使用的应用 API */
export interface LytPluginAPI {
  /** 应用实例引用 */
  app: any;
  /** 读写插件配置 */
  config: {
    get<T = any>(key: string, defaultValue?: T): T;
    set(key: string, value: any): void;
    getAll(): Record<string, any>;
    reset(): void;
  };
  /** 持久化存储 */
  store: {
    get<T = any>(key: string, defaultValue?: T): T | Promise<T>;
    set(key: string, value: any): void | Promise<void>;
    remove(key: string): void | Promise<void>;
    clear(): void | Promise<void>;
    keys(): string[] | Promise<string[]>;
  };
  /** 路由操作 */
  router: {
    addRoute(route: any): void;
    removeRoute(name: string): void;
    push(path: string): void;
    replace(path: string): void;
    back(): void;
    currentRoute(): any;
  };
  /** 国际化 */
  i18n: {
    t(key: string, params?: Record<string, any>): string;
    setLocale(locale: string): void;
    getLocale(): string;
    addMessages(locale: string, messages: Record<string, string>): void;
  };
  /** 主题操作 */
  theme: {
    setTheme(theme: string): void;
    getTheme(): string;
    registerTheme(name: string, variables: Record<string, string>): void;
  };
  /** 日志工具 */
  logger: {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
  };
  /** 注册事件监听 */
  on(event: string, handler: (...args: any[]) => void): () => void;
  /** 移除事件监听 */
  off(event: string, handler: (...args: any[]) => void): void;
  /** 触发事件 */
  emit(event: string, data?: any): void;
}

// ============================================================
// 插件配置
// ============================================================

/** 插件配置 Schema（基于 JSON Schema 子集） */
export interface LytPluginConfig {
  /** JSON Schema 定义 */
  schema: Record<string, any>;
  /** 默认值 */
  defaults?: Record<string, any>;
  /** 必填字段列表 */
  required?: string[];
}

// ============================================================
// 操作结果
// ============================================================

/** 插件操作结果 */
export interface LytPluginResult {
  /** 操作是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 返回数据 */
  data?: any;
}

/** 验证结果 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
}

// ============================================================
// 插件安装器
// ============================================================

/**
 * 插件安装器
 *
 * 提供插件的安装、卸载、启用、禁用、验证和依赖解析功能。
 */
export class PluginInstaller {
  private plugins: Map<string, LytPluginManifest> = new Map();

  constructor(initialPlugins?: LytPluginManifest[]) {
    if (initialPlugins) {
      for (const plugin of initialPlugins) {
        this.plugins.set(plugin.name, plugin);
      }
    }
  }

  /**
   * 安装插件
   *
   * @param plugin - 插件对象
   * @param api - 插件 API
   * @returns 安装结果
   */
  async install(plugin: LytPlugin, api?: LytPluginAPI): Promise<LytPluginResult> {
    if (this.plugins.has(plugin.name)) {
      return { success: false, error: `插件 "${plugin.name}" 已安装` };
    }

    const manifest: LytPluginManifest = {
      ...plugin,
      installed: true,
      enabled: false,
      config: plugin.config?.defaults ? { ...plugin.config.defaults } : {},
      permissions: plugin.permissions ? [...plugin.permissions] : [],
      installedAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 执行安装钩子
    if (plugin.hooks?.beforeInstall) {
      try {
        await plugin.hooks.beforeInstall(api!, {});
      } catch (err: any) {
        return { success: false, error: `beforeInstall 钩子执行失败: ${err.message}` };
      }
    }

    if (plugin.install && api) {
      try {
        await plugin.install(api);
      } catch (err: any) {
        return { success: false, error: `install 执行失败: ${err.message}` };
      }
    }

    if (plugin.hooks?.afterInstall) {
      try {
        await plugin.hooks.afterInstall(api!, {});
      } catch (err: any) {
        return { success: false, error: `afterInstall 钩子执行失败: ${err.message}` };
      }
    }

    this.plugins.set(plugin.name, manifest);
    return { success: true, data: manifest };
  }

  /**
   * 卸载插件
   *
   * @param name - 插件名称
   * @param api - 插件 API
   * @returns 卸载结果
   */
  async uninstall(name: string, api?: LytPluginAPI): Promise<LytPluginResult> {
    const manifest = this.plugins.get(name);
    if (!manifest) {
      return { success: false, error: `插件 "${name}" 未安装` };
    }

    const plugin = manifest as LytPlugin;

    if (plugin.hooks?.beforeUninstall) {
      try {
        await plugin.hooks.beforeUninstall(api!, {});
      } catch (err: any) {
        return { success: false, error: `beforeUninstall 钩子执行失败: ${err.message}` };
      }
    }

    if (plugin.uninstall && api) {
      try {
        await plugin.uninstall(api);
      } catch (err: any) {
        return { success: false, error: `uninstall 执行失败: ${err.message}` };
      }
    }

    if (plugin.hooks?.afterUninstall) {
      try {
        await plugin.hooks.afterUninstall(api!, {});
      } catch (err: any) {
        return { success: false, error: `afterUninstall 钩子执行失败: ${err.message}` };
      }
    }

    this.plugins.delete(name);
    return { success: true };
  }

  /**
   * 启用插件
   *
   * @param name - 插件名称
   * @param api - 插件 API
   * @returns 启用结果
   */
  async enable(name: string, api?: LytPluginAPI): Promise<LytPluginResult> {
    const manifest = this.plugins.get(name);
    if (!manifest) {
      return { success: false, error: `插件 "${name}" 未安装` };
    }
    if (manifest.enabled) {
      return { success: false, error: `插件 "${name}" 已启用` };
    }

    const plugin = manifest as LytPlugin;
    if (plugin.hooks?.onEnable) {
      try {
        await plugin.hooks.onEnable(api!, {});
      } catch (err: any) {
        return { success: false, error: `onEnable 钩子执行失败: ${err.message}` };
      }
    }

    manifest.enabled = true;
    manifest.updatedAt = Date.now();
    return { success: true, data: manifest };
  }

  /**
   * 禁用插件
   *
   * @param name - 插件名称
   * @param api - 插件 API
   * @returns 禁用结果
   */
  async disable(name: string, api?: LytPluginAPI): Promise<LytPluginResult> {
    const manifest = this.plugins.get(name);
    if (!manifest) {
      return { success: false, error: `插件 "${name}" 未安装` };
    }
    if (!manifest.enabled) {
      return { success: false, error: `插件 "${name}" 已禁用` };
    }

    const plugin = manifest as LytPlugin;
    if (plugin.hooks?.onDisable) {
      try {
        await plugin.hooks.onDisable(api!, {});
      } catch (err: any) {
        return { success: false, error: `onDisable 钩子执行失败: ${err.message}` };
      }
    }

    manifest.enabled = false;
    manifest.updatedAt = Date.now();
    return { success: true, data: manifest };
  }

  /**
   * 验证插件
   *
   * @param plugin - 插件对象
   * @returns 验证结果
   */
  validate(plugin: LytPlugin): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!plugin.name) {
      errors.push('缺少必填字段: name');
    }
    if (!plugin.version) {
      errors.push('缺少必填字段: version');
    }
    if (!plugin.description) {
      errors.push('缺少必填字段: description');
    }
    if (!plugin.author) {
      errors.push('缺少必填字段: author');
    }
    if (!plugin.main) {
      errors.push('缺少必填字段: main');
    }
    if (!plugin.category) {
      errors.push('缺少必填字段: category');
    }

    if (plugin.name && !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?lyt-plugin-[a-z0-9-~]+$/.test(plugin.name)) {
      errors.push(`插件名称 "${plugin.name}" 不符合命名规范（应为 lyt-plugin-xxx 或 @scope/lyt-plugin-xxx）`);
    }

    if (plugin.version && !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(plugin.version)) {
      errors.push(`版本号 "${plugin.version}" 不符合语义化版本规范`);
    }

    if (!plugin.keywords || plugin.keywords.length === 0) {
      warnings.push('建议提供 keywords 以提高插件可发现性');
    }

    if (!plugin.license) {
      warnings.push('建议提供 license 字段');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 解析插件依赖
   *
   * @param plugin - 插件对象
   * @param availablePlugins - 可用插件列表
   * @returns 依赖解析结果（缺失依赖列表）
   */
  resolveDependencies(
    plugin: LytPlugin,
    availablePlugins: LytPlugin[]
  ): { missing: string[]; satisfied: string[] } {
    const missing: string[] = [];
    const satisfied: string[] = [];

    if (!plugin.peerDependencies) {
      return { missing, satisfied };
    }

    const availableNames = new Set(availablePlugins.map((p) => p.name));

    for (const dep of Object.keys(plugin.peerDependencies)) {
      if (availableNames.has(dep)) {
        satisfied.push(dep);
      } else {
        missing.push(dep);
      }
    }

    return { missing, satisfied };
  }
}
