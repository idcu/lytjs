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
  initPerformancePanel,
} from '../src/panel/performance';
import { getEvents, clearEvents } from '../src/events';
import { onPanelMessage, sendToPanel } from '../src/bridge';

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

// ==================== 面板命令分发 ====================
//
// ★ 这一整段（`initPerformancePanel`，源码 504-610）此前 **0 覆盖**。
//   它与 time-travel 面板同款风险：`BridgeMessage` 的负载字段是 `payload`，
//   处理器若读 `msg.data`，所有**带参数**的命令都会静默失效（不报错、不回包）。

/** 捕获「发往面板」的消息（`sendToPanel` 也会触发通用处理器） */
function capturePanel(): { messages: Array<{ type: string; payload?: unknown }>; off: () => void } {
  const messages: Array<{ type: string; payload?: unknown }> = [];
  const off = onPanelMessage((m) => messages.push(m as { type: string; payload?: unknown }));
  return { messages, off };
}

describe('initPerformancePanel 的命令分发', () => {
  it('START / STOP 生效', () => {
    const off = initPerformancePanel();
    try {
      sendToPanel({ type: 'START_PERFORMANCE_MONITORING' });
      expect(isPerformanceMonitoring()).toBe(true);

      sendToPanel({ type: 'STOP_PERFORMANCE_MONITORING' });
      expect(isPerformanceMonitoring()).toBe(false);
    } finally {
      off();
    }
  });

  it('GET_PERFORMANCE_METRICS 回报指标、慢渲染与监控状态', () => {
    const off = initPerformancePanel();
    const cap = capturePanel();
    try {
      sendToPanel({ type: 'GET_PERFORMANCE_METRICS' });

      const payload = cap.messages.find((m) => m.type === 'PERFORMANCE_METRICS')!.payload as {
        metrics: { totalComponents: number; totalRenders: number };
        slowRenders: unknown[];
        isMonitoring: boolean;
      };
      expect(payload.metrics.totalComponents).toBe(0);
      expect(payload.metrics.totalRenders).toBe(0);
      expect(payload.slowRenders).toEqual([]);
      expect(payload.isMonitoring).toBe(false);
    } finally {
      cap.off();
      off();
    }
  });

  it('GET_RENDER_HEATMAP / GET_PERFORMANCE_TIMELINE / GET_MEMORY_TREND 都有回包', () => {
    const off = initPerformancePanel();
    const cap = capturePanel();
    try {
      sendToPanel({ type: 'GET_RENDER_HEATMAP' });
      sendToPanel({ type: 'GET_PERFORMANCE_TIMELINE' });
      sendToPanel({ type: 'GET_MEMORY_TREND' });

      expect(cap.messages.map((m) => m.type)).toEqual(
        expect.arrayContaining(['RENDER_HEATMAP', 'PERFORMANCE_TIMELINE', 'MEMORY_TREND']),
      );
    } finally {
      cap.off();
      off();
    }
  });

  it('★ GET_COMPONENT_PERFORMANCE 必须读到 payload.componentId（此前读 msg.data）', () => {
    monitoring();
    recordComponentRender('c1', 'Comp', 7);

    const off = initPerformancePanel();
    const cap = capturePanel();
    try {
      sendToPanel({ type: 'GET_COMPONENT_PERFORMANCE', payload: { componentId: 'c1' } });

      const msg = cap.messages.find((m) => m.type === 'COMPONENT_PERFORMANCE');
      // 修复前：`msg.data` 是 undefined ⇒ 处理器直接 return，**连回包都没有**
      expect(msg).toBeDefined();
      expect(msg!.payload).toMatchObject({ componentId: 'c1', renderCount: 1 });
    } finally {
      cap.off();
      off();
    }
  });

  it('★ UPDATE_PERFORMANCE_CONFIG 必须读到 payload（此前读 msg.data）', () => {
    const off = initPerformancePanel();
    try {
      sendToPanel({ type: 'UPDATE_PERFORMANCE_CONFIG', payload: { slowRenderThreshold: 42 } });

      // 修复前：`if (msg.data)` 守卫把 undefined 吞掉 ⇒ 配置纹丝不动
      expect(getPerformanceConfig().slowRenderThreshold).toBe(42);
    } finally {
      off();
    }
  });

  it('CLEAR_PERFORMANCE_DATA 清空组件数据与时间线并回包', () => {
    monitoring();
    recordComponentRender('c1', 'Comp', 5);

    const off = initPerformancePanel();
    const cap = capturePanel();
    try {
      sendToPanel({ type: 'CLEAR_PERFORMANCE_DATA' });

      expect(getAllComponentPerformance()).toEqual([]);
      expect(cap.messages.some((m) => m.type === 'PERFORMANCE_DATA_CLEARED')).toBe(true);
    } finally {
      cap.off();
      off();
    }
  });

  it('GET_PERFORMANCE_CONFIG 回报当前配置', () => {
    const off = initPerformancePanel();
    const cap = capturePanel();
    try {
      sendToPanel({ type: 'GET_PERFORMANCE_CONFIG' });

      expect(cap.messages.find((m) => m.type === 'PERFORMANCE_CONFIG')!.payload).toMatchObject({
        slowRenderThreshold: 16,
      });
    } finally {
      cap.off();
      off();
    }
  });

  it('SUGGEST_GC 触发 GC 建议回包', () => {
    const off = initPerformancePanel();
    const cap = capturePanel();
    try {
      sendToPanel({ type: 'SUGGEST_GC' });

      expect(cap.messages.some((m) => m.type === 'GC_SUGGESTED')).toBe(true);
    } finally {
      cap.off();
      off();
    }
  });

  it('未知命令被忽略，不抛错', () => {
    const off = initPerformancePanel();
    try {
      expect(() => sendToPanel({ type: 'NOT_A_COMMAND' as never })).not.toThrow();
    } finally {
      off();
    }
  });

  it('返回的取消函数解除订阅', () => {
    const off = initPerformancePanel();
    off();

    sendToPanel({ type: 'START_PERFORMANCE_MONITORING' });

    expect(isPerformanceMonitoring()).toBe(false);
  });
});

