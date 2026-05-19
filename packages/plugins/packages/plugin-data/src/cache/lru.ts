/**
 * LRU (Least Recently Used) 缓存策略实现
 */

import type { CacheStorage, CacheEntry } from '../types';

interface LRUEntry<T = unknown> extends CacheEntry<T> {
  lastAccessed: number;
}

export class LRUCache implements CacheStorage {
  private cache = new Map<string, LRUEntry>();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get<T = unknown>(key: string): LRUEntry<T> | null {
    const entry = this.cache.get(key) as LRUEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  set<T = unknown>(key: string, value: CacheEntry<T>): void {
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    const lruEntry: LRUEntry<T> = {
      ...value,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, lruEntry);
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

  private evict(): void {
    const keys = Array.from(this.cache.keys());
    if (keys.length > 0) {
      this.cache.delete(keys[0]);
    }
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取最大缓存大小
   */
  getMaxSize(): number {
    return this.maxSize;
  }
}
