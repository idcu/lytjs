// @lytjs/core - common-integration
// 框架核心与 @lytjs/common-* 子包的集成点
//
// 此模块提供：
// 1. HTTP 客户端集成（用于 SSR 数据预取等场景）
// 2. URL/Query 工具集成（用于路由解析等场景）
// 3. 安全工具集成（用于 XSS 防护）
// 4. 缓存工具集成（用于组件缓存等场景）

// ============================================================
// 类型导入（避免运行时依赖）
// ============================================================

/**
 * HTTP 客户端类型（来自 @lytjs/common-http）
 *
 * 用途：
 * - SSR 数据预取
 * - API 请求封装
 * - 请求拦截和错误处理
 */
export interface HttpClientLike {
  get<T = unknown>(url: string, options?: unknown): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, options?: unknown): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, options?: unknown): Promise<T>;
  delete<T = unknown>(url: string, options?: unknown): Promise<T>;
  interceptors: {
    request: { use: (fn: unknown) => number };
    response: { use: (fn: unknown) => number };
  };
}

/**
 * URL 查询工具类型（来自 @lytjs/common-query）
 *
 * 用途：
 * - 路由参数解析
 * - URL 构建
 * - 查询字符串处理
 */
export interface QueryUtilsLike {
  parseQueryString(str: string): Record<string, string>;
  stringifyQueryString(obj: Record<string, unknown>): string;
  parseURL(url: string): {
    protocol: string;
    host: string;
    pathname: string;
    search: string;
    hash: string;
  };
  buildURL(base: string, params?: Record<string, unknown>): string;
}

/**
 * 安全工具类型（来自 @lytjs/common-security）
 *
 * 用途：
 * - XSS 防护
 * - HTML 转义
 * - 安全的动态内容处理
 */
export interface SecurityUtilsLike {
  escapeHtml(str: string): string;
  escapeAttr(str: string): string;
  sanitizeHtml(html: string, options?: unknown): string;
}

/**
 * 缓存工具类型（来自 @lytjs/common-cache）
 *
 * 用途：
 * - 组件实例缓存
 * - 计算结果缓存
 * - Keep-alive 实现
 */
export interface CacheUtilsLike {
  createLRUCache<K, V>(maxSize: number): {
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    size: number;
  };
}

// ============================================================
// 集成点注册
// ============================================================

/**
 * 框架核心集成点
 *
 * 允许外部模块（如路由、状态管理）注册其工具实现，
 * 使框架核心可以使用这些功能而无需直接依赖。
 */
export interface CoreIntegrations {
  http?: HttpClientLike;
  query?: QueryUtilsLike;
  security?: SecurityUtilsLike;
  cache?: CacheUtilsLike;
}

// 全局集成点存储
let _integrations: CoreIntegrations = {};

/**
 * 注册集成点
 */
export function registerIntegrations(integrations: CoreIntegrations): void {
  _integrations = { ..._integrations, ...integrations };
}

/**
 * 获取 HTTP 客户端
 */
export function getHttpClient(): HttpClientLike | undefined {
  return _integrations.http;
}

/**
 * 获取查询工具
 */
export function getQueryUtils(): QueryUtilsLike | undefined {
  return _integrations.query;
}

/**
 * 获取安全工具
 */
export function getSecurityUtils(): SecurityUtilsLike | undefined {
  return _integrations.security;
}

/**
 * 获取缓存工具
 */
export function getCacheUtils(): CacheUtilsLike | undefined {
  return _integrations.cache;
}

// ============================================================
// 便捷方法
// ============================================================

/**
 * 安全转义 HTML（如果有安全工具则使用，否则使用基础实现）
 */
export function safeEscapeHtml(str: string): string {
  const security = getSecurityUtils();
  if (security) {
    return security.escapeHtml(str);
  }
  // 基础实现
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 解析查询字符串（如果有查询工具则使用，否则使用基础实现）
 */
export function safeParseQueryString(str: string): Record<string, string> {
  const query = getQueryUtils();
  if (query) {
    return query.parseQueryString(str);
  }
  // 基础实现
  const result: Record<string, string> = {};
  if (!str) return result;
  const searchParams = new URLSearchParams(str.startsWith('?') ? str.slice(1) : str);
  for (const [key, value] of searchParams) {
    result[key] = value;
  }
  return result;
}
