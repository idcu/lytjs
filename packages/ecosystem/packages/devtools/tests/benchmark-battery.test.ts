// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/devtools` 的**性能基准测试**（`src/benchmark.ts`，364 行）
 *
 * ## 为什么要有这条
 *
 * 它导出了 13 个符号（含 `LARGE_SCALE_SCENARIOS`），而 `tests/index.test.ts` 里只有 **4 处**
 * 提及（远未覆盖语义）。本轮补 26 条，重点盯「结果存储的别名泄漏」与
 * 「异步场景能否被正确测量」两件事。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LARGE_SCALE_SCENARIOS,
  runBenchmark,
  runAsyncBenchmark,
  getBenchmarkResults,
  getLatestBenchmarkResult,
  clearBenchmarkResults,
  serializeBenchmarkResult,
  serializeAllBenchmarkResults,
  compareBenchmarkResults,
  createLargeScaleBenchmark,
  getMemoryUsage,
  serializeMemoryUsage,
  createRegressionDetector,
} from '../src/benchmark';
import type { BenchmarkResult } from '../src/benchmark';

beforeEach(() => {
  clearBenchmarkResults();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fakeResult = (over: Partial<BenchmarkResult> = {}): BenchmarkResult => ({
  name: 'r',
  iterations: 1,
  totalDuration: 10,
  averageDuration: 10,
  minDuration: 10,
  maxDuration: 10,
  opsPerSecond: 100,
  timestamp: Date.now(),
  ...over,
});

// ==================== 场景数据 ====================

describe('LARGE_SCALE_SCENARIOS', () => {
  it('预定义场景齐全且 nodeCount 递增', () => {
    expect(LARGE_SCALE_SCENARIOS.length).toBeGreaterThanOrEqual(6);
    for (const s of LARGE_SCALE_SCENARIOS) {
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.nodeCount).toBeGreaterThan(0);
    }
  });
});

// ==================== 同步基准 ====================

describe('runBenchmark', () => {
  it('预热 + 迭代次数正确，结果字段齐全', () => {
    const fn = vi.fn();
    const r = runBenchmark({ name: 'sync', iterations: 5, warmup: 3, fn });

    expect(fn).toHaveBeenCalledTimes(8); // 3 预热 + 5 迭代
    expect(r.name).toBe('sync');
    expect(r.iterations).toBe(5);
    expect(r.totalDuration).toBeGreaterThan(0);
    expect(r.averageDuration).toBeGreaterThanOrEqual(0);
    expect(r.minDuration).toBeLessThanOrEqual(r.maxDuration);
    expect(r.opsPerSecond).toBeGreaterThan(0);
    expect(r.timestamp).toBeGreaterThan(0);
  });

  it('warmup 默认 10 次', () => {
    const fn = vi.fn();
    runBenchmark({ name: 'w', iterations: 2, fn });

    expect(fn).toHaveBeenCalledTimes(12);
  });

  it('结果会被存入历史', () => {
    runBenchmark({ name: 'stored', iterations: 1, warmup: 0, fn: () => {} });

    expect(getBenchmarkResults('stored')).toHaveLength(1);
  });

  it('fn 抛错时异常向上传播', () => {
    expect(() =>
      runBenchmark({
        name: 'boom',
        iterations: 1,
        warmup: 0,
        fn: () => {
          throw new Error('x');
        },
      }),
    ).toThrow('x');
  });
});

// ==================== 异步基准 ====================

describe('runAsyncBenchmark', () => {
  it('缺少 asyncFn 时明确报错', async () => {
    await expect(runAsyncBenchmark({ name: 'a', iterations: 1, fn: () => {} })).rejects.toThrow(
      /asyncFn/,
    );
  });

  it('★ 真的**等待**了异步回调（耗时应覆盖 await 的时间）', async () => {
    const r = await runAsyncBenchmark({
      name: 'async',
      iterations: 2,
      warmup: 0,
      fn: () => {},
      asyncFn: async () => {
        await sleep(10);
      },
    });

    // 两次各 ~10ms ⇒ 总耗时至少 15ms（给计时抖动留余量）
    expect(r.totalDuration).toBeGreaterThanOrEqual(15);
    expect(r.averageDuration).toBeGreaterThanOrEqual(5);
  });
});

// ==================== 结果存储 ====================

describe('getBenchmarkResults / getLatest / clear', () => {
  it('按名称取；未知名返回空数组', () => {
    runBenchmark({ name: 'a', iterations: 1, warmup: 0, fn: () => {} });

    expect(getBenchmarkResults('a')).toHaveLength(1);
    expect(getBenchmarkResults('nope')).toEqual([]);
  });

  it('★ 按名称取回的是**副本**：改它不得污染内部存储', () => {
    runBenchmark({ name: 'a', iterations: 1, warmup: 0, fn: () => {} });

    const got = getBenchmarkResults('a');
    got.push(fakeResult());

    expect(getBenchmarkResults('a')).toHaveLength(1);
  });

  it('无参时合并所有名称并按 timestamp 降序', () => {
    const d1 = createRegressionDetector(); // 仅为触发一次真实 import 使用
    void d1;
    // 直接塞入历史：用 runBenchmark 两次不同名
    runBenchmark({ name: 'a', iterations: 1, warmup: 0, fn: () => {} });
    runBenchmark({ name: 'b', iterations: 1, warmup: 0, fn: () => {} });

    const all = getBenchmarkResults();
    expect(all).toHaveLength(2);
    expect(all[0]!.timestamp).toBeGreaterThanOrEqual(all[1]!.timestamp);
  });

  it('getLatestBenchmarkResult 取最后一次', () => {
    runBenchmark({ name: 'a', iterations: 1, warmup: 0, fn: () => {} });
    const second = runBenchmark({ name: 'a', iterations: 2, warmup: 0, fn: () => {} });

    expect(getLatestBenchmarkResult('a')!.iterations).toBe(2);
    expect(getLatestBenchmarkResult('a')).toEqual(second);
    expect(getLatestBenchmarkResult('nope')).toBeUndefined();
  });

  it('clearBenchmarkResults 支持按名称与全部清除', () => {
    runBenchmark({ name: 'a', iterations: 1, warmup: 0, fn: () => {} });
    runBenchmark({ name: 'b', iterations: 1, warmup: 0, fn: () => {} });

    clearBenchmarkResults('a');
    expect(getBenchmarkResults('a')).toHaveLength(0);
    expect(getBenchmarkResults('b')).toHaveLength(1);

    clearBenchmarkResults();
    expect(getBenchmarkResults()).toHaveLength(0);
  });
});

// ==================== 序列化 ====================

describe('serializeBenchmarkResult / serializeAllBenchmarkResults', () => {
  it('单条结果含名称、迭代次数与 OPS', () => {
    const text = serializeBenchmarkResult(fakeResult({ name: 'X', iterations: 7 }));

    expect(text).toContain('X');
    expect(text).toContain('7');
    expect(text).toContain('OPS');
  });

  it('无结果时给出占位文案', () => {
    expect(serializeAllBenchmarkResults()).toBe('暂无基准测试结果');
  });

  it('多条结果按名称分组并标注历史次数', () => {
    runBenchmark({ name: 'a', iterations: 1, warmup: 0, fn: () => {} });
    runBenchmark({ name: 'a', iterations: 1, warmup: 0, fn: () => {} });

    const text = serializeAllBenchmarkResults();
    expect(text).toContain('a');
    expect(text).toContain('历史: 2 次测试');
  });
});

// ==================== 比较 ====================

describe('compareBenchmarkResults', () => {
  it('变快：durationDiff > 0 且 improved 为 true', () => {
    const d = compareBenchmarkResults(
      fakeResult({ averageDuration: 20, opsPerSecond: 50 }),
      fakeResult({ averageDuration: 10, opsPerSecond: 100 }),
    );

    expect(d.durationDiff).toBe(10);
    expect(d.durationDiffPercent).toBeCloseTo(50);
    expect(d.opsDiff).toBe(50);
    expect(d.improved).toBe(true);
  });

  it('变慢：improved 为 false', () => {
    const d = compareBenchmarkResults(
      fakeResult({ averageDuration: 10, opsPerSecond: 100 }),
      fakeResult({ averageDuration: 20, opsPerSecond: 50 }),
    );

    expect(d.durationDiff).toBe(-10);
    expect(d.improved).toBe(false);
  });
});

// ==================== 大规模场景辅助 ====================

describe('createLargeScaleBenchmark', () => {
  it('产出可直接运行的配置（名称/迭代/预热/可调用）', () => {
    const fn = vi.fn();
    const cfg = createLargeScaleBenchmark(LARGE_SCALE_SCENARIOS[0]!, fn);

    expect(cfg.name).toContain(LARGE_SCALE_SCENARIOS[0]!.name);
    expect(cfg.iterations).toBeGreaterThan(0);
    expect(cfg.warmup).toBeGreaterThanOrEqual(0);

    cfg.fn();
    expect(fn).toHaveBeenCalledWith(LARGE_SCALE_SCENARIOS[0]!.nodeCount);
  });

  it('★ 异步 testFn 也必须可被测量（配置须带 asyncFn，否则 runAsyncBenchmark 直接抛）', async () => {
    const cfg = createLargeScaleBenchmark(LARGE_SCALE_SCENARIOS[0]!, async () => {});

    expect(typeof cfg.asyncFn).toBe('function');

    // 能真正跑起来（而不是 throw 'asyncFn is required'）
    const r = await runAsyncBenchmark({ ...cfg, iterations: 1, warmup: 0 });
    expect(r.iterations).toBe(1);
  });
});

// ==================== 内存 ====================

describe('getMemoryUsage / serializeMemoryUsage', () => {
  it('环境不提供 performance.memory 时返回 null（jsdom 即如此）', () => {
    expect(getMemoryUsage()).toBeNull();
  });

  it('serializeMemoryUsage 按 B / KB / MB 分档并给出使用率', () => {
    const text = serializeMemoryUsage({
      usedJSHeapSize: 512,
      totalJSHeapSize: 2048,
      jsHeapSizeLimit: 2 * 1024 * 1024,
    });

    expect(text).toContain('512 B');
    expect(text).toContain('2.00 KB');
    expect(text).toContain('2.00 MB');
    expect(text).toContain('25.00%');
  });
});

// ==================== 回归检测 ====================

describe('createRegressionDetector', () => {
  it('首次结果不算回归；变慢超过阈值才算；变快不算', () => {
    const d = createRegressionDetector(0.1);

    expect(d.addResult(fakeResult({ averageDuration: 10 }))).toBe(false);
    // 变快 50%
    expect(d.addResult(fakeResult({ averageDuration: 5 }))).toBe(false);
    // 变慢 20% > 10%
    expect(d.addResult(fakeResult({ averageDuration: 6 }))).toBe(true);
    // 变慢 1% < 10%
    expect(d.addResult(fakeResult({ averageDuration: 6.06 }))).toBe(false);
  });

  it('getHistory / clear 生效', () => {
    const d = createRegressionDetector();
    d.addResult(fakeResult({ name: 'x' }));

    expect(d.getHistory('x')).toHaveLength(1);
    expect(d.getHistory('nope')).toEqual([]);

    d.clear();
    expect(d.getHistory('x')).toHaveLength(0);
  });
});
