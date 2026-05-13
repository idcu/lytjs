// src/plugin-registry.ts
// @lytjs/core - 插件注册表实现

import { error } from '@lytjs/common-error';
import type {
  EnhancedPlugin,
  Plugin,
  RegisteredPlugin,
  RegistrationResult,
  DependencyResult,
  PluginLifecycleEvent,
  PluginEventListener,
} from './types';

/**
 * 插件注册表
 * @description 管理插件的注册、注销、查询和依赖关系
 *
 * @example
 * ```typescript
 * const registry = new PluginRegistry();
 *
 * // 注册插件
 * registry.register(myPlugin, { theme: 'dark' });
 *
 * // 查询插件
 * const plugin = registry.get('my-plugin');
 *
 * // 检查依赖
 * const result = registry.checkDependencies(anotherPlugin);
 *
 * // 监听事件
 * registry.on('after:install', (event, data) => {
 *   console.log(`Plugin ${data.name} installed`);
 * });
 * ```
 */
export class PluginRegistry {
  /** 已注册插件映射（name → RegisteredPlugin） */
  private plugins = new Map<string, RegisteredPlugin>();

  /** 事件监听器映射 */
  private listeners = new Map<PluginLifecycleEvent, Set<PluginEventListener>>();

  constructor() {}

  /**
   * 注册插件
   * @param plugin - 插件实例（EnhancedPlugin 或基础 Plugin）
   * @param options - 安装选项
   * @returns 注册结果
   */
  register(plugin: EnhancedPlugin | Plugin, options: unknown = undefined): RegistrationResult {
    // 获取插件名称
    const name = this.getPluginName(plugin);

    if (!name) {
      const result: RegistrationResult = {
        success: false,
        name: 'anonymous',
        error: 'Plugin must have a name property. Use EnhancedPlugin interface for full support.',
      };
      this.emit('error', result);
      return result;
    }

    // 检查是否已注册
    if (this.plugins.has(name)) {
      const result: RegistrationResult = {
        success: false,
        name,
        error: `Plugin "${name}" is already registered.`,
      };
      this.emit('error', result);
      return result;
    }

    // 如果是 EnhancedPlugin，检查冲突
    if (this.isEnhancedPlugin(plugin)) {
      const conflict = this.checkConflicts(plugin);
      if (conflict) {
        const result: RegistrationResult = {
          success: false,
          name,
          error: `Plugin "${name}" conflicts with: ${conflict.join(', ')}`,
        };
        this.emit('error', result);
        return result;
      }
    }

    // 触发 before:register 事件
    this.emit('before:register', { name, plugin });

    // 注册插件
    const registered: RegisteredPlugin = {
      plugin: this.normalizePlugin(plugin),
      options,
      installed: false,
      registeredAt: Date.now(),
    };

    this.plugins.set(name, registered);

    // 触发 after:register 事件
    this.emit('after:register', { name, plugin });

    return { success: true, name };
  }

