/**
 * common/memory 覆盖率电池（Task C）：补齐 ObjectPool / MemoryLeakDetector / estimateObjectSize 等分支
 */
import { describe, it, expect } from 'vitest';
import {
  ObjectPool,
  MemoryLeakDetector,
  MemoryPressureMonitor,
  getMemoryLeakDetector,
  startMemoryLeakDetection,
  stopMemoryLeakDetection,
  trackObject,
  releaseObject,
  estimateObjectSize,
  forceGC,
} from '../src/index';

describe('memory battery: ObjectPool', () => {
  it('acquire miss→create, release→hit, release(null) early-return', () => {
    let created = 0;
    const pool = new ObjectPool<{ id: number }>({
      maxSize: 10,
      create: () => ({ id: ++created }),
      reset: (o) => {
        o.id = 0;
      },
      validate: () => true,
      warmupSize: 2,
    });
    const a = pool.acquire();
    expect(a).toBeDefined();
    pool.release(a);
    const b = pool.acquire(); // hit
    expect(b).toBeDefined();
    // release(null) 触发早返回分支

    pool.release(null as any);
    pool.releaseMany([{ id: 1 }, { id: 2 }]);
    const stats = pool.getStats();
    expect(stats.hitRate).toBeDefined();
  });

  it('resize shrinks the pool', () => {
    const pool = new ObjectPool<object>({ maxSize: 20, create: () => ({}) });
    for (let i = 0; i < 10; i++) pool.release({});
    pool.resize(3);
    expect(pool.getStats().poolSize).toBeLessThanOrEqual(3);
    pool.clear();
  });
});

describe('memory battery: MemoryLeakDetector', () => {
  it('tracks, reports leaks, releases and clears', () => {
    const detector = new MemoryLeakDetector({
      checkInterval: 100000,
      warningThreshold: 0,
      captureStackTrace: true,
    });
    detector.track('Widget', {});
    detector.track('Widget', {});
    detector.track('Widget', {});
    const report = detector.generateReport();
    expect(report).toBeDefined();
    detector.release('Widget');
    detector.release('Unknown'); // 未跟踪类型
    detector.generateReport();
    detector.stop();
    detector.clear();
  });

  it('start/stop via module helpers', () => {
    startMemoryLeakDetection({ checkInterval: 100000 });
    trackObject('Thing', {});
    releaseObject('Thing');
    stopMemoryLeakDetection();
    const d = getMemoryLeakDetector();
    expect(d).toBeInstanceOf(MemoryLeakDetector);
  });
});

describe('memory battery: estimateObjectSize', () => {
  it('estimates primitives, objects, arrays, functions and circular refs', () => {
    expect(estimateObjectSize(null)).toBe(0);
    expect(estimateObjectSize(undefined)).toBe(0);
    expect(estimateObjectSize(true)).toBeGreaterThan(0);
    expect(estimateObjectSize(42)).toBeGreaterThan(0);
    expect(estimateObjectSize('hello')).toBeGreaterThan(0);
    expect(estimateObjectSize(Symbol('s'))).toBe(0);
    expect(estimateObjectSize({ a: 1, b: 'x' })).toBeGreaterThan(0);
    expect(estimateObjectSize([1, 2, 3])).toBeGreaterThan(0);
    expect(estimateObjectSize(() => 1)).toBeGreaterThan(0);
    // 循环引用不应无限递归
    const c: Record<string, unknown> = {};
    c.self = c;
    expect(estimateObjectSize(c)).toBeGreaterThanOrEqual(0);
  });

  it('forceGC does not throw', () => {
    expect(() => forceGC()).not.toThrow();
  });
});

describe('memory battery: MemoryPressureMonitor', () => {
  it('starts, registers and removes pressure callbacks', () => {
    const monitor = new MemoryPressureMonitor(80);
    const off = monitor.onHighPressure(() => {});
    monitor.start(100000);
    expect(typeof off).toBe('function');
    off();
    monitor.stop();
  });
});
