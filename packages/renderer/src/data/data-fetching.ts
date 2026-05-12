// packages/renderer/src/data/data-fetching.ts
// 数据获取功能
// Phase 1.7: 数据获取集成服务端数据预取 + 序列化

import { ref, watch, type Ref } from '@lytjs/reactivity';
import { isArray } from '@lytjs/common-is';

// ============================================================
// 类型定义
// ============================================================

/** 数据获取状态 */
export interface DataFetchState<T extends unknown = unknown> {
  /** 数据 */
  data: T | undefined;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 是否来自缓存 */
  fromCache: boolean;
  /** 获取时间戳 */
  timestamp: number | null;
}

/** 数据获取选项 */
export interface DataFetchOptions<T extends unknown = unknown> {
  /** 是否立即执行 */
  immediate?: boolean;
  /** 初始数据 */
  initialData?: T;
  /** 缓存键 */
  cacheKey?: string | (() => string);
  /** 缓存时间（毫秒） */
  cacheTime?: number;
  /** 是否服务端预取 */
  serverPrefetch?: boolean;
  /** 依赖项变化时重新获取 */
  watch?: Ref<unknown>[];
  /** 转换函数 */
  transform?: (data: unknown) => T;
  /** 错误处理 */
  onError?: (error: Error) => void;
  /** 成功处理 */
  onSuccess?: (data: T) => void;
  /** 重试次数 */
  retry?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/** 预取数据条目 */
export interface PrefetchDataEntry {
  /** 缓存键 */
  key: string;
  /** 数据 */
  data: unknown;
  /** 时间戳 */
  timestamp: number;
  /** 过期时间 */
  expiresAt: number;
}

/** 预取管理器 */
export interface PrefetchManager {
  /** 预取数据 */
  prefetch<T>(key: string, fetcher: () => Promise<T>): Promise<T>;
  /** 获取预取数据 */
  getPrefetchedData<T>(key: string): T | undefined;
  /** 序列化所有预取数据 */
  serialize(): string;
  /** 反序列化预取数据 */
  deserialize(data: string): void;
  /** 清除预取数据 */
  clear(): void;
}

// ============================================================
// 全局预取数据存储
// ============================================================

const prefetchStore = new Map<string, PrefetchDataEntry>();
const pendingPrefetches = new Map<string, Promise<unknown>>();

// ============================================================
// 数据序列化
// ============================================================

/**
 * 序列化数据（支持特殊类型）
 */
export function serializeData(data: unknown): string {
  return JSON.stringify(data, (_key, value) => {
    // 处理特殊类型
    if (value instanceof Date) {
      return { __type: 'Date', __value: value.toISOString() };
    }
    if (value instanceof Map) {
      return { __type: 'Map', __value: Array.from(value.entries()) };
    }
    if (value instanceof Set) {
      return { __type: 'Set', __value: Array.from(value.values()) };
    }
    if (typeof value === 'bigint') {
      return { __type: 'BigInt', __value: value.toString() };
    }
    if (value === undefined) {
      return { __type: 'undefined' };
    }
    if (value instanceof Error) {
      return {
        __type: 'Error',
        __value: {
          name: value.name,
          message: value.message,
          stack: value.stack,
        },
      };
    }
    if (value instanceof RegExp) {
      return { __type: 'RegExp', __value: value.toString() };
    }
    return value as unknown;
  });
}

/**
 * 反序列化数据
 */
export function deserializeData(json: string): unknown {
  return JSON.parse(json, (_key, value) => {
    if (value && typeof value === 'object' && '__type' in value) {
      switch (value.__type) {
        case 'Date':
          return new Date(value.__value);
        case 'Map':
          return new Map(value.__value);
        case 'Set':
          return new Set(value.__value);
        case 'BigInt':
          return BigInt(value.__value);
        case 'undefined':
          return undefined;
        case 'Error': {
          const err = new Error(value.__value.message);
          err.name = value.__value.name;
          err.stack = value.__value.stack;
          return err;
        }
        case 'RegExp': {
          const match = value.__value.match(/^\/(.*)\/([gimsuy]*)$/);
          if (match) {
            return new RegExp(match[1], match[2]);
          }
          return new RegExp(value.__value);
        }
      }
    }
    return value;
  });
}

// ============================================================
// 预取管理器
// ============================================================

/**
 * 创建预取管理器
 */
export function createPrefetchManager(): PrefetchManager {
  return {
    async prefetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
      // 检查是否已有缓存
      const cached = prefetchStore.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }

      // 检查是否正在获取
      const pending = pendingPrefetches.get(key);
      if (pending) {
        return pending as Promise<T>;
      }

      // 开始获取
      const fetchPromise = fetcher();
      pendingPrefetches.set(key, fetchPromise);

      try {
        const data = await fetchPromise;
        const now = Date.now();

        prefetchStore.set(key, {
          key,
          data,
          timestamp: now,
          expiresAt: now + 5 * 60 * 1000, // 默认 5 分钟过期
        });

        return data;
      } finally {
        pendingPrefetches.delete(key);
      }
    },

    getPrefetchedData<T>(key: string): T | undefined {
      const entry = prefetchStore.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        return entry.data as T;
      }
      return undefined;
    },

    serialize(): string {
      const entries = Array.from(prefetchStore.values());
      return serializeData(entries);
    },

    deserialize(data: string): void {
      const entries = deserializeData(data) as PrefetchDataEntry[];
      if (isArray(entries)) {
        for (const entry of entries) {
          prefetchStore.set(entry.key, entry);
        }
      }
    },

    clear(): void {
      prefetchStore.clear();
      pendingPrefetches.clear();
    },
  };
}

// ============================================================
// useFetch 组合式函数
// ============================================================

