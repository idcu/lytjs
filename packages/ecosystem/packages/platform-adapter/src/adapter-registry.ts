/**
 * 平台适配器注册表
 *
 * @description
 * 管理所有已注册的平台适配器和插件，提供统一的注册、查询和插件管理能力。
 * 采用单例模式，全局共享同一个注册表实例。
 */

import { isString } from '@lytjs/common-is';
import type { PlatformAdapter, PlatformPlugin } from './types';

/**
 * 适配器注册表类
 *
 * @description
 * 维护平台适配器的注册信息，支持适配器的注册、注销、查询，
 * 以及平台级插件的管理。
 */
class AdapterRegistry {
  /** 已注册的适配器映射（平台名称 -> 适配器实例） */
  private adapters = new Map<string, PlatformAdapter>();
  /** 平台插件映射（平台名称 -> 插件数组） */
  private plugins = new Map<string, PlatformPlugin[]>();

  /**
   * 注册平台适配器
   *
   * @description
   * 将适配器实例注册到注册表中，以适配器的 name 为键。
   * 如果同名适配器已存在，将被覆盖。
   *
   * @param adapter - 平台适配器实例
   * @throws {Error} 当 adapter.name 为空时抛出错误
   */
  register(adapter: PlatformAdapter): void {
    if (!isString(adapter.name) || adapter.name.length === 0) {
      throw new Error(
        '[platform-adapter] 适配器名称不能为空',
      );
    }
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * 注销平台适配器
   *
   * @description
   * 从注册表中移除指定名称的适配器，同时清除该平台关联的所有插件。
   *
   * @param name - 平台名称
   * @returns 是否成功注销（名称不存在时返回 false）
   */
  unregister(name: string): boolean {
    const removed = this.adapters.delete(name);
    if (removed) {
      this.plugins.delete(name);
    }
    return removed;
  }

  /**
   * 获取指定名称的平台适配器
   *
   * @param name - 平台名称
   * @returns 适配器实例，未找到时返回 undefined
   */
  get(name: string): PlatformAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * 检查指定名称的适配器是否已注册
   *
   * @param name - 平台名称
   * @returns 是否已注册
   */
  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * 获取所有已注册的适配器名称
   *
   * @returns 平台名称数组
   */
  getNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 为指定平台添加插件
   *
   * @description
   * 将插件添加到目标平台的插件列表中。
   * 如果目标平台不存在，会自动创建空的插件列表。
   *
   * @param platformName - 目标平台名称
   * @param plugin - 平台插件实例
   */
  addPlugin(platformName: string, plugin: PlatformPlugin): void {
    const existing = this.plugins.get(platformName);
    if (existing) {
      existing.push(plugin);
    } else {
      this.plugins.set(platformName, [plugin]);
    }
  }

  /**
   * 从指定平台移除插件
   *
   * @param platformName - 目标平台名称
   * @param pluginName - 要移除的插件名称
   * @returns 是否成功移除（插件不存在时返回 false）
   */
  removePlugin(platformName: string, pluginName: string): boolean {
    const list = this.plugins.get(platformName);
    if (!list) return false;

    const index = list.findIndex((p) => p.name === pluginName);
    if (index === -1) return false;

    list.splice(index, 1);
    return true;
  }

  /**
   * 获取指定平台的所有插件
   *
   * @param platformName - 目标平台名称
   * @returns 插件数组，平台无插件时返回空数组
   */
  getPlugins(platformName: string): PlatformPlugin[] {
    return this.plugins.get(platformName) ?? [];
  }
}

/** 全局适配器注册表单例 */
export const adapterRegistry = new AdapterRegistry();
