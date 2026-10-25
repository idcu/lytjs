// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/devtools` 性能监控的**生命周期契约**
 * （`src/performance.ts` 的 `initPerformanceMonitor` / `resetPerformanceMonitor` /
 * `recordMetric` 三者）
 *
 * ## 为什么要有这条
 *
 * 既有的 `performance-battery.test.ts` 覆盖了「记录 → 统计 → 告警 → 报告」这条主干，
 * 但**初始化与重置本身**只断言了「清空了数据」，没断言「配置是否还原」「采集是否关停」。
 * 三处静默失效因此长期潜伏：
 *
 * 1. **`resetPerformanceMonitor()` 不重置 `options`** —— 名字叫 reset，只重置了一半：
 *    `maxRecords` / `sampleRate` / `longTaskThreshold` 全部沿用上一轮 ⇒ 重置后仍被旧配置约束。
 * 2. **重复 `initPerformanceMonitor()` 叠加 `PerformanceObserver`** —— 创建后不保留引用，
 *    于是改配置 / HMR / 多次挂载 devtools 会让同一个长任务被记录 N 次，统计与告警成倍虚高；
 *    且 `reset()` 关不掉它们，模块"已重置"却仍在后台往清空后的 `metrics` 写入。
 * 3. **`recordMetric()` 未入库时返回空壳** `{ id: '', timestamp: 0, ... }` ——
 *    调用方 `if (result)` 永远为真，`result.timestamp` 是 1970，
 *    「从记录时刻算起」的任何耗时都会算成天文数字。
 *
 * ## 手法
 *
 * 模块持模块级状态 ⇒ 每个用例前 `resetPerformanceMonitor()` 重建；
 * 观察器用**假 `PerformanceObserver`** 替身（jsdom 无原生实现），
 * 既数「创建了几份」，也数「断开了几份」，最后用**行为**（发一条 longtask 看入几条指标）收口
 * —— 内部计数只是证据，用户可见的翻倍才是判据。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initPerformanceMonitor,
  resetPerformanceMonitor,
  recordMetric,
  getMetrics,
  startTimer,
} from '../src/performance';

/** 假观察器：登记实例、记录 observe 的类型、统计 disconnect */
class FakePerformanceObserver {
  static instances: FakePerformanceObserver[] = [];
  static disconnectCount = 0;

  callback: (list: { getEntries: () => unknown[] }) => void;
  observedTypes: string[] = [];
  disconnected = false;

  constructor(callback: (list: { getEntries: () => unknown[] }) => void) {
    this.callback = callback;
    FakePerformanceObserver.instances.push(this);
  }

  observe(opts: { type?: string }): void {
    this.observedTypes.push(opts?.type ?? '');
  }

  disconnect(): void {
    if (this.disconnected) return;
    this.disconnected = true;
    FakePerformanceObserver.disconnectCount += 1;
  }

  takeRecords(): unknown[] {
    return [];
  }

  /** 测试驱动：模拟浏览器投递一批 entry */
  emit(entries: unknown[]): void {
    this.callback({ getEntries: () => entries });
  }
}

/** 仍处于连接状态、且订阅了指定类型的观察器 */
const liveOf = (type: string) =>
  FakePerformanceObserver.instances.filter(
    (o) => !o.disconnected && o.observedTypes.includes(type),
  );

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  FakePerformanceObserver.instances = [];
  FakePerformanceObserver.disconnectCount = 0;
  vi.stubGlobal('PerformanceObserver', FakePerformanceObserver);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  resetPerformanceMonitor();
});

