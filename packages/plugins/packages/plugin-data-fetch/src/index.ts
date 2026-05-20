/**
 * @lytjs/plugin-data-fetch
 *
 * LytJS official data fetch plugin with caching, retries, and interceptors
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import { signal, signalComputed as computed } from '@lytjs/reactivity';
import type { ComputedSignal } from '@lytjs/reactivity';
import type {
  RequestOptions,
  FetchError,
  CacheEntry,
  CacheStorage,
  Interceptor,
  FetchState,
  FetchInstance,
  FetchPluginOptions,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from './types';

/**
 * 默认内存缓存实现
 */
class DefaultCacheStorage implements CacheStorage {
  private cache = new Map<string, CacheEntry>();

  get<T = unknown>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  set<T = unknown>(key: string, value: CacheEntry<T>): void {
    this.cache.set(key, value);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

/**
 * 生成缓存键
 */
function generateCacheKey(url: string, options: RequestOptions = {}): string {
  const { method = 'GET', headers, body, requestKey } = options;

  if (requestKey) {
    return requestKey;
  }

  let headerString = '';
  if (headers) {
    const headerEntries = Array.isArray(headers)
      ? headers
      : headers instanceof Headers
        ? Array.from(headers.entries())
        : Object.entries(headers);
    headerString = JSON.stringify(headerEntries.sort());
  }

  let bodyString = '';
  if (body) {
    bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return `${method}:${url}:${headerString}:${bodyString}`;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建 Fetch 错误
 */
function createFetchError(
  message: string,
  config?: RequestOptions,
  response?: Response,
  originalError?: Error,
): FetchError {
  const error = new Error(message) as FetchError;
  error.config = config;
  error.response = response;
  error.originalError = originalError;
  if (response) {
    error.status = response.status;
  }
  return error;
}

/**
 * 创建数据获取实例
 */
export function createFetch<T = unknown>(
  url: string,
  options: RequestOptions = {},
  globalOptions: FetchPluginOptions = {},
): FetchInstance<T> {
  const dataSignal = signal<T | null>(null);
  const isLoadingSignal = signal(false);
  const errorSignal = signal<FetchError | null>(null);
  const refetchCountSignal = signal(0);
  let abortController: AbortController | null = null;

  const state: ComputedSignal<FetchState<T>> = computed<FetchState<T>>(() => ({
    data: dataSignal(),
    isLoading: isLoadingSignal(),
    error: errorSignal(),
    isSuccess: !isLoadingSignal() && dataSignal() !== null && errorSignal() === null,
    isError: !isLoadingSignal() && errorSignal() !== null,
    refetchCount: refetchCountSignal(),
  }));

  const {
    baseUrl = globalOptions.baseUrl || '',
    timeout = globalOptions.timeout || 30000,
    retries = globalOptions.retries || 0,
    retryDelay = globalOptions.retryDelay || 1000,
    cacheStrategy = globalOptions.defaultCacheStrategy || 'no-cache',
    cacheTime = globalOptions.defaultCacheTime || 300000,
    cancelDuplicate = false,
  } = options;

  const cacheStorage = globalOptions.cacheStorage || new DefaultCacheStorage();
  const fullUrl = baseUrl ? (baseUrl.endsWith('/') ? baseUrl + url.slice(1) : baseUrl + url) : url;
  const cacheKey = generateCacheKey(fullUrl, options);

  async function executeFetch(): Promise<T> {
    if (cancelDuplicate && abortController) {
      abortController.abort();
    }

    abortController = new AbortController();
    const abortSignal = abortController.signal;

    let currentConfig: RequestOptions = { ...options, signal: abortSignal };

    // 应用请求拦截器
    const requestInterceptors = (globalOptions.requestInterceptors || []) as RequestInterceptor[];
    for (const interceptor of requestInterceptors) {
      currentConfig = await interceptor(currentConfig);
    }

    // 处理缓存策略
    if (cacheStrategy === 'cache-only') {
      const cached = cacheStorage.get<T>(cacheKey);
      if (cached) {
        return cached.data;
      }
      throw createFetchError('Cache miss', currentConfig);
    }

    if (cacheStrategy === 'cache-first' && cacheStorage.has(cacheKey)) {
      const cached = cacheStorage.get<T>(cacheKey);
      if (cached) {
        return cached.data;
      }
    }

    isLoadingSignal.set(true);
    errorSignal.set(null);

    let lastError: FetchError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(fullUrl, currentConfig, timeout, abortSignal);

        if (!response.ok) {
          const error = createFetchError(`HTTP ${response.status}`, currentConfig, response);

          // 应用错误拦截器
          let processedError = error;
          const errorInterceptors = (globalOptions.errorInterceptors || []) as ErrorInterceptor[];
          for (const interceptor of errorInterceptors) {
            processedError = await interceptor(processedError);
          }

          lastError = processedError;

          if (options.onError) {
            await options.onError(processedError);
          }

          // 如果是最后一次尝试或者不是网络错误，不再重试
          if (attempt === retries || (response.status >= 400 && response.status < 500)) {
            throw processedError;
          }

          await delay(retryDelay);
          continue;
        }

        let result: T;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          result = (await response.text()) as unknown as T;
        }

        // 应用响应拦截器
        const responseInterceptors = (globalOptions.responseInterceptors ||
          []) as ResponseInterceptor[];
        for (const interceptor of responseInterceptors) {
          result = (await interceptor(result)) as T;
        }

        // 更新缓存
        if (cacheStrategy !== 'no-cache') {
          cacheStorage.set<T>(cacheKey, {
            data: result,
            createdAt: Date.now(),
            expiresAt: Date.now() + cacheTime,
          });
        }

        dataSignal.set(result);
        isLoadingSignal.set(false);

        return result;
      } catch (error) {
        if (abortSignal.aborted) {
          lastError = createFetchError(
            'Request cancelled',
            currentConfig,
            undefined,
            error as Error,
          );
          break;
        }

        if (attempt < retries) {
          await delay(retryDelay);
        } else {
          if (error instanceof Error && !(error as FetchError).config) {
            lastError = createFetchError(error.message, currentConfig, undefined, error);
          } else {
            lastError = error as FetchError;
          }
        }
      }
    }

    if (lastError) {
      // 处理 network-first 策略的降级
      if (cacheStrategy === 'network-first' && cacheStorage.has(cacheKey)) {
        const cached = cacheStorage.get<T>(cacheKey);
        if (cached) {
          dataSignal.set(cached.data);
          isLoadingSignal.set(false);
          return cached.data;
        }
      }

      errorSignal.set(lastError);
      isLoadingSignal.set(false);
      throw lastError;
    }

    throw createFetchError('Unknown error', currentConfig);
  }

  async function fetchWithTimeout(
    url: string,
    config: RequestOptions,
    _timeout: number,
    _signal: AbortSignal,
  ): Promise<Response> {
    const response = await fetch(url, config as RequestInit);
    return response;
  }

  const doFetch = async (): Promise<T> => {
    return executeFetch();
  };

  const refetch = async (): Promise<T> => {
    refetchCountSignal.update((v) => v + 1);
    return executeFetch();
  };

  const cancel = (): void => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isLoadingSignal.set(false);
  };

