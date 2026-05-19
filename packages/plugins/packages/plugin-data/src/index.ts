/**
 * @lytjs/plugin-data
 *
 * Enhanced data plugin with optimistic updates, deduplication, and store integration
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import { signal, signalComputed as computed } from '@lytjs/reactivity';
import {
  createFetchManager,
  DefaultCacheStorage,
  generateCacheKey,
} from '@lytjs/plugin-data-fetch';
import type {
  RequestOptions,
  FetchError,
  CacheStorage,
  CacheEntry,
  DataPluginOptions,
  DataManager,
  DataInstance,
  DedupeEntry,
} from './types';
import { TTLCache, LRUCache } from './cache';

/**
 * 请求去重映射表
 */
const pendingRequests = new Map<string, DedupeEntry>();

/**
 * 活跃的数据实例集合
 */
const activeInstances = new Set<{ cancel(): void }>();

/**
 * 创建缓存键（复用自 data-fetch）
 */
export { generateCacheKey };

/**
 * 缓存策略导出
 */
export { TTLCache, LRUCache };

/**
 * 创建数据实例
 */
export function createData<T = unknown>(
  url: string,
  options: RequestOptions = {},
  globalOptions: DataPluginOptions = {},
): DataInstance<T> {
  const dataSignal = signal<T | null>(null);
  const isLoadingSignal = signal(false);
  const errorSignal = signal<FetchError | null>(null);
  const refetchCountSignal = signal(0);
  const isPrefetchingSignal = signal(false);
  let abortController: AbortController | null = null;
  let lastRollbackData: T | null = null;

  const state = computed(() => ({
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
    dedupe = globalOptions.defaultDedupe || false,
    optimisticData,
    prefetch = false,
  } = options;

  const cacheStorage = globalOptions.cacheStorage || new DefaultCacheStorage();
  const fullUrl = baseUrl ? (baseUrl.endsWith('/') ? baseUrl + url.slice(1) : baseUrl + url) : url;
  const cacheKey = generateCacheKey(fullUrl, options);

  async function executeFetch(): Promise<T> {
    if (dedupe) {
      const existing = pendingRequests.get(cacheKey);
      if (existing && Date.now() - existing.timestamp < 10000) {
        return existing.promise as Promise<T>;
      }
    }

    if (optimisticData !== undefined) {
      optimisticUpdate(optimisticData as T);
    }

    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();
    const abortSignal = abortController.signal;

    const manager = createFetchManager({
      ...globalOptions,
      cacheStorage,
    });

    const instance = manager.createFetch<T>(url, {
      ...options,
      signal: abortSignal,
    });

    const promise = instance.fetch().then(
      (result) => {
        dataSignal.set(result);
        if (globalOptions.storeIntegration?.onUpdate) {
          globalOptions.storeIntegration.onUpdate(cacheKey, result);
        }
        pendingRequests.delete(cacheKey);
        return result;
      },
      (error) => {
        if (lastRollbackData !== null) {
          rollbackOptimistic();
        }
        pendingRequests.delete(cacheKey);
        throw error;
      }
    );

    if (dedupe) {
      pendingRequests.set(cacheKey, { promise, timestamp: Date.now() });
    }

    activeInstances.add({ cancel: instance.cancel });

    return promise;
  }

  const optimisticUpdate = (data: T): void => {
    lastRollbackData = dataSignal();
    dataSignal.set(data);
  };

  const rollbackOptimistic = (): void => {
    if (lastRollbackData !== null) {
      dataSignal.set(lastRollbackData);
    }
  };

  const doFetch = async (): Promise<T> => {
    return executeFetch();
  };

  const refetch = async (): Promise<T> => {
    refetchCountSignal.update(v => v + 1);
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
      dataSignal.update(prev => (data as (prev: T | null) => T)(prev));
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
    get isPrefetching() {
      return isPrefetchingSignal();
    },
    fetch: doFetch,
    refetch,
    cancel,
    setData,
    setError,
    reset,
    optimisticUpdate,
    rollbackOptimistic,
  };
}

/**
 * 创建数据管理器
 */
export function createDataManager(globalOptions: DataPluginOptions = {}): DataManager {
  const cacheStorage = globalOptions.cacheStorage || new DefaultCacheStorage();
  const manager = createFetchManager(globalOptions);

  return {
    createData<T = unknown>(url: string, options: RequestOptions = {}): DataInstance<T> {
      return createData<T>(url, options, {
        ...globalOptions,
        cacheStorage,
      });
    },

    async get<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
      const instance = createData<T>(url, { ...options, method: 'GET' }, {
        ...globalOptions,
        cacheStorage,
      });
      return instance.fetch();
    },

    async post<T = unknown>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
      const instance = createData<T>(url, {
        ...options,
        method: 'POST',
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      }, {
        ...globalOptions,
        cacheStorage,
      });
      return instance.fetch();
    },

    async put<T = unknown>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
      const instance = createData<T>(url, {
        ...options,
        method: 'PUT',
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      }, {
        ...globalOptions,
        cacheStorage,
      });
      return instance.fetch();
    },

    async delete<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
      const instance = createData<T>(url, { ...options, method: 'DELETE' }, {
        ...globalOptions,
        cacheStorage,
      });
      return instance.fetch();
    },

    addRequestInterceptor(interceptor: (config: RequestOptions) => RequestOptions | Promise<RequestOptions>): void {
      manager.addRequestInterceptor(interceptor as any);
    },

    addResponseInterceptor(interceptor: <T = unknown>(response: T) => T | Promise<T>): void {
      manager.addResponseInterceptor(interceptor);
    },

    addErrorInterceptor(interceptor: (error: FetchError) => FetchError | Promise<FetchError>): void {
      manager.addErrorInterceptor(interceptor);
    },

    getCacheStorage(): CacheStorage {
      return manager.getCacheStorage();
    },

    clearCache(): void {
      manager.clearCache();
    },

    invalidateCache(key: string): void {
      manager.invalidateCache(key);
    },

    async prefetch<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
      const instance = createData<T>(url, { ...options, prefetch: true }, {
        ...globalOptions,
        cacheStorage,
      });
      return instance.fetch();
    },

    getPendingRequests(): Set<string> {
      return new Set(pendingRequests.keys());
    },

    cancelAllRequests(): void {
      for (const instance of activeInstances) {
        instance.cancel();
      }
      activeInstances.clear();
      pendingRequests.clear();
    },
  };
}

/**
 * 定义插件
 */
const pluginData = definePlugin({
  name: 'data',
  version: '6.0.0',
  description: 'LytJS official enhanced data plugin with optimistic updates, deduplication, and store integration',
  author: 'LytJS Team',
  keywords: ['lytjs', 'data', 'fetch', 'optimistic', 'store'],
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
        defaultDedupe: { type: 'boolean', default: false },
        offlineMode: { type: 'boolean', default: false },
      },
    },
  },
  install(app, options) {
    const dataManager = createDataManager(options as DataPluginOptions);

    app.config.globalProperties.$data = dataManager;
    app.config.globalProperties.$dataManager = dataManager;

    app.provide('lyt-data', dataManager);
  },
});

export default pluginData;

export type {
  RequestOptions,
  FetchError,
  CacheEntry,
  CacheStorage,
  DataPluginOptions,
  DataManager,
  DataInstance,
} from './types';
