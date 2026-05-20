/**
 * Performance Regression Testing
 *
 * Benchmark comparison for v6.4 performance optimizations
 *
 * FIX: P6.4-TEST-01 - Test infrastructure
 */

import { bench, describe } from 'vitest';
import { ObjectPool } from '../../packages/common/packages/memory/src';

describe('Memory Optimization Benchmarks', () => {
  bench('ObjectPool: Acquire/Release (v6.4)', () => {
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 1000,
      create: () => ({ id: 0 }),
      reset: (obj) => {
        obj.id = 0;
      },
      warmupSize: 500,
    });

    for (let i = 0; i < 1000; i++) {
      const obj = pool.acquire();
      obj.id = i;
      pool.release(obj);
    }
  });

  bench('ObjectPool: Batch operations', () => {
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 1000,
      create: () => ({ id: 0 }),
      reset: (obj) => {
        obj.id = 0;
      },
    });

    const objects = [];
    for (let i = 0; i < 100; i++) {
      objects.push(pool.acquire());
    }
    pool.releaseMany(objects);
  });
});