  const setData = (data: T | ((prev: T | null) => T)): void => {
    if (typeof data === 'function') {
      dataSignal.update((prev) => (data as (prev: T | null) => T)(prev));
    } else {
      dataSignal.set(data);
    }
  };

  const setError = (error: FetchError | null): void => {
    errorSignal.set(error);
  };

  const reset = (): void => {
    dataSignal.set(null);
    isLoadingSignal.set(false);
    errorSignal.set(null);
    refetchCountSignal.set(0);
    abortController = null;
  };

  return {
    get state() {
      return state();
    },
    fetch: doFetch,
    refetch,
    cancel,
    setData,
    setError,
    reset,
  };
}

/**
 * 创建 Fetch 管理器
 */
function createFetchManager(globalOptions: FetchPluginOptions = {}) {
  const cacheStorage = globalOptions.cacheStorage || new DefaultCacheStorage();
  const requestInterceptors: RequestInterceptor[] = (globalOptions.requestInterceptors ||
    []) as RequestInterceptor[];
  const responseInterceptors: ResponseInterceptor[] = (globalOptions.responseInterceptors ||
    []) as ResponseInterceptor[];
  const errorInterceptors: ErrorInterceptor[] = (globalOptions.errorInterceptors ||
    []) as ErrorInterceptor[];

  return {
    /**
     * 创建 Fetch 实例
     */
    createFetch<T = unknown>(url: string, options: RequestOptions = {}): FetchInstance<T> {
      return createFetch<T>(url, options, {
        ...globalOptions,
        cacheStorage,
        requestInterceptors,
        responseInterceptors,
        errorInterceptors,
      });
    },

    /**
     * 简单 GET 请求
     */
    async get<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
      const instance = createFetch<T>(
        url,
        { ...options, method: 'GET' },
        {
          ...globalOptions,
          cacheStorage,
          requestInterceptors,
          responseInterceptors,
          errorInterceptors,
        },
      );
      return instance.fetch();
    },

    /**
     * 简单 POST 请求
     */
    async post<T = unknown>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
      const instance = createFetch<T>(
        url,
        {
          ...options,
          method: 'POST',
          body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        },
        {
          ...globalOptions,
          cacheStorage,
          requestInterceptors,
          responseInterceptors,
          errorInterceptors,
        },
      );
      return instance.fetch();
    },

    /**
     * 简单 PUT 请求
     */
    async put<T = unknown>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
      const instance = createFetch<T>(
        url,
        {
          ...options,
          method: 'PUT',
          body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        },
        {
          ...globalOptions,
          cacheStorage,
          requestInterceptors,
          responseInterceptors,
          errorInterceptors,
        },
      );
      return instance.fetch();
    },

    /**
     * 简单 DELETE 请求
     */
    async delete<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
      const instance = createFetch<T>(
        url,
        { ...options, method: 'DELETE' },
        {
          ...globalOptions,
          cacheStorage,
          requestInterceptors,
          responseInterceptors,
          errorInterceptors,
        },
      );
      return instance.fetch();
    },

    /**
     * 添加请求拦截器
     */
    addRequestInterceptor(interceptor: RequestInterceptor): void {
      requestInterceptors.push(interceptor);
    },

    /**
     * 添加响应拦截器
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): void {
      responseInterceptors.push(interceptor);
    },

    /**
     * 添加错误拦截器
     */
    addErrorInterceptor(interceptor: ErrorInterceptor): void {
      errorInterceptors.push(interceptor);
    },

    /**
     * 获取缓存存储
     */
    getCacheStorage(): CacheStorage {
      return cacheStorage;
    },

    /**
     * 清除缓存
     */
    clearCache(): void {
      cacheStorage.clear();
    },

    /**
     * 删除特定缓存
     */
    invalidateCache(key: string): void {
      cacheStorage.delete(key);
    },
  };
}

