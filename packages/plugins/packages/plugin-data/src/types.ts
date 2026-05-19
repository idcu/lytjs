/**
 * @lytjs/plugin-data - 类型定义
 */

import type {
  RequestOptions as BaseRequestOptions,
  FetchError,
  FetchState,
  FetchInstance,
  FetchPluginOptions,
  CacheStorage,
  CacheEntry,
} from '@lytjs/plugin-data-fetch';

export interface RequestOptions extends BaseRequestOptions {
  /** 是否启用请求去重 */
  dedupe?: boolean;
  /** 乐观更新数据 */
  optimisticData?: unknown;
  /** 预取相关配置 */
  prefetch?: boolean;
}

export type { FetchError, FetchState, FetchInstance, CacheStorage, CacheEntry };

export interface DataPluginOptions extends FetchPluginOptions {
  /** 默认去重设置 */
  defaultDedupe?: boolean;
  /** 离线模式 */
  offlineMode?: boolean;
  /** 与 store 的集成配置 */
  storeIntegration?: {
    /** 数据同步时的钩子 */
    onSync?: (key: string, data: unknown) => void;
    /** 数据更新时的钩子 */
    onUpdate?: (key: string, data: unknown) => void;
  };
}

export interface DataManager {
  /** 创建数据实例 */
  createData<T = unknown>(url: string, options?: RequestOptions): DataInstance<T>;

  /** 执行简单 GET 请求 */
  get<T = unknown>(url: string, options?: RequestOptions): Promise<T>;

  /** 执行简单 POST 请求 */
  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T>;

  /** 执行简单 PUT 请求 */
  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T>;

  /** 执行简单 DELETE 请求 */
  delete<T = unknown>(url: string, options?: RequestOptions): Promise<T>;

  /** 添加请求拦截器 */
  addRequestInterceptor(
    interceptor: (config: RequestOptions) => RequestOptions | Promise<RequestOptions>,
  ): void;

  /** 添加响应拦截器 */
  addResponseInterceptor(interceptor: <T = unknown>(response: T) => T | Promise<T>): void;

  /** 添加错误拦截器 */
  addErrorInterceptor(interceptor: (error: FetchError) => FetchError | Promise<FetchError>): void;

  /** 获取缓存存储 */
  getCacheStorage(): CacheStorage;

  /** 清空缓存 */
  clearCache(): void;

  /** 清除特定缓存 */
  invalidateCache(key: string): void;

  /** 预取数据 */
  prefetch<T = unknown>(url: string, options?: RequestOptions): Promise<T>;

  /** 获取当前的请求队列 */
  getPendingRequests(): Set<string>;

  /** 取消所有请求 */
  cancelAllRequests(): void;
}

export interface DataInstance<T = unknown> extends FetchInstance<T> {
  /** 乐观更新数据 */
  optimisticUpdate(data: T): void;

  /** 回滚乐观更新 */
  rollbackOptimistic(): void;

  /** 获取预取状态 */
  isPrefetching: boolean;
}

export interface DedupeEntry {
  promise: Promise<unknown>;
  timestamp: number;
}
