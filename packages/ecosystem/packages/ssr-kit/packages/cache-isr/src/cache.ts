import type { ISRCacheConfig } from './types';

interface ExtendedCacheEntry<V> {
  value: V;
  expiry: number;
  revalidateAt?: number;
  createdAt: number;
}

export class ISRCache {
  private cache: Map<string, ExtendedCacheEntry<unknown>> = new Map();
  private defaultMaxAge: number;

  constructor(config: ISRCacheConfig = {}) {
    this.defaultMaxAge = config.maxAge ?? 3600000;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (entry.expiry < now) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, config?: ISRCacheConfig): void {
    const now = Date.now();
    const { maxAge = this.defaultMaxAge, revalidate } = {
      maxAge: this.defaultMaxAge,
      revalidate: config?.revalidate,
    };

    this.cache.set(key, {
      value,
      expiry: now + maxAge,
      revalidateAt: revalidate ? now + revalidate : undefined,
      createdAt: now,
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (!entry.revalidateAt) return false;
    return Date.now() >= entry.revalidateAt;
  }
}