// ==================== FPS 与慢渲染 ====================

describe('FPS 计数', () => {
  it('★ rAF 驱动，满 1 秒算出帧率（此前 updateFps 整段未执行）', () => {
    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    monitoring();

    // 50 帧 × 20ms = 1000ms
    for (let i = 0; i < 50; i++) {
      now += 20;
      rafQueue.shift()?.(now);
    }

    const off = initPerformancePanel();
    const cap = capturePanel();
    try {
      sendToPanel({ type: 'GET_PERFORMANCE_METRICS' });

      const payload = cap.messages.find((m) => m.type === 'PERFORMANCE_METRICS')!.payload as {
        metrics: { fps: number };
      };
      expect(payload.metrics.fps).toBe(50);
    } finally {
      cap.off();
      off();
    }
  });

  it('停止监控后 rAF 不再继续排队', () => {
    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    monitoring();
    rafQueue.shift()?.(0);
    stopPerformanceMonitoring();

    // 队列里那一个回调执行时已停止 ⇒ 不再排新的
    rafQueue.shift()?.(10);
    expect(rafQueue).toHaveLength(0);
  });
});

describe('慢渲染汇总', () => {
  it('★ 只取最慢的 10 条并按耗时降序（findSlowRenders 此前未覆盖）', () => {
    monitoring();
    for (let i = 0; i < 12; i++) {
      recordComponentRender(`c${i}`, `Comp${i}`, 20 + i);
    }

    const off = initPerformancePanel();
    const cap = capturePanel();
    try {
      sendToPanel({ type: 'GET_PERFORMANCE_METRICS' });

      const payload = cap.messages.find((m) => m.type === 'PERFORMANCE_METRICS')!.payload as {
        slowRenders: Array<{ renderTime: number; componentId: string }>;
      };
      expect(payload.slowRenders).toHaveLength(10);
      const times = payload.slowRenders.map((s) => s.renderTime);
      expect(times).toEqual([...times].sort((a, b) => b - a));
      // 最慢的是 31（c11）
      expect(payload.slowRenders[0]!.componentId).toBe('c11');
    } finally {
      cap.off();
      off();
    }
  });

  it('未超过阈值的渲染不进慢渲染列表', () => {
    monitoring();
    recordComponentRender('fast', 'Fast', 5);

    const off = initPerformancePanel();
    const cap = capturePanel();
    try {
      sendToPanel({ type: 'GET_PERFORMANCE_METRICS' });
      const payload = cap.messages.find((m) => m.type === 'PERFORMANCE_METRICS')!.payload as {
        slowRenders: unknown[];
      };
      expect(payload.slowRenders).toEqual([]);
    } finally {
      cap.off();
      off();
    }
  });
});

describe('内存信息', () => {
  it('★ 有 performance.memory 时指标与趋势都带上真实数值（此前该分支未覆盖）', () => {
    // ⚠️ 必须先 `useFakeTimers()` 再挂 `memory`：假定时器会**替换 `performance` 对象**，
    //   先挂的话属性落在旧对象上，`getMemoryInfo()` 读不到。
    vi.useFakeTimers();
    const mem = {
      usedJSHeapSize: 2 * 1024 * 1024,
      totalJSHeapSize: 4 * 1024 * 1024,
      jsHeapSizeLimit: 8 * 1024 * 1024,
    };
    Object.defineProperty(performance, 'memory', { value: mem, configurable: true });

    try {
      monitoring();
      vi.advanceTimersByTime(1000);

      const summary = getPerformanceTimelineSummary();
      expect(summary.memory).toEqual([2 * 1024 * 1024]);

      const trend = getMemoryTrend();
      expect(trend.used).toEqual([2]);
      expect(trend.total).toEqual([4]);
      expect(trend.limit).toEqual([8]);
    } finally {
      delete (performance as { memory?: unknown }).memory;
    }
  });
});