  /**
   * 注销插件
   * @param name - 插件名称
   * @returns 是否成功注销
   */
  unregister(name: string): boolean {
    const registered = this.plugins.get(name);
    if (!registered) {
      return false;
    }

    // 触发 before:unregister 事件
    this.emit('before:unregister', { name, plugin: registered.plugin });

    // 如果已安装，先调用 cleanup
    if (registered.installed && registered.plugin.cleanup) {
      try {
        const cleanupResult = registered.plugin.cleanup();
        // 处理异步 cleanup
        if (cleanupResult instanceof Promise) {
          cleanupResult.catch((err) => {
            error(
              `Plugin "${name}" async cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
        }
      } catch (err) {
        error(
          `Plugin "${name}" cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.plugins.delete(name);

    // 触发 after:unregister 事件
    this.emit('after:unregister', { name });

    return true;
  }

  /**
   * 获取已注册插件信息
   * @param name - 插件名称
   * @returns 插件注册信息，如果未找到则返回 undefined
   */
  get(name: string): RegisteredPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * 获取已注册的插件实例
   * @param name - 插件名称
   * @returns 插件实例，如果未找到则返回 undefined
   */
  getPlugin(name: string): EnhancedPlugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  /**
   * 检查插件是否已注册
   * @param name - 插件名称
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * 获取所有已注册插件名称
   */
  getNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * 获取所有已注册插件信息
   */
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取已安装插件列表
   */
  getInstalled(): RegisteredPlugin[] {
    return this.getAll().filter((p) => p.installed);
  }

  /**
   * 标记插件为已安装
   * @param name - 插件名称
   */
  markInstalled(name: string): void {
    const registered = this.plugins.get(name);
    if (registered) {
      registered.installed = true;
      registered.installedAt = Date.now();
    }
  }

  /**
   * 标记插件为未安装
   * @param name - 插件名称
   */
  markUninstalled(name: string): void {
    const registered = this.plugins.get(name);
    if (registered) {
      registered.installed = false;
      registered.installedAt = undefined;
    }
  }

  /**
   * 检查插件依赖是否满足
   * @param plugin - 要检查的插件
   * @returns 依赖检查结果
   */
  checkDependencies(plugin: EnhancedPlugin | Plugin): DependencyResult {
    const result: DependencyResult = {
      satisfied: true,
      missing: [],
      missingOptional: [],
      versionMismatch: [],
    };

    if (!this.isEnhancedPlugin(plugin)) {
      return result;
    }

    // 检查必需依赖
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        const registered = this.plugins.get(dep.name);
        if (!registered) {
          result.satisfied = false;
          result.missing.push({ name: dep.name, version: dep.version });
        } else if (dep.version && registered.plugin.version) {
          // 简单版本比较（支持前缀 ^, ~, >=, >, <, <=, =）
          if (!this.satisfiesVersion(registered.plugin.version, dep.version)) {
            result.satisfied = false;
            result.versionMismatch.push({
              name: dep.name,
              expected: dep.version,
              actual: registered.plugin.version,
            });
          }
        }
      }
    }

    // 检查可选依赖
    if (plugin.optionalDependencies) {
      for (const dep of plugin.optionalDependencies) {
        const registered = this.plugins.get(dep.name);
        if (!registered) {
          result.missingOptional.push({ name: dep.name, version: dep.version });
        } else if (dep.version && registered.plugin.version) {
          if (!this.satisfiesVersion(registered.plugin.version, dep.version)) {
            result.versionMismatch.push({
              name: dep.name,
              expected: dep.version,
              actual: registered.plugin.version,
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * 解析插件加载顺序（拓扑排序）
   * @description 根据依赖关系计算正确的安装顺序
   * @returns 排序后的插件列表
   * @throws 如果存在循环依赖则抛出错误
   */
  resolveLoadOrder(): EnhancedPlugin[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: EnhancedPlugin[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving plugin "${name}"`);
      }

      visiting.add(name);

      const registered = this.plugins.get(name);
      if (registered && this.isEnhancedPlugin(registered.plugin)) {
        // 先访问依赖
        if (registered.plugin.dependencies) {
          for (const dep of registered.plugin.dependencies) {
            if (this.plugins.has(dep.name)) {
              visit(dep.name);
            }
          }
        }
      }

      visiting.delete(name);
      visited.add(name);

      if (registered) {
        result.push(registered.plugin);
      }
    };

    // 按注册顺序遍历
    for (const name of this.plugins.keys()) {
      visit(name);
    }

    return result;
  }

  /**
   * 获取插件数量
   */
  get size(): number {
    return this.plugins.size;
  }

  /**
   * 清空所有已注册插件
   */
  clear(): void {
    // 先调用所有已安装插件的 cleanup
    for (const [name, registered] of this.plugins) {
      if (registered.installed && registered.plugin.cleanup) {
        try {
          registered.plugin.cleanup();
        } catch (err) {
          error(
            `Plugin "${name}" cleanup failed during clear: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
    this.plugins.clear();
  }

  // ==================== 事件系统 ====================

  /**
   * 注册事件监听器
   * @param event - 事件类型
   * @param handler - 事件处理函数
   * @returns 取消监听的函数
   */
  on(event: PluginLifecycleEvent, handler: PluginEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // 返回取消监听函数
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * 触发事件
   * @param event - 事件类型
   * @param data - 事件数据
   */
  emit(event: PluginLifecycleEvent, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event, data);
        } catch (err) {
          error(
            `Plugin event handler error for "${event}": ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  /**
   * 移除事件监听器
   * @param event - 事件类型
   * @param handler - 事件处理函数
   */
  off(event: PluginLifecycleEvent, handler: PluginEventListener): void {
    this.listeners.get(event)?.delete(handler);
  }

  // ==================== 内部工具方法 ====================

  /**
   * 获取插件名称
   */
  private getPluginName(plugin: EnhancedPlugin | Plugin): string | undefined {
    if (this.isEnhancedPlugin(plugin)) {
      return plugin.name;
    }
    // 基础 Plugin 尝试从 name 属性获取
    return (plugin as unknown as Record<string, unknown>).name as string | undefined;
  }

  /**
   * 检查是否为 EnhancedPlugin
   */
  private isEnhancedPlugin(plugin: EnhancedPlugin | Plugin): plugin is EnhancedPlugin {
    return 'name' in plugin && typeof (plugin as EnhancedPlugin).name === 'string';
  }

  /**
   * 将基础 Plugin 标准化为 EnhancedPlugin
   */
  private normalizePlugin(plugin: EnhancedPlugin | Plugin): EnhancedPlugin {
    if (this.isEnhancedPlugin(plugin)) {
      return plugin;
    }
    // 为基础 Plugin 生成匿名名称
    const anonymousName = `anonymous-plugin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      install: plugin.install,
      name: anonymousName,
    };
  }

  /**
   * 检查插件冲突
   */
  private checkConflicts(plugin: EnhancedPlugin): string[] | null {
    if (!plugin.conflicts || plugin.conflicts.length === 0) {
      return null;
    }

    const conflicts: string[] = [];
    for (const conflictName of plugin.conflicts) {
      if (this.plugins.has(conflictName)) {
        conflicts.push(conflictName);
      }
    }

    return conflicts.length > 0 ? conflicts : null;
  }

  /**
   * 简单的 semver 版本比较
   * @description 支持 ^, ~, >=, >, <, <=, = 前缀
   */
  private satisfiesVersion(actual: string, expected: string): boolean {
    const actualVersion = this.parseVersion(actual);
    if (!actualVersion) return false;

    // 解析期望版本范围
    const range = expected.trim();
    let prefix = '';
    let expectedVersion = range;

    if (
      range.startsWith('^') ||
      range.startsWith('~') ||
      range.startsWith('>') ||
      range.startsWith('<') ||
      range.startsWith('=')
    ) {
      const firstChar = range[0] as string;
      prefix = firstChar;
      expectedVersion = range.slice(1).trim();
      // 处理 >= 和 <=
      if (range.startsWith('>=') || range.startsWith('<=')) {
        prefix = range.slice(0, 2);
        expectedVersion = range.slice(2).trim();
      }
    }

    const expectedParsed = this.parseVersion(expectedVersion);
    if (!expectedParsed) return false;

    switch (prefix) {
      case '':
      case '=':
        // 精确匹配
        return (
          actualVersion.major === expectedParsed.major &&
          actualVersion.minor === expectedParsed.minor &&
          actualVersion.patch === expectedParsed.patch
        );

      case '^':
        // 兼容主版本（^1.2.3 允许 >=1.2.3 <2.0.0）
        return (
          actualVersion.major === expectedParsed.major &&
          (actualVersion.minor > expectedParsed.minor ||
            (actualVersion.minor === expectedParsed.minor &&
              actualVersion.patch >= expectedParsed.patch))
        );

      case '~':
        // 兼容次版本（~1.2.3 允许 >=1.2.3 <1.3.0）
        return (
          actualVersion.major === expectedParsed.major &&
          actualVersion.minor === expectedParsed.minor &&
          actualVersion.patch >= expectedParsed.patch
        );

      case '>':
        return this.compareVersions(actualVersion, expectedParsed) > 0;

      case '>=':
        return this.compareVersions(actualVersion, expectedParsed) >= 0;

      case '<':
        return this.compareVersions(actualVersion, expectedParsed) < 0;

      case '<=':
        return this.compareVersions(actualVersion, expectedParsed) <= 0;

      default:
        return false;
    }
  }

  /**
   * 解析版本号字符串
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
      major: parseInt(match[1]!, 10),
      minor: parseInt(match[2]!, 10),
      patch: parseInt(match[3]!, 10),
    };
  }

  /**
   * 比较两个版本号
   * @returns 正数表示 a > b，负数表示 a < b，0 表示相等
   */
  private compareVersions(
    a: { major: number; minor: number; patch: number },
    b: { major: number; minor: number; patch: number },
  ): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }
}
