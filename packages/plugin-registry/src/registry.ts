/**
 * Lyt.js Plugin Registry — 插件元数据与注册表
 *
 * 提供本地插件注册表，支持：
 * - 插件元数据注册与注销
 * - 按名称、分类、作者搜索
 * - 分类统计
 * - 内置官方插件清单
 *
 * 纯原生零依赖实现。
 */

import type { LytPluginCategory } from '@lytjs/plugin-sdk';

// ============================================================
// 插件元数据格式
// ============================================================

/** 插件注册表元数据（可扩展格式） */
export interface PluginManifest {
  /** 插件唯一名称 */
  name: string;
  /** 插件版本号（语义化版本） */
  version: string;
  /** 插件描述 */
  description: string;
  /** 插件作者 */
  author: string;
  /** 关键词列表 */
  keywords: string[];
  /** 开源协议 */
  license: string;
  /** 入口文件路径 */
  main: string;
  /** 兼容的 Lyt.js 版本范围 */
  lytjsVersion: string;
  /** 插件分类 */
  category: string;
  /** 插件图标 URL */
  icon?: string;
  /** 插件主页 */
  homepage?: string;
  /** 代码仓库 */
  repository?: string;
  /** 下载量（可选统计） */
  downloads?: number;
  /** 是否为官方插件 */
  official?: boolean;
  /** 最后更新时间 */
  updatedAt?: number;
  /** 创建时间 */
  createdAt?: number;
  /** 扩展字段（可扩展） */
  [key: string]: unknown;
}

// ============================================================
// PluginRegistry 类
// ============================================================

/**
 * 插件注册表
 *
 * 本地内存注册表，管理插件的元数据信息。
 * 支持注册、注销、搜索、分类过滤等功能。
 */
export class PluginRegistry {
  /** 插件清单存储 */
  private plugins: Map<string, PluginManifest> = new Map();

  constructor(initialPlugins?: PluginManifest[]) {
    if (initialPlugins) {
      for (const plugin of initialPlugins) {
        this.plugins.set(plugin.name, plugin);
      }
    }
  }

  // --------------------------------------------------------
  // 注册 / 注销
  // --------------------------------------------------------

  /**
   * 注册插件到注册表
   *
   * @param manifest - 插件元数据
   * @throws 如果插件名称已存在
   */
  register(manifest: PluginManifest): void {
    if (this.plugins.has(manifest.name)) {
      throw new Error(`插件 "${manifest.name}" 已在注册表中存在`);
    }

    const now = Date.now();
    this.plugins.set(manifest.name, {
      ...manifest,
      createdAt: manifest.createdAt || now,
      updatedAt: now,
    });
  }

  /**
   * 从注册表注销插件
   *
   * @param name - 插件名称
   * @returns 是否成功注销
   */
  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  // --------------------------------------------------------
  // 查询
  // --------------------------------------------------------

  /**
   * 搜索插件
   *
   * 按名称、描述、关键词、作者进行模糊匹配。
   *
   * @param query - 搜索关键词
   * @returns 匹配的插件元数据列表
   */
  search(query: string): PluginManifest[] {
    const lowerQuery = query.toLowerCase();
    return [...this.plugins.values()].filter((plugin) => {
      return (
        plugin.name.toLowerCase().includes(lowerQuery) ||
        plugin.description.toLowerCase().includes(lowerQuery) ||
        plugin.author.toLowerCase().includes(lowerQuery) ||
        plugin.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * 获取指定插件
   *
   * @param name - 插件名称
   * @returns 插件元数据，未找到时返回 undefined
   */
  get(name: string): PluginManifest | undefined {
    return this.plugins.get(name);
  }

  /**
   * 获取所有插件列表
   *
   * @param category - 可选分类过滤
   * @returns 插件元数据列表
   */
  list(category?: string): PluginManifest[] {
    const all = [...this.plugins.values()];
    if (!category) return all;
    return all.filter((p) => p.category === category);
  }

  /**
   * 按作者获取插件列表
   *
   * @param author - 作者名称
   * @returns 匹配作者的插件元数据列表
   */
  listByAuthor(author: string): PluginManifest[] {
    const lowerAuthor = author.toLowerCase();
    return [...this.plugins.values()].filter(
      (p) => p.author.toLowerCase() === lowerAuthor
    );
  }

  // --------------------------------------------------------
  // 统计
  // --------------------------------------------------------

  /**
   * 获取所有分类及其插件数量
   *
   * @returns 分类统计信息
   */
  getCategories(): Array<{ name: string; count: number }> {
    const categoryMap = new Map<string, number>();
    for (const plugin of this.plugins.values()) {
      const count = categoryMap.get(plugin.category) || 0;
      categoryMap.set(plugin.category, count + 1);
    }
    return [...categoryMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 获取注册表中的插件总数
   *
   * @returns 插件总数
   */
  get size(): number {
    return this.plugins.size;
  }

  /**
   * 检查插件是否已注册
   *
   * @param name - 插件名称
   * @returns 是否已注册
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * 获取所有插件名称
   *
   * @returns 插件名称列表
   */
  getNames(): string[] {
    return [...this.plugins.keys()];
  }
}
