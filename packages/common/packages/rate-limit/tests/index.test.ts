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
});
