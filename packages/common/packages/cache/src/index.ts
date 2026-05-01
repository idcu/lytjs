/**
 * @lytjs/common-cache
 * 缓存策略工具
 */

/**
 * LRU 缓存节点
 */
interface LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

/**
 * LRU（最近最少使用）缓存
 */
export class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, LRUNode<K, V>> = new Map();
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;
  private _size: number = 0;

  constructor(maxSize: number) {
    if (maxSize < 1) {
      throw new Error("LRUCache maxSize must be at least 1");
    }
    this.capacity = maxSize;
  }

  get size(): number {
    return this._size;
  }

  private moveToHead(node: LRUNode<K, V>): void {
    if (node === this.head) return;
    this.removeNode(node);
    this.addToHead(node);
  }

  private addToHead(node: LRUNode<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
    node.prev = null;
    node.next = null;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToHead(node);
    return node.value;
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    const newNode: LRUNode<K, V> = {
      key,
      value,
      prev: null,
      next: null,
    };
    this.map.set(key, newNode);
    this.addToHead(newNode);
    this._size++;

    if (this._size > this.capacity) {
      const removed = this.tail!;
      this.removeNode(removed);
      this.map.delete(removed.key);
      this._size--;
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.map.delete(key);
    this._size--;
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
    this._size = 0;
  }

  forEach(callback: (value: V, key: K) => void): void {
    let current = this.head;
    while (current) {
      callback(current.value, current.key);
      current = current.next;
    }
  }
}

/**
 * 缓存条目
 */
interface CacheEntry<V> {
  value: V;
  expiry: number;
}

/**
 * 带过期时间的缓存
 */
export class ExpiringCache<K, V> {
  private ttl: number;
  private map: Map<K, CacheEntry<V>> = new Map();

  constructor(ttlMs: number) {
    if (ttlMs < 1) {
      throw new Error("ExpiringCache TTL must be at least 1ms");
    }
    this.ttl = ttlMs;
  }

  get size(): number {
    return this.map.size;
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return Date.now() > entry.expiry;
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (this.isExpired(entry)) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V): void {
    const entry: CacheEntry<V> = {
      value,
      expiry: Date.now() + this.ttl,
    };
    this.map.set(key, entry);
  }

  has(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  /**
   * 清理所有过期条目
   */
  cleanup(): number {
    let cleaned = 0;
    this.map.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        this.map.delete(key);
        cleaned++;
      }
    });
    return cleaned;
  }
}

/**
 * Memoize 函数返回类型
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface MemoizedFn<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  clear: () => void;
}

/**
 * 函数记忆化
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: { resolver?: (...args: any[]) => string; maxSize?: number },
  externalCache?: Map<string, ReturnType<T>>,
): MemoizedFn<T> {
  const internalCache = externalCache ?? new Map<string, ReturnType<T>>();
  const maxSize = options?.maxSize;

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    let key: string | undefined;
    try {
      key = options?.resolver
        ? options.resolver(...args)
        : JSON.stringify(args.length === 1 ? args[0] : args);
    } catch {
      key = undefined;
    }
    if (!key) return fn(...args);
    if (internalCache.has(key)) {
      return internalCache.get(key)!;
    }
    const result = fn(...args);
    internalCache.set(key, result);
    if (maxSize && internalCache.size > maxSize) {
      const firstKey = internalCache.keys().next().value;
      if (firstKey !== undefined) internalCache.delete(firstKey);
    }
    return result;
  }) as MemoizedFn<T>;

  memoized.clear = () => {
    internalCache.clear();
  };

  return memoized;
}
