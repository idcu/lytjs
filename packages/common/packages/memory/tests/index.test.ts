/**
 * @lytjs/common-memory - Tests
 *
 * FIX: P6.4-MEMORY-01 - v6.4 Memory optimization tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ObjectPool,
  MemoryLeakDetector,
  trackObject,
  releaseObject,
  startMemoryLeakDetection,
  stopMemoryLeakDetection,
  estimateObjectSize,
} from '../src';

describe('ObjectPool', () => {
  it('should create an object pool', () => {
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 10,
      create: () => ({ id: 0 }),
      reset: (obj) => {
        obj.id = 0;
      },
    });

    expect(pool).toBeDefined();
  });

  it('should acquire and release objects', () => {
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 10,
      create: () => ({ id: 0 }),
      reset: (obj) => {
        obj.id = 0;
      },
    });

    const obj1 = pool.acquire();
    obj1.id = 42;
    pool.release(obj1);

    const obj2 = pool.acquire();
    expect(obj2.id).toBe(0); // Should be reset
  });

  it('should track statistics', () => {
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 10,
      create: () => ({ id: 0 }),
      reset: (obj) => {
        obj.id = 0;
      },
    });

    pool.acquire();
    pool.acquire();
    pool.release({ id: 1 });

    const stats = pool.getStats();
    expect(stats.totalCreated).toBeGreaterThan(0);
  });

  it('should warm up the pool', () => {
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 10,
      create: () => ({ id: 0 }),
      reset: (obj) => {
        obj.id = 0;
      },
      warmupSize: 5,
    });

    const stats = pool.getStats();
    expect(stats.poolSize).toBe(5);
  });

  it('should resize the pool', () => {
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 10,
      create: () => ({ id: 0 }),
      reset: (obj) => {
        obj.id = 0;
      },
    });

    pool.resize(5);
    for (let i = 0; i < 10; i++) {
      pool.release({ id: i });
    }

    const stats = pool.getStats();
    expect(stats.poolSize).toBeLessThanOrEqual(5);
  });

  it('should clear the pool', () => {
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 10,
      create: () => ({ id: 0 }),
      reset: (obj) => {
        obj.id = 0;
      },
      warmupSize: 5,
    });

    pool.clear();
    const stats = pool.getStats();
    expect(stats.poolSize).toBe(0);
  });

  it('should release multiple objects', () => {
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 10,
      create: () => ({ id: 0 }),
      reset: (obj) => {
        obj.id = 0;
      },
    });

    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];

    pool.releaseMany(objects);
    const stats = pool.getStats();
    expect(stats.poolSize).toBe(3);
  });
});

describe('MemoryLeakDetector', () => {
  it('should create a leak detector', () => {
    const detector = new MemoryLeakDetector({
      checkInterval: 1000,
      warningThreshold: 10,
    });

    expect(detector).toBeDefined();
  });

  it('should track object allocations', () => {
    const detector = new MemoryLeakDetector({
      checkInterval: 1000,
      warningThreshold: 10,
    });
    detector.start();

    for (let i = 0; i < 5; i++) {
      detector.track('test-object', { id: i });
    }

    const report = detector.generateReport();
    expect(report.totalTracked).toBeGreaterThan(0);
    detector.stop();
  });

  it('should track releases', () => {
    const detector = new MemoryLeakDetector({
      checkInterval: 1000,
      warningThreshold: 10,
    });
    detector.start();

    for (let i = 0; i < 5; i++) {
      detector.track('test-object', { id: i });
    }

    for (let i = 0; i < 3; i++) {
      detector.release('test-object');
    }

    const report = detector.generateReport();
    expect(report.totalTracked).toBe(2);
    detector.stop();
  });

  it('should generate a report', () => {
    const detector = new MemoryLeakDetector({
      checkInterval: 1000,
      warningThreshold: 10,
    });

    detector.track('test-object', { id: 1 });
    detector.track('test-object', { id: 2 });

    const report = detector.generateReport();
    expect(report.timestamp).toBeDefined();
    expect(report.totalTracked).toBeDefined();
  });

  it('should clear tracking data', () => {
    const detector = new MemoryLeakDetector({
      checkInterval: 1000,
      warningThreshold: 10,
    });

    detector.track('test-object', { id: 1 });
    detector.clear();

    const report = detector.generateReport();
    expect(report.totalTracked).toBe(0);
  });
});

describe('Global tracking functions', () => {
  beforeEach(() => {
    // Reset global state
    vi.restoreAllMocks();
  });

  it('should track and release objects', () => {
    // These should not throw
    trackObject('test-global', { id: 1 });
    releaseObject('test-global');
  });

  it('should start and stop detection', () => {
    // These should not throw
    startMemoryLeakDetection();
    stopMemoryLeakDetection();
  });
});

describe('estimateObjectSize', () => {
  it('should estimate size of simple objects', () => {
    const size = estimateObjectSize({ a: 1, b: 'test' });
    expect(size).toBeGreaterThan(0);
  });

  it('should estimate size of arrays', () => {
    const size = estimateObjectSize([1, 2, 3, 4, 5]);
    expect(size).toBeGreaterThan(0);
  });

  it('should handle nested objects', () => {
    const size = estimateObjectSize({
      a: { b: { c: 'nested' } },
      d: [1, 2, 3],
    });
    expect(size).toBeGreaterThan(0);
  });

  it('should handle primitives', () => {
    expect(estimateObjectSize('string')).toBeGreaterThan(0);
    expect(estimateObjectSize(42)).toBeGreaterThan(0);
    expect(estimateObjectSize(true)).toBeGreaterThan(0);
    expect(estimateObjectSize(null)).toBe(0);
    expect(estimateObjectSize(undefined)).toBe(0);
  });
});