afterEach(() => {
  resetPerformanceMonitor();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ==================== recordMetric 的返回值 ====================

describe('recordMetric 的返回值就是「是否入库」的判据', () => {
  it('正常记录：返回带非空 id 与真实时间戳的记录', () => {
    initPerformanceMonitor({ autoRecordPageMetrics: false, autoRecordLongTasks: false });

    const before = Date.now();
    const result = recordMetric({ name: 'x', type: 'render', duration: 12 });

    expect(result).not.toBeNull();
    expect(result!.id).not.toBe('');
    expect(result!.timestamp).toBeGreaterThanOrEqual(before);
    expect(getMetrics()).toHaveLength(1);
  });

  it('enabled:false ⇒ 返回 null（而不是 id 为空串、timestamp 为 0 的空壳）', () => {
    initPerformanceMonitor({ enabled: false });

    const result = recordMetric({ name: 'x', type: 'render', duration: 12 });

    expect(result).toBeNull();
    expect(getMetrics()).toHaveLength(0);
  });

  it('被 sampleRate 丢弃 ⇒ 返回 null', () => {
    initPerformanceMonitor({
      sampleRate: 0,
      autoRecordPageMetrics: false,
      autoRecordLongTasks: false,
    });

    expect(recordMetric({ name: 'x', type: 'render', duration: 12 })).toBeNull();
    expect(getMetrics()).toHaveLength(0);
  });

  it('startTimer 的收尾仍会入库（返回值改动不影响内部调用点）', () => {
    initPerformanceMonitor({ autoRecordPageMetrics: false, autoRecordLongTasks: false });

    startTimer('t')();

    expect(getMetrics().map((m) => m.name)).toEqual(['t']);
  });
});

// ==================== reset 必须还原配置 ====================

describe('resetPerformanceMonitor 真的恢复到出厂状态', () => {
  // ⚠️ 这几条**故意不在 reset 之后再调 `initPerformanceMonitor()`** ——
  //   `init` 自身就会把 `options` 重置成 `{ ...DEFAULT, ...opts }`，
  //   一旦补上 init，被测的「reset 是否还原配置」就被 init 的行为掩盖，
  //   回退源码也照样绿（本文件初稿即踩过：三条用例对旧代码全绿，等于没守卫）。

  it('maxRecords 被还原：上一轮限 2 条，重置后不再截断', () => {
    initPerformanceMonitor({
      maxRecords: 2,
      autoRecordPageMetrics: false,
      autoRecordLongTasks: false,
    });
    for (let i = 1; i <= 3; i++) recordMetric({ name: `m${i}`, type: 'render', duration: i });
    expect(getMetrics()).toHaveLength(2);

    resetPerformanceMonitor();

    for (let i = 1; i <= 3; i++) recordMetric({ name: `n${i}`, type: 'render', duration: i });
    expect(getMetrics()).toHaveLength(3);
  });

  it('sampleRate 被还原为默认 1：上一轮全丢弃，重置后全部记录', () => {
    initPerformanceMonitor({
      sampleRate: 0,
      autoRecordPageMetrics: false,
      autoRecordLongTasks: false,
    });
    expect(recordMetric({ name: 'a', type: 'render', duration: 1 })).toBeNull();

    resetPerformanceMonitor();

    expect(recordMetric({ name: 'b', type: 'render', duration: 1 })).not.toBeNull();
    expect(getMetrics().map((m) => m.name)).toEqual(['b']);
  });

  it('enabled 被还原为默认 true：禁用后 reset，记录重新生效', () => {
    initPerformanceMonitor({ enabled: false });
    expect(recordMetric({ name: 'a', type: 'render', duration: 1 })).toBeNull();

    resetPerformanceMonitor();

    expect(recordMetric({ name: 'b', type: 'render', duration: 1 })).not.toBeNull();
    expect(getMetrics().map((m) => m.name)).toEqual(['b']);
  });

  it('重置后不残留告警冷却：同一规则可立即再次告警', () => {
    initPerformanceMonitor({ autoRecordPageMetrics: false, autoRecordLongTasks: false });
    recordMetric({ name: 'a', type: 'render', duration: 200 });
    const firstRound = warnSpy.mock.calls.length;
    expect(firstRound).toBeGreaterThan(0);

    resetPerformanceMonitor();
    initPerformanceMonitor({ autoRecordPageMetrics: false, autoRecordLongTasks: false });
    recordMetric({ name: 'b', type: 'render', duration: 200 });

    // 若冷却残留，第二轮会被 long_task_warning 的 5000ms 冷却挡住 ⇒ 计数不增
    expect(warnSpy.mock.calls.length).toBeGreaterThan(firstRound);
  });
});

// ==================== 观察器不得叠加 ====================

describe('重复初始化不叠加自动采集', () => {
  it('init 两次 ⇒ 只保留一份 paint / first-input / longtask 观察器', () => {
    initPerformanceMonitor();
    expect(FakePerformanceObserver.instances).toHaveLength(3);

    initPerformanceMonitor();

    // 新的一轮仍然只建 3 份，旧的 3 份被断开
    expect(FakePerformanceObserver.instances).toHaveLength(6);
    expect(FakePerformanceObserver.disconnectCount).toBe(3);
    expect(liveOf('paint')).toHaveLength(1);
    expect(liveOf('first-input')).toHaveLength(1);
    expect(liveOf('longtask')).toHaveLength(1);
  });

  it('★ 用户可见后果：init 两次后，一个长任务只入库一次（而非两次）', () => {
    initPerformanceMonitor();
    initPerformanceMonitor();

    const longTaskObservers = liveOf('longtask');
    expect(longTaskObservers).toHaveLength(1);

    longTaskObservers[0]!.emit([{ entryType: 'longtask', duration: 80 }]);

    expect(getMetrics().filter((m) => m.name === 'Long Task')).toHaveLength(1);
  });

  it('reset 会断开全部观察器：重置后不再后台采集', () => {
    initPerformanceMonitor();
    expect(liveOf('longtask')).toHaveLength(1);

    resetPerformanceMonitor();

    expect(liveOf('longtask')).toHaveLength(0);
    expect(liveOf('paint')).toHaveLength(0);
    expect(FakePerformanceObserver.disconnectCount).toBe(3);
  });

  it('关掉自动采集开关时不注册任何观察器', () => {
    initPerformanceMonitor({ autoRecordPageMetrics: false, autoRecordLongTasks: false });

    expect(FakePerformanceObserver.instances).toHaveLength(0);
  });

  it('观察器构造抛错不向外冒泡，降级为一条警告', () => {
    class ThrowingObserver {
      constructor() {
        throw new Error('observe not supported');
      }
    }
    vi.stubGlobal('PerformanceObserver', ThrowingObserver);

    expect(() => initPerformanceMonitor()).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    expect(getMetrics()).toHaveLength(0);
  });
});
