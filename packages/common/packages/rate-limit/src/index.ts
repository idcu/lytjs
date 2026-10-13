/**
 * @lytjs/common-rate-limit
 *
 * Rate limiting strategies for LytJS
 *
 * ## 2026-10-10 修复（P1-3）
 *
 * 原实现有两处与命名/预期不符，均已修正：
 *
 * 1. **`SlidingWindowLimiter` 其实不是滑动窗口** —— 原实现把窗口起点对齐到
 *    epoch 网格（`now - (now % windowMs)`）并在跨窗口时把计数清零，这是
 *    **固定窗口**，而且比 `FixedWindowLimiter` 还多一层边界对齐问题。
 *    现在改为**真滑动窗口**（滑动日志）：保留窗口内每次请求的时间戳，
 *    超出窗口的逐个丢弃 ⇒ 任意时刻都精确遵守「最近 windowMs 内不超过 max」。
 *
 * 2. **三个限流器的 Map 只增不减 ⇒ 内存泄漏** —— key 来自客户端（IP / 会话）时，
 *    每个新 key 都会永久驻留；攻击者用海量伪造 key 即可撑爆内存（DoS）。
 *    现在三者都用 `BoundedKeyMap`：**LRU 上限**（`maxKeys`，默认 10000）
 *    + **周期性清扫**（窗口内已全部过期的键直接删除）。
 */

// ===== Types =====

export interface RateLimitOptions {
  /**
   * Maximum number of requests
   */
  max: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * 最多保留多少个客户端键；超出后按 LRU 淘汰最久未使用的键。
   *
   * 默认 `10000`。传 `0` 表示不限制 —— ⚠️ 服务端场景下「不限制」等于
   * 内存无界增长（可被伪造 key 撑爆），除非你确定 key 空间有限，否则不要传 0。
   */
  maxKeys?: number;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Remaining requests in the current window
   */
  remaining: number;

  /**
   * Reset timestamp
   */
  reset: number;

  /**
   * Total limit
   */
  limit: number;
}

const DEFAULT_MAX_KEYS = 10_000;

// ===== 有界键表 =====

/**
 * 有界键表：LRU 淘汰 + 支持遍历式清扫。
 *
 * 为什么需要它：`Map` 本身**不会**因为「值过期了」而收缩 —— 必须有人主动删。
 * 三个限流器原实现都漏了这一步。
 */
class BoundedKeyMap<V> {
  private readonly map = new Map<string, V>();
  private readonly maxKeys: number;

  constructor(maxKeys: number) {
    this.maxKeys = maxKeys;
  }

  get size(): number {
    return this.map.size;
  }

  /** 读取并「触达」（移到 LRU 末尾） */
  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    this.evict();
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  /** 遍历并删除满足条件的键（遍历中删除 Map 项是安全的） */
  prune(predicate: (value: V, key: string) => boolean): void {
    for (const [key, value] of this.map) {
      if (predicate(value, key)) this.map.delete(key);
    }
  }

  private evict(): void {
    if (this.maxKeys <= 0) return;
    while (this.map.size > this.maxKeys) {
      const oldest = this.map.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }
}

// ===== Sliding Window Limiter（真滑动窗口 / 滑动日志）=====

/**
 * 滑动窗口限流器
 *
 * 记录窗口内**每次请求的时间戳**，判定时先丢弃滑出窗口的记录，
 * 再看剩余条数是否达到 `max`。任意时刻都精确满足
 * 「最近 `windowMs` 毫秒内不超过 `max` 次」。
 *
 * 内存上界：每个键最多保留 `max` 个时间戳（超出的请求不会被记录）⇒
 * 总量 ≈ `maxKeys × max` 个数字，**有界**。
 */
export class SlidingWindowLimiter {
  private windows: BoundedKeyMap<number[]>;
  private max: number;
  private windowMs: number;
  private lastSweep = 0;

  constructor(options: RateLimitOptions) {
    this.max = options.max;
    this.windowMs = options.windowMs;
    this.windows = new BoundedKeyMap<number[]>(options.maxKeys ?? DEFAULT_MAX_KEYS);
  }

  /** 当前跟踪的键数量（用于观测内存占用是否受控） */
  get size(): number {
    return this.windows.size;
  }

  /**
   * Check if a key is allowed
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    // 先清扫（避免把本次要用的键当成过期键删掉）
    this.sweepIfNeeded(now, cutoff);

    let stamps = this.windows.get(key);
    if (!stamps) {
      stamps = [];
      this.windows.set(key, stamps);
    } else if (stamps.length > 0 && stamps[0]! <= cutoff) {
      // 时间戳按升序，从头部丢弃已滑出窗口的（splice 均摊 O(1)）
      let i = 0;
      while (i < stamps.length && stamps[i]! <= cutoff) i++;
      stamps.splice(0, i);
    }

    if (stamps.length >= this.max) {
      return {
        allowed: false,
        remaining: 0,
        reset: stamps[0]! + this.windowMs,
        limit: this.max,
      };
    }

    stamps.push(now);

    return {
      allowed: true,
      remaining: Math.max(0, this.max - stamps.length),
      reset: stamps[0]! + this.windowMs,
      limit: this.max,
    };
  }

  /**
   * Reset the limit for a key
   */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /**
   * Clear all limits
   */
  clear(): void {
    this.windows.clear();
  }

