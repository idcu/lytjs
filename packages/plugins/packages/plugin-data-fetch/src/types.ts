/**
 * @lytjs/plugin-data-fetch - 类型定义
 */

export interface RequestOptions extends RequestInit {
  /** 基础 URL */
  baseUrl?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 缓存策略 */
  cacheStrategy?: 'no-cache' | 'cache-first' | 'network-first' | 'cache-only';
  /** 缓存时间（毫秒） */
  cacheTime?: number;
  /** 请求标识，用于缓存键生成 */
  requestKey?: string;
  /** 是否取消重复请求 */
  cancelDuplicate?: boolean;
  /** 自定义错误处理 */
  onError?: (error: FetchError) => void | Promise<void>;
}

export interface FetchError extends Error {
  /** HTTP 状态码 */
  status?: number;
  /** 原始响应 */
  response?: Response;
  /** 原始错误 */
  originalError?: Error;
  /** 请求配置 */
  config?: RequestOptions;
}

export interface CacheEntry<T = unknown> {
  /** 缓存数据 */
  data: T;
  /** 过期时间 */
  expiresAt: number;
  /** 创建时间 */
  createdAt: number;
}

export interface CacheStorage {
  /** 获取缓存 */
  get<T = unknown>(key: string): CacheEntry<T> | null;
  /** 设置缓存 */
  set<T = unknown>(key: string, value: CacheEntry<T>): void;
  /** 删除缓存 */
  delete(key: string): void;
  /** 清空缓存 */
  clear(): void;
  /** 检查缓存是否存在且有效 */
  has(key: string): boolean;
}

export interface Interceptor<T = unknown> {
  /** 请求拦截器 */
  request?: (config: RequestOptions) => RequestOptions | Promise<RequestOptions>;
  /** 响应拦截器 */
  response?: (response: T) => T | Promise<T>;
  /** 错误拦截器 */
  error?: (error: FetchError) => FetchError | Promise<FetchError>;
}

export interface FetchState<T = unknown> {
  /** 请求数据 */
  data: T | null;
  /** 加载状态 */
  isLoading: boolean;
  /** 错误状态 */
  error: FetchError | null;
  /** 是否已完成 */
  isSuccess: boolean;
  /** 是否失败 */
  isError: boolean;
  /** 请求次数 */
  refetchCount: number;
}

export interface FetchInstance<T = unknown> {
  /** 当前状态 */
  state: Readonly<FetchState<T>>;
  /** 发起请求 */
  fetch(): Promise<T>;
  /** 重新请求 */
  refetch(): Promise<T>;
  /** 取消请求 */
  cancel(): void;
  /** 手动更新数据 */
  setData(data: T | ((prev: T | null) => T)): void;
  /** 手动更新错误 */
  setError(error: FetchError | null): void;
  /** 清空状态 */
  reset(): void;
}

export interface FetchPluginOptions {
  /** 基础 URL */
  baseUrl?: string;
  /** 默认超时时间 */
  timeout?: number;
  /** 默认重试次数 */
  retries?: number;
  /** 默认重试延迟 */
  retryDelay?: number;
  /** 默认缓存策略 */
  defaultCacheStrategy?: RequestOptions['cacheStrategy'];
  /** 默认缓存时间 */
  defaultCacheTime?: number;
  /** 请求拦截器 */
  requestInterceptors?: Interceptor['request'][];
  /** 响应拦截器 */
  responseInterceptors?: Interceptor['response'][];
  /** 错误拦截器 */
  errorInterceptors?: Interceptor['error'][];
  /** 自定义缓存存储 */
  cacheStorage?: CacheStorage;
}

export interface RequestInterceptor {
  (config: RequestOptions): RequestOptions | Promise<RequestOptions>;
}

export interface ResponseInterceptor {
  <T = unknown>(response: T): T | Promise<T>;
}

export interface ErrorInterceptor {
  (error: FetchError): FetchError | Promise<FetchError>;
}