const pluginDataFetch = definePlugin({
  name: 'data-fetch',
  version: '6.0.0',
  description: 'LytJS official data fetch plugin with caching, retries, and interceptors',
  author: 'LytJS Team',
  keywords: ['lytjs', 'fetch', 'ajax', 'cache', 'interceptor'],
  schema: {
    type: 'object',
    object: {
      properties: {
        baseUrl: { type: 'string' },
        timeout: { type: 'number', default: 30000 },
        retries: { type: 'number', default: 0 },
        retryDelay: { type: 'number', default: 1000 },
        defaultCacheStrategy: { type: 'string', default: 'no-cache' },
        defaultCacheTime: { type: 'number', default: 300000 },
      },
    },
  },
  install(app, options) {
    const fetchManager = createFetchManager(options as FetchPluginOptions);

    app.config.globalProperties.$fetch = fetchManager;
    app.config.globalProperties.$http = fetchManager;

    app.provide('lyt-fetch', fetchManager);
  },
});

export default pluginDataFetch;
export type {
  RequestOptions,
  FetchError,
  CacheEntry,
  CacheStorage,
  Interceptor,
  FetchState,
  FetchInstance,
  FetchPluginOptions,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
};
export { createFetchManager, DefaultCacheStorage, generateCacheKey };
