/**
 * @lytjs/common-rate-limit
 *
 * Rate limiting strategies for LytJS
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

// ===== Sliding Window Limiter =====

interface SlidingWindowEntry {
  count: number;
  windowStart: number;
}

/**
 * Sliding window rate limiter
 *
 * Uses a sliding time window to track requests
 */
export class SlidingWindowLimiter {
  private windows: Map<string, SlidingWindowEntry> = new Map();
  private max: number;
  private windowMs: number;

  constructor(options: RateLimitOptions) {
    this.max = options.max;
    this.windowMs = options.windowMs;
  }

  /**
   * Check if a key is allowed
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const currentWindowStart = now - (now % this.windowMs);

    let entry = this.windows.get(key);
    if (!entry) {
      entry = { count: 0, windowStart: currentWindowStart };
      this.windows.set(key, entry);
    }

    // Clean up if we're in a new window
    if (entry.windowStart < currentWindowStart) {
      entry.count = 0;
      entry.windowStart = currentWindowStart;
    }

    const reset = entry.windowStart + this.windowMs;

    if (entry.count >= this.max) {
      return {
        allowed: false,
        remaining: 0,
        reset,
        limit: this.max,
      };
    }

    entry.count++;

    return {
      allowed: true,
      remaining: Math.max(0, this.max - entry.count),
      reset,
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
  private buckets: Map<string, TokenBucketEntry> = new Map();
  private capacity: number;
  private refillRate: number; // tokens per millisecond
  private refillTime: number; // refill every X ms

  /**
   * @param options.capacity - Maximum tokens in the bucket
   * @param options.refillRate - How many tokens to add per refill
   * @param options.refillTime - How often to refill (ms)
   */
  constructor(options: { capacity: number; refillRate: number; refillTime: number }) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.refillTime = options.refillTime;
  }

  /**
   * Check if a key is allowed
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
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
}

// ===== Fixed Window Limiter =====

interface FixedWindowEntry {
  count: number;
  resetTime: number;
}

/**
 * Fixed window rate limiter
 *
 * Simple fixed time window rate limiting
 */
export class FixedWindowLimiter {
  private windows: Map<string, FixedWindowEntry> = new Map();
  private max: number;
  private windowMs: number;

  constructor(options: RateLimitOptions) {
    this.max = options.max;
    this.windowMs = options.windowMs;
  }

  /**
   * Check if a key is allowed
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
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
}): TokenBucketLimiter {
  return new TokenBucketLimiter(options);
}