  /** 最多每 windowMs 清扫一次：删除窗口内已无任何记录的键 */
  private sweepIfNeeded(now: number, cutoff: number): void {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    this.windows.prune((stamps) => stamps.length === 0 || stamps[stamps.length - 1]! <= cutoff);
  }
}

// ===== Token Bucket Limiter =====

interface TokenBucketEntry {
  tokens: number;
  lastRefill: number;
}

/**
 * Token bucket rate limiter
 *
 * Tokens are added to a bucket at a fixed rate
 * Each request consumes a token
 */
export class TokenBucketLimiter {
  private buckets: BoundedKeyMap<TokenBucketEntry>;
  private capacity: number;
  private refillRate: number; // tokens per refill
  private refillTime: number; // refill every X ms
  private lastSweep = 0;

  /**
   * @param options.capacity - Maximum tokens in the bucket
   * @param options.refillRate - How many tokens to add per refill
   * @param options.refillTime - How often to refill (ms)
   * @param options.maxKeys - 最多保留多少个桶（LRU 淘汰），默认 10000
   */
  constructor(options: {
    capacity: number;
    refillRate: number;
    refillTime: number;
    maxKeys?: number;
  }) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.refillTime = options.refillTime;
    this.buckets = new BoundedKeyMap<TokenBucketEntry>(options.maxKeys ?? DEFAULT_MAX_KEYS);
  }

  /** 当前跟踪的键数量 */
  get size(): number {
    return this.buckets.size;
  }

  /**
   * Check if a key is allowed
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    this.sweepIfNeeded(now);

    let entry = this.buckets.get(key);

    if (!entry) {
      entry = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, entry);
    } else {
      // Refill tokens
      const elapsed = now - entry.lastRefill;
      const refills = Math.floor(elapsed / this.refillTime);
      if (refills > 0) {
        entry.tokens = Math.min(this.capacity, entry.tokens + refills * this.refillRate);
        entry.lastRefill += refills * this.refillTime;
      }
    }

    const nextRefill = entry.lastRefill + this.refillTime;

    if (entry.tokens <= 0) {
      return {
        allowed: false,
        remaining: 0,
        reset: nextRefill,
        limit: this.capacity,
      };
    }

    entry.tokens--;

    return {
      allowed: true,
      remaining: Math.max(0, entry.tokens),
      reset: nextRefill,
      limit: this.capacity,
    };
  }

  /**
   * Reset the limit for a key
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Clear all limits
   */
  clear(): void {
    this.buckets.clear();
  }

  /** 桶已满且空闲 ⇒ 与「从未出现过的新桶」不可区分，可直接回收 */
  private sweepIfNeeded(now: number): void {
    if (now - this.lastSweep < this.refillTime) return;
    this.lastSweep = now;
    this.buckets.prune(
      (entry) => entry.tokens >= this.capacity && now - entry.lastRefill >= this.refillTime,
    );
  }
}

// ===== Fixed Window Limiter =====

interface FixedWindowEntry {
  count: number;
  resetTime: number;
}

/**
 * Fixed window rate limiter
 *
 * Simple fixed time window rate limiting.
 * ⚠️ 窗口边界处可能出现「两倍突发」（前一窗口末尾 + 后一窗口开头各打满一次）；
 * 需要严格平滑请用 `SlidingWindowLimiter` 或 `TokenBucketLimiter`。
 */
export class FixedWindowLimiter {
  private windows: BoundedKeyMap<FixedWindowEntry>;
  private max: number;
  private windowMs: number;
  private lastSweep = 0;

  constructor(options: RateLimitOptions) {
    this.max = options.max;
    this.windowMs = options.windowMs;
    this.windows = new BoundedKeyMap<FixedWindowEntry>(options.maxKeys ?? DEFAULT_MAX_KEYS);
  }

  /** 当前跟踪的键数量 */
  get size(): number {
    return this.windows.size;
  }

  /**
   * Check if a key is allowed
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    this.sweepIfNeeded(now);

    let entry = this.windows.get(key);

    if (!entry || now >= entry.resetTime) {
      // New window
      entry = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.windows.set(key, entry);
    }

    if (entry.count >= this.max) {
      return {
        allowed: false,
        remaining: 0,
        reset: entry.resetTime,
        limit: this.max,
      };
    }

    entry.count++;

    return {
      allowed: true,
      remaining: Math.max(0, this.max - entry.count),
      reset: entry.resetTime,
      limit: this.max,
    };
  }

  /**
   * Reset the limit for a key
   */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /**
   * Clear all limits
   */
  clear(): void {
    this.windows.clear();
  }

  /** 窗口已过期 ⇒ 该键等同于不存在，可回收 */
  private sweepIfNeeded(now: number): void {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    this.windows.prune((entry) => now >= entry.resetTime);
  }
}

// ===== Convenience Functions =====

/**
 * Create a sliding window limiter (default)
 */
export function createRateLimiter(options: RateLimitOptions): SlidingWindowLimiter {
  return new SlidingWindowLimiter(options);
}

/**
 * Create a fixed window limiter (simpler, but has window boundary issues)
 */
export function createFixedWindowLimiter(options: RateLimitOptions): FixedWindowLimiter {
  return new FixedWindowLimiter(options);
}

/**
 * Create a token bucket limiter (more flexible, smoother rate)
 */
export function createTokenBucketLimiter(options: {
  capacity: number;
  refillRate: number;
  refillTime: number;
  maxKeys?: number;
}): TokenBucketLimiter {
  return new TokenBucketLimiter(options);
}
