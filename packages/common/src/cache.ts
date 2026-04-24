/**
 * Lyt.js Core Shared - Cache Utilities
 *
 * 缓存工具
 * 纯原生零依赖实现
 */

/**
 * LRU缓存
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存值
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * 设置缓存值
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * 检查缓存是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除缓存
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有键
   */
  keys(): K[] {
    return [...this.cache.keys()];
  }

  /**
   * 获取所有值
   */
  values(): V[] {
    return [...this.cache.values()];
  }

  /**
   * 获取所有条目
   */
  entries(): [K, V][] {
    return [...this.cache.entries()];
  }
}

/**
 * 记忆化函数
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyResolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const key = keyResolver ? keyResolver(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };

  return memoized as T;
}

/**
 * 带过期时间的缓存
 */
export class ExpiringCache<K, V> {
  private cache: Map<K, { value: V; expiresAt: number }>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * 设置缓存
   */
  set(key: K, value: V, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * 获取缓存
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: K): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    this.cleanup();
    return this.cache.size;
  }
}
