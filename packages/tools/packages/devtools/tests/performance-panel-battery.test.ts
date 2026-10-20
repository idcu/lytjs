/**
 * 行为级判据：`@lytjs/devtools-extension` 的**性能面板**（`src/panel/performance.ts`，614 行）
 *
 * ## 为什么要有这条
 *
 * 该文件此前**一条判据都没有**（实测 0% 覆盖、351 条语句）。它负责渲染耗时统计、慢渲染识别、
 * 渲染热力图、时间线、内存趋势与 GC 提示。这类"统计"逻辑出错时**不会报错**，
 * 只是面板上的数字悄悄变成错的（甚至把慢渲染算进错误率）。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordComponentRender,
  getComponentPerformance,
  getAllComponentPerformance,
  clearComponentPerformance,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  isPerformanceMonitoring,
  getRenderHeatmap,
  getPerformanceTimeline,
  getPerformanceTimelineSummary,
  clearPerformanceTimeline,
  getMemoryTrend,
  suggestGarbageCollection,
  updatePerformanceConfig,
  getPerformanceConfig,
  performanceConfig,
  performanceTimeline,
} from '../src/panel/performance';
import { getEvents, clearEvents } from '../src/events';
import { onPanelMessage } from '../src/bridge';

beforeEach(() => {
  stopPerformanceMonitoring();
  clearComponentPerformance();
  clearPerformanceTimeline();
  clearEvents();
  updatePerformanceConfig({
    maxRenderHistory: 50,
    slowRenderThreshold: 16,
    timelineMaxSize: 100,
    updateInterval: 1000,
  });
});

afterEach(() => {
  stopPerformanceMonitoring();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** 打开监控（记录渲染的前提） */
const monitoring = (): void => {
  startPerformanceMonitoring();
};

// ==================== 渲染记录 ====================

describe('recordComponentRender', () => {
  it('未开启监控时**不记录**', () => {
    recordComponentRender('c1', 'Comp', 5);

    expect(getComponentPerformance('c1')).toBeUndefined();
  });

  it('首次渲染建立统计（min = max = avg = 本次耗时）', () => {
    monitoring();
    recordComponentRender('c1', 'Comp', 8);

    expect(getComponentPerformance('c1')).toMatchObject({
      componentId: 'c1',
      componentName: 'Comp',
      renderCount: 1,
      totalRenderTime: 8,
      averageRenderTime: 8,
      minRenderTime: 8,
      maxRenderTime: 8,
      lastRenderTime: 8,
    });
  });

  it('后续渲染累加并更新 min / max / avg', () => {
    monitoring();
    recordComponentRender('c1', 'Comp', 10);
    recordComponentRender('c1', 'Comp', 30);
    recordComponentRender('c1', 'Comp', 5);

    const p = getComponentPerformance('c1')!;
    expect(p.renderCount).toBe(3);
    expect(p.totalRenderTime).toBe(45);
    expect(p.averageRenderTime).toBe(15);
    expect(p.minRenderTime).toBe(5);
    expect(p.maxRenderTime).toBe(30);
    expect(p.lastRenderTime).toBe(5);
  });

  it('renderTimes 只保留最近 maxRenderHistory 条', () => {
    updatePerformanceConfig({ maxRenderHistory: 3 });
    monitoring();
    for (const t of [1, 2, 3, 4, 5]) recordComponentRender('c1', 'Comp', t);

    expect(getComponentPerformance('c1')!.renderTimes).toEqual([3, 4, 5]);
  });

  it('★ 慢渲染必须记为**性能事件**，不能冒充错误事件', () => {
    updatePerformanceConfig({ slowRenderThreshold: 16 });
    monitoring();

    recordComponentRender('c1', 'SlowComp', 50);

    const events = getEvents();
    expect(events).toHaveLength(1);
    // 原实现写的是 `recordEvent('error:captured', { type: 'slow-render', … })`
    // ⇒ 慢渲染被算进**错误率**，且 `formatEventDescription` 读 `payload.message` 得到 "Error: Unknown"
    expect(events[0]!.type).toBe('performance:slow-render');
  });

  it('未超过阈值的渲染不产生事件', () => {
    updatePerformanceConfig({ slowRenderThreshold: 16 });
    monitoring();

    recordComponentRender('c1', 'Fast', 5);

    expect(getEvents()).toHaveLength(0);
  });

  it('updateFrequency 随渲染次数升级', () => {
    monitoring();
    recordComponentRender('c1', 'Comp', 1);
    expect(getComponentPerformance('c1')!.updateFrequency).toBe('low');

    for (let i = 0; i < 20; i++) recordComponentRender('c1', 'Comp', 1);
    expect(['high', 'extreme']).toContain(getComponentPerformance('c1')!.updateFrequency);
  });

  it('getAllComponentPerformance / clearComponentPerformance', () => {
    monitoring();
    recordComponentRender('a', 'A', 1);
    recordComponentRender('b', 'B', 1);

    expect(getAllComponentPerformance()).toHaveLength(2);

    clearComponentPerformance();

    expect(getAllComponentPerformance()).toEqual([]);
  });
});

