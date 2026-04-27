/**
 * Lyt.js Plugin SDK — 插件注册中心
 *
 * 提供与远程插件注册中心通信的客户端：
 * - publish: 发布插件
 * - search: 搜索插件
 * - getPlugin: 获取插件详情
 * - getVersions: 获取版本列表
 * - getPopular: 获取热门插件
 * - getRecent: 获取最近更新
 * - download: 下载插件包
 * - getCategories: 获取分类列表
 *
 * 内部使用 fetch API 与注册中心通信。
 * 纯原生零依赖实现。
 */

import type {
  LytPlugin,
  LytPluginCategory,
  LytPluginResult,
} from './types';

// ============================================================
// 类型定义
// ============================================================

/** 搜索选项 */
export interface RegistrySearchOptions {
  /** 按分类筛选 */
  category?: LytPluginCategory;
  /** 页码（从 1 开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 排序方式 */
  sort?: 'popular' | 'recent' | 'name' | 'downloads';
}

/** 搜索结果 */
export interface RegistrySearchResult {
  /** 插件列表 */
  plugins: LytPlugin[];
  /** 总数 */
  total: number;
}

/** 分类信息 */
export interface CategoryInfo {
  /** 分类名称 */
  name: string;
  /** 该分类下的插件数量 */
  count: number;
}

// ============================================================
// PluginRegistry
// ============================================================

/**
 * 插件注册中心客户端
 *
 * 通过 HTTP API 与远程注册中心通信，提供插件的发布、搜索、下载等功能。
 */
export class PluginRegistry {
  /** 注册中心基础 URL */
  private registryUrl: string;

  constructor(registryUrl: string) {
    this.registryUrl = registryUrl.replace(/\/+$/, '');
  }

  // --------------------------------------------------------
  // 发布
  // --------------------------------------------------------

  /**
   * 发布插件到注册中心
   *
   * @param plugin - 插件对象
   * @param authToken - 认证令牌
   * @returns 发布结果
   */
  async publish(plugin: LytPlugin, authToken: string): Promise<LytPluginResult> {
    try {
      const response = await fetch(`${this.registryUrl}/api/plugins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(plugin),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `发布失败 (HTTP ${response.status})`,
        };
      }

      return { success: true, data };
    } catch (err: any) {
      return {
        success: false,
        error: `发布请求失败: ${err.message}`,
      };
    }
  }

  // --------------------------------------------------------
  // 搜索
  // --------------------------------------------------------

  /**
   * 搜索插件
   *
   * @param query - 搜索关键词
   * @param options - 搜索选项（分类、分页、排序）
   * @returns 搜索结果
   */
  async search(query: string, options?: RegistrySearchOptions): Promise<RegistrySearchResult> {
    try {
      const params = new URLSearchParams();
      params.set('q', query);

      if (options?.category) params.set('category', options.category);
      if (options?.page) params.set('page', String(options.page));
      if (options?.pageSize) params.set('pageSize', String(options.pageSize));
      if (options?.sort) params.set('sort', options.sort);

      const response = await fetch(
        `${this.registryUrl}/api/plugins/search?${params.toString()}`
      );

      if (!response.ok) {
        return { plugins: [], total: 0 };
      }

      const data = await response.json() as RegistrySearchResult;
      return {
        plugins: data.plugins || [],
        total: data.total || 0,
      };
    } catch {
      return { plugins: [], total: 0 };
    }
  }

  // --------------------------------------------------------
  // 获取详情
  // --------------------------------------------------------

  /**
   * 获取插件详情
   *
   * @param name - 插件名称
   * @returns 插件对象，未找到时返回 null
   */
  async getPlugin(name: string): Promise<LytPlugin | null> {
    try {
      const response = await fetch(`${this.registryUrl}/api/plugins/${encodeURIComponent(name)}`);

      if (!response.ok) {
        return null;
      }

      return await response.json() as LytPlugin;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------
  // 版本列表
  // --------------------------------------------------------

  /**
   * 获取插件版本列表
   *
   * @param name - 插件名称
   * @returns 版本号列表
   */
  async getVersions(name: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.registryUrl}/api/plugins/${encodeURIComponent(name)}/versions`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as { versions: string[] };
      return data.versions || [];
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------
  // 热门 / 最近
  // --------------------------------------------------------

  /**
   * 获取热门插件
   *
   * @returns 热门插件列表
   */
  async getPopular(): Promise<LytPlugin[]> {
    try {
      const response = await fetch(`${this.registryUrl}/api/plugins/popular`);

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as { plugins: LytPlugin[] };
      return data.plugins || [];
    } catch {
      return [];
    }
  }

  /**
   * 获取最近更新的插件
   *
   * @returns 最近更新的插件列表
   */
  async getRecent(): Promise<LytPlugin[]> {
    try {
      const response = await fetch(`${this.registryUrl}/api/plugins/recent`);

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as { plugins: LytPlugin[] };
      return data.plugins || [];
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------
  // 下载
  // --------------------------------------------------------

  /**
   * 下载插件包
   *
   * @param name - 插件名称
   * @param version - 版本号
   * @returns 插件包 Buffer
   */
  async download(name: string, version: string): Promise<Buffer> {
    try {
      const response = await fetch(
        `${this.registryUrl}/api/plugins/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}/download`
      );

      if (!response.ok) {
        throw new Error(`下载插件 "${name}@${version}" 失败 (HTTP ${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      throw new Error(`下载插件失败: ${err.message}`);
    }
  }

  // --------------------------------------------------------
  // 分类
  // --------------------------------------------------------

  /**
   * 获取分类列表
   *
   * @returns 分类信息列表
   */
  async getCategories(): Promise<CategoryInfo[]> {
    try {
      const response = await fetch(`${this.registryUrl}/api/categories`);

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as { categories: CategoryInfo[] };
      return data.categories || [];
    } catch {
      return [];
    }
  }
}
