/**
 * @lytjs/common-rate-limit tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  SlidingWindowLimiter,
  FixedWindowLimiter,
  TokenBucketLimiter,
  createRateLimiter,
  createFixedWindowLimiter,
  createTokenBucketLimiter,
} from '../src';

describe('@lytjs/common-rate-limit', () => {
  describe('SlidingWindowLimiter', () => {
    it('should create and allow requests within limit', () => {
      const limiter = new SlidingWindowLimiter({ max: 3, windowMs: 1000 });

      const result1 = limiter.check('test-key');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = limiter.check('test-key');
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = limiter.check('test-key');
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should reject requests over limit', () => {
      const limiter = new SlidingWindowLimiter({ max: 2, windowMs: 1000 });

      limiter.check('test-key');
      limiter.check('test-key');
      const result = limiter.check('test-key');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset the limit for a key', () => {
      const limiter = new SlidingWindowLimiter({ max: 2, windowMs: 1000 });

      limiter.check('test-key');
      limiter.check('test-key');
      limiter.reset('test-key');

      const result = limiter.check('test-key');
      expect(result.allowed).toBe(true);
    });

    it('should clear all limits', () => {
      const limiter = new SlidingWindowLimiter({ max: 2, windowMs: 1000 });

      limiter.check('key1');
      limiter.check('key2');
      limiter.clear();

      const result1 = limiter.check('key1');
      const result2 = limiter.check('key2');
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('FixedWindowLimiter', () => {
    it('should create and allow requests within limit', () => {
      const limiter = new FixedWindowLimiter({ max: 3, windowMs: 1000 });

      const result1 = limiter.check('test-key');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
    });

    it('should reject requests over limit', () => {
      const limiter = new FixedWindowLimiter({ max: 2, windowMs: 1000 });

      limiter.check('test-key');
      limiter.check('test-key');
      const result = limiter.check('test-key');

      expect(result.allowed).toBe(false);
    });
  });

  describe('TokenBucketLimiter', () => {
    it('should create and allow requests while tokens available', () => {
      const limiter = new TokenBucketLimiter({
        capacity: 3,
        refillRate: 1,
        refillTime: 1000,
      });

      const result1 = limiter.check('test-key');
      expect(result1.allowed).toBe(true);
    });

    it('should reject requests when no tokens', () => {
      const limiter = new TokenBucketLimiter({
        capacity: 2,
        refillRate: 1,
        refillTime: 1000,
      });

      limiter.check('test-key');
      limiter.check('test-key');
      const result = limiter.check('test-key');

      expect(result.allowed).toBe(false);
    });
  });

  describe('Factory functions', () => {
    it('createRateLimiter should create a SlidingWindowLimiter', () => {
      const limiter = createRateLimiter({ max: 5, windowMs: 1000 });
      expect(limiter).toBeInstanceOf(SlidingWindowLimiter);
    });

    it('createFixedWindowLimiter should create a FixedWindowLimiter', () => {
      const limiter = createFixedWindowLimiter({ max: 5, windowMs: 1000 });
      expect(limiter).toBeInstanceOf(FixedWindowLimiter);
    });

    it('createTokenBucketLimiter should create a TokenBucketLimiter', () => {
      const limiter = createTokenBucketLimiter({
        capacity: 5,
        refillRate: 1,
        refillTime: 1000,
      });
      expect(limiter).toBeInstanceOf(TokenBucketLimiter);
    });
  });

  // ============================================================
  // P1-3 回归（2026-10-10）
  // ============================================================
  describe('P1-3：SlidingWindowLimiter 必须是真滑动窗口', () => {
    it('窗口边界处不得出现「两倍突发」（原实现是 epoch 网格对齐的固定窗口）', () => {
      vi.useFakeTimers();
      const limiter = new SlidingWindowLimiter({ max: 2, windowMs: 1000 });

      vi.setSystemTime(990);
      expect(limiter.check('k').allowed).toBe(true);
      vi.setSystemTime(995);
      expect(limiter.check('k').allowed).toBe(true);
      // ⚠️ 原实现：t=1000 恰好跨到下一个 epoch 网格窗口 ⇒ 计数被清零 ⇒ 放行
      //    于是 10ms 内实际放行了 3 次（max=2）—— 边界两倍突发。
      vi.setSystemTime(1000);
      expect(limiter.check('k').allowed).toBe(false);

      vi.useRealTimers();
    });

    it('请求滑出窗口后名额应自动恢复', () => {
      vi.useFakeTimers();
      const limiter = new SlidingWindowLimiter({ max: 1, windowMs: 1000 });

      vi.setSystemTime(10_000);
      expect(limiter.check('k').allowed).toBe(true);
      vi.setSystemTime(10_500);
      expect(limiter.check('k').allowed).toBe(false);
      vi.setSystemTime(11_001);
      expect(limiter.check('k').allowed).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('P1-3：跟踪表必须有界（原实现 Map 只增不减 ⇒ 内存泄漏）', () => {
    it('SlidingWindowLimiter：键数量不超过 maxKeys（LRU 淘汰）', () => {
      const limiter = new SlidingWindowLimiter({ max: 5, windowMs: 60_000, maxKeys: 10 });
      for (let i = 0; i < 100; i++) limiter.check(`key-${i}`);
      expect(limiter.size).toBeLessThanOrEqual(10);
    });

    it('SlidingWindowLimiter：整窗口内已无记录的键会被清扫回收', () => {
      vi.useFakeTimers();
      const limiter = new SlidingWindowLimiter({ max: 2, windowMs: 1000, maxKeys: 0 });

      vi.setSystemTime(0);
      limiter.check('a');
      limiter.check('b');
      expect(limiter.size).toBe(2);

      // 远超一个窗口后再来请求 ⇒ 触发清扫，a / b 的记录已全部过期
      vi.setSystemTime(5000);
      limiter.check('c');
      expect(limiter.size).toBe(1);

      vi.useRealTimers();
    });

    it('FixedWindowLimiter / TokenBucketLimiter 同样有界', () => {
      const fixed = new FixedWindowLimiter({ max: 5, windowMs: 60_000, maxKeys: 7 });
      for (let i = 0; i < 100; i++) fixed.check(`key-${i}`);
      expect(fixed.size).toBeLessThanOrEqual(7);

      const bucket = new TokenBucketLimiter({
        capacity: 5,
        refillRate: 1,
        refillTime: 1000,
        maxKeys: 4,
      });
      for (let i = 0; i < 100; i++) bucket.check(`key-${i}`);
      expect(bucket.size).toBeLessThanOrEqual(4);
    });
  });
});