// ==================== 监控开关 ====================

describe('监控开关', () => {
  it('start / stop / isPerformanceMonitoring，且重复调用安全', () => {
    expect(isPerformanceMonitoring()).toBe(false);

    startPerformanceMonitoring();
    expect(isPerformanceMonitoring()).toBe(true);
    startPerformanceMonitoring(); // 幂等

    stopPerformanceMonitoring();
    expect(isPerformanceMonitoring()).toBe(false);
    expect(() => stopPerformanceMonitoring()).not.toThrow();
  });

  it('★ 按 updateInterval 周期采集时间线，并受 timelineMaxSize 限制', () => {
    vi.useFakeTimers();
    updatePerformanceConfig({ updateInterval: 1000, timelineMaxSize: 3 });
    monitoring();

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(1000);
    }

    const timeline = getPerformanceTimeline();
    expect(timeline.length).toBeLessThanOrEqual(3);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0]).toHaveProperty('metrics');
    expect(timeline[0]).toHaveProperty('slowRenders');
  });

  it('停止监控后不再采集', () => {
    vi.useFakeTimers();
    monitoring();
    stopPerformanceMonitoring();

    vi.advanceTimersByTime(5000);

    expect(getPerformanceTimeline()).toEqual([]);
  });
});

// ==================== 热力图 ====================

describe('getRenderHeatmap', () => {
  it('无数据返回空数组', () => {
    expect(getRenderHeatmap()).toEqual([]);
  });

  it('强度归一化到 [0,1] 且按强度降序', () => {
    monitoring();
    for (let i = 0; i < 10; i++) recordComponentRender('hot', 'Hot', 20);
    recordComponentRender('cold', 'Cold', 1);

    const heat = getRenderHeatmap();

    expect(heat).toHaveLength(2);
    expect(heat[0]!.componentId).toBe('hot');
    for (const h of heat) {
      expect(h.intensity).toBeGreaterThanOrEqual(0);
      expect(h.intensity).toBeLessThanOrEqual(1);
    }
  });
});

// ==================== 时间线与内存 ====================

describe('时间线 / 内存趋势', () => {
  it('summary 的四个数组长度一致', () => {
    performanceTimeline.push({
      timestamp: 1,
      metrics: {
        timestamp: 1,
        totalComponents: 0,
        totalRenders: 2,
        averageRenderTime: 1,
        memoryUsage: undefined,
        fps: 60,
      },
      slowRenders: [],
    });

    const s = getPerformanceTimelineSummary();

    expect(s.timestamps).toHaveLength(1);
    expect(s.fps).toEqual([60]);
    expect(s.renderCounts).toEqual([2]);
  });

  it('clearPerformanceTimeline 清空', () => {
    performanceTimeline.push({
      timestamp: 1,
      metrics: {
        timestamp: 1,
        totalComponents: 0,
        totalRenders: 0,
        averageRenderTime: 0,
        memoryUsage: undefined,
        fps: 0,
      },
      slowRenders: [],
    });

    clearPerformanceTimeline();

    expect(getPerformanceTimeline()).toEqual([]);
  });

  it('无内存信息时（jsdom）内存趋势为空而不是一堆 0', () => {
    const trend = getMemoryTrend();

    expect(trend.timestamps).toEqual([]);
    expect(trend.used).toEqual([]);
  });
});

// ==================== GC 与配置 ====================

describe('suggestGarbageCollection / 配置', () => {
  it('★ 无 gc 能力时明确回报失败（不能假装成功）', () => {
    const messages: Array<{ type: string; payload?: unknown }> = [];
    const off = onPanelMessage((m: unknown) => {
      messages.push(m as { type: string; payload?: unknown });
    });

    suggestGarbageCollection();

    off();

    const gcMsg = messages.find((m) => m.type === 'GC_SUGGESTED');
    expect(gcMsg).toBeDefined();
    expect((gcMsg!.payload as { success: boolean }).success).toBe(false);
  });

  it('有 gc 能力时调用它并回报成功', () => {
    const gc = vi.fn();
    (globalThis as { gc?: () => void }).gc = gc;

    try {
      suggestGarbageCollection();
      expect(gc).toHaveBeenCalledTimes(1);
    } finally {
      delete (globalThis as { gc?: () => void }).gc;
    }
  });

  it('updatePerformanceConfig 局部更新；getPerformanceConfig 返回副本', () => {
    updatePerformanceConfig({ slowRenderThreshold: 25 });

    expect(performanceConfig.slowRenderThreshold).toBe(25);

    const copy = getPerformanceConfig();
    copy.slowRenderThreshold = 99;

    expect(getPerformanceConfig().slowRenderThreshold).toBe(25);
  });
});