/**
 * 组合式数据获取函数
 *
 * @example
 * ```ts
 * const { data, loading, error, refetch } = useFetch('/api/users', {
 *   immediate: true,
 *   cacheKey: 'users',
 * });
 * ```
 */
export function useFetch<T extends string | number | boolean | object | null = object>(
  url: string | (() => string),
  options: DataFetchOptions<T> = {},
): {
  data: Ref<T | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
} {
  const {
    immediate = true,
    initialData,
    cacheKey,
    cacheTime = 5 * 60 * 1000,
    watch: watchDeps,
    transform,
    onError,
    onSuccess,
    retry = 0,
    retryDelay = 1000,
  } = options;

  const data = ref(initialData) as Ref<unknown> as Ref<T | undefined>;
  const loading = ref<boolean>(false);
  const error = ref<Error | null>(null);
  const fromCache = ref<boolean>(false);
  const timestamp = ref<number | null>(null);

  let retryCount = 0;

  const fetchData = async () => {
    const resolvedUrl = typeof url === 'function' ? url() : url;
    const resolvedCacheKey = typeof cacheKey === 'function' ? cacheKey() : cacheKey;

    // 检查缓存
    if (resolvedCacheKey) {
      const cached = prefetchStore.get(resolvedCacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        data.value = cached.data as T;
        fromCache.value = true as boolean;
        timestamp.value = cached.timestamp;
        return;
      }

      // 检查服务端预取数据
      if (typeof window !== 'undefined') {
        const serverData = (window as any).__LYTJS_PREFETCH_DATA__;
        if (serverData && serverData[resolvedCacheKey]) {
          data.value = serverData[resolvedCacheKey] as T;
          fromCache.value = true as boolean;
          delete serverData[resolvedCacheKey];
          return;
        }
      }
    }

    loading.value = true as boolean;
    error.value = null;

    try {
      const response = await fetch(resolvedUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let result = await response.json();

      // 应用转换
      if (transform) {
        result = transform(result as unknown) as T;
      }

      data.value = result as T;
      timestamp.value = Date.now();
      retryCount = 0;

      // 缓存数据
      if (resolvedCacheKey) {
        prefetchStore.set(resolvedCacheKey, {
          key: resolvedCacheKey,
          data: result,
          timestamp: timestamp.value,
          expiresAt: timestamp.value + cacheTime,
        });
      }

      onSuccess?.(result as T);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      error.value = fetchError;

      // 重试逻辑
      if (retryCount < retry) {
        retryCount++;
        setTimeout(fetchData, retryDelay);
        return;
      }

      onError?.(fetchError);
    } finally {
      loading.value = false;
    }
  };

  // 监听依赖变化
  if (watchDeps && watchDeps.length > 0) {
    watch(watchDeps, () => {
      fetchData();
    });
  }

  // 立即执行
  if (immediate) {
    fetchData();
  }

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// ============================================================
// useAsyncData 组合式函数
// ============================================================

/**
 * 异步数据获取（类似 Nuxt useAsyncData）
 *
 * @example
 * ```ts
 * const { data, pending, error } = useAsyncData('users', () =>
 *   $fetch('/api/users')
 * );
 * ```
 */
export function useAsyncData<T extends string | number | boolean | object | null = object>(
  key: string,
  fetcher: () => Promise<T>,
  options: DataFetchOptions<T> = {},
): {
  data: Ref<T | undefined>;
  pending: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
} {
  const {
    immediate = true,
    initialData,
    transform,
    onError,
    onSuccess,
  } = options;

  const data = ref<T | undefined>(initialData);
  const pending = ref<boolean>(false);
  const error = ref<Error | null>(null);

  const execute = async () => {
    // 检查缓存
    const cached = prefetchStore.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      data.value = cached.data as T;
      return;
    }

    // 检查服务端预取数据
    if (typeof window !== 'undefined') {
      const serverData = (window as any).__LYTJS_PREFETCH_DATA__;
      if (serverData && serverData[key]) {
        data.value = serverData[key] as T;
        delete serverData[key];
        return;
      }
    }

    pending.value = true as boolean;
    error.value = null;

    try {
      let result: T = await fetcher() as T;

      if (transform) {
        result = transform(result as unknown) as T;
      }

      data.value = result as T;

      // 缓存数据
      const now = Date.now();
      prefetchStore.set(key, {
        key,
        data: result,
        timestamp: now,
        expiresAt: now + (options.cacheTime || 5 * 60 * 1000),
      });

      onSuccess?.(result as T);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      error.value = fetchError;
      onError?.(fetchError);
    } finally {
      pending.value = false as boolean;
    }
  };

  if (immediate) {
    execute();
  }

  return {
    data,
    pending,
    error,
    refresh: execute,
  };
}

// ============================================================
// 服务端数据注入
// ============================================================

/**
 * 注入服务端预取数据到 HTML
 */
export function injectPrefetchData(): string {
  const data: Record<string, unknown> = {};

  for (const [key, entry] of prefetchStore) {
    data[key] = entry.data;
  }

  if (Object.keys(data).length === 0) {
    return '';
  }

  return `<script>window.__LYTJS_PREFETCH_DATA__=${serializeData(data)};</script>`;
}

/**
 * 从客户端读取预取数据
 */
export function getPrefetchData<T = unknown>(key: string): T | undefined {
  // 先检查内存缓存
  const cached = prefetchStore.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  // 检查服务端注入的数据
  if (typeof window !== 'undefined') {
    const serverData = (window as any).__LYTJS_PREFETCH_DATA__;
    if (serverData && serverData[key]) {
      const data = serverData[key] as T;
      delete serverData[key];
      return data;
    }
  }

  return undefined;
}

// ============================================================
// 导出（函数已在上面定义）
// ============================================================
