/**
 * @lytjs/performance — 测试套件
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================
// Mock PerformanceObserver 和 performance API
// ============================================================

function setupMocks() {
  // Mock PerformanceObserver
  const mockEntries: Map<string, Array<{ startTime: number; duration: number; value: number; hadRecentInput?: boolean; entryType: string }>> = new Map();

  class MockPerformanceObserver {
    private callback: (list: any) => void;
    private type: string;

    constructor(callback: (list: any) => void) {
      this.callback = callback;
      this.type = '';
    }

    observe(options: { type: string; buffered?: boolean }) {
      this.type = options.type;
      if (!mockEntries.has(options.type)) {
        mockEntries.set(options.type, []);
      }
    }

    disconnect() {
      // no-op
    }

    // 测试辅助：模拟触发 entry
    trigger(entry: any) {
      this.callback({
        getEntries: () => [entry],
      });
    }
  }

  const observers: MockPerformanceObserver[] = [];

  (globalThis as any).PerformanceObserver = MockPerformanceObserver;

  // Track created observers
  const origObserve = MockPerformanceObserver.prototype.observe;
  MockPerformanceObserver.prototype.observe = function (options: any) {
    origObserve.call(this, options);
    observers.push(this);
    return this;
  };

  // Mock performance
  const mockPerformance = {
    mark: vi.fn(),
    measure: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn((type: string) => {
      if (type === 'navigation') {
        return [{ id: 'test-nav-1', type: 'navigate', responseStart: 100, transferSize: 5000, encodedBodySize: 3000, decodedBodySize: 10000, nextHopProtocol: 'h2' }];
      }
      return [];
    }),
    now: vi.fn(() => Date.now()),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  (globalThis as any).performance = mockPerformance;

  // Mock document
  (globalThis as any).document = {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelectorAll: vi.fn(() => ({ length: 42 })),
  };

  // Mock location
  (globalThis as any).location = { href: 'https://example.com/test' };

  // Mock navigator
  (globalThis as any).navigator = {
    sendBeacon: vi.fn(() => true),
  };

  // Mock fetch
  (globalThis as any).fetch = vi.fn(() => Promise.resolve());

  // Mock console (suppress output in tests)
  const origConsole = { ...console };
  (globalThis as any).console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    group: vi.fn(),
    groupEnd: vi.fn(),
  };

  return {
    observers,
    mockEntries,
    mockPerformance,
    origConsole,
    cleanup() {
      (globalThis as any).console = origConsole;
    },
  };
}

// ============================================================
// 测试：types.ts（类型导出验证）
// ============================================================

describe('@lytjs/performance', () => {
  let mocks: ReturnType<typeof setupMocks>;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.cleanup();
    vi.restoreAllMocks();
  });

  // ============================================================
  // Web Vitals 测试
  // ============================================================

  describe('Web Vitals', () => {
    it('should export vitals functions', async () => {
      const { initVitals, onVital, getVitals, getVitalsReport, destroyVitals, isVitalsInitialized } = await import('../src/vitals');

      expect(typeof initVitals).toBe('function');
      expect(typeof onVital).toBe('function');
      expect(typeof getVitals).toBe('function');
      expect(typeof getVitalsReport).toBe('function');
      expect(typeof destroyVitals).toBe('function');
      expect(typeof isVitalsInitialized).toBe('function');
    });

    it('should initialize without errors', async () => {
      const { initVitals, isVitalsInitialized, destroyVitals } = await import('../src/vitals');

      initVitals();
      expect(isVitalsInitialized()).toBe(true);
      destroyVitals();
      expect(isVitalsInitialized()).toBe(false);
    });

    it('should not double initialize', async () => {
      const { initVitals, destroyVitals } = await import('../src/vitals');

      initVitals();
      initVitals(); // 第二次调用应该被忽略
      destroyVitals();
    });

    it('should register and trigger vital callbacks', async () => {
      const { initVitals, onVital, destroyVitals } = await import('../src/vitals');

      initVitals();

      const callback = vi.fn();
      const unsubscribe = onVital('FCP', callback);

      // 模拟 FCP entry
      const observer = (mocks.observers as any).find(
        (o: any) => o.type === 'paint'
      );
      if (observer) {
        observer.trigger({
          name: 'first-contentful-paint',
          entryType: 'paint',
          startTime: 1200,
          duration: 0,
        });
      }

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'FCP',
          value: 1200,
          rating: 'good',
        })
      );

      unsubscribe();
      destroyVitals();
    });

    it('should support wildcard callback', async () => {
      const { initVitals, onVital, destroyVitals } = await import('../src/vitals');

      initVitals();

      const callback = vi.fn();
      onVital('*', callback);

      // 模拟 LCP entry
      const observer = (mocks.observers as any).find(
        (o: any) => o.type === 'largest-contentful-paint'
      );
      if (observer) {
        observer.trigger({
          name: 'largest-contentful-paint',
          entryType: 'largest-contentful-paint',
          startTime: 2800,
          duration: 0,
          element: { tagName: 'IMG' },
          url: 'https://example.com/image.jpg',
        });
      }

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'LCP',
          value: 2800,
          rating: 'needs-improvement',
        })
      );

      destroyVitals();
    });

    it('should unsubscribe from vital callbacks', async () => {
      const { initVitals, onVital, destroyVitals } = await import('../src/vitals');

      initVitals();

      const callback = vi.fn();
      const unsubscribe = onVital('FCP', callback);
      unsubscribe();

      // 模拟 FCP entry
      const observer = (mocks.observers as any).find(
        (o: any) => o.type === 'paint'
      );
      if (observer) {
        observer.trigger({
          name: 'first-contentful-paint',
          entryType: 'paint',
          startTime: 500,
          duration: 0,
        });
      }

      expect(callback).not.toHaveBeenCalled();
      destroyVitals();
    });

    it('should generate vitals report', async () => {
      const { initVitals, getVitalsReport, destroyVitals } = await import('../src/vitals');

      initVitals();

      const report = getVitalsReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('url', 'https://example.com/test');
      expect(report).toHaveProperty('navigationType');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty('good');
      expect(report.summary).toHaveProperty('needsImprovement');
      expect(report.summary).toHaveProperty('poor');

      destroyVitals();
    });

    it('should handle CLS accumulation', async () => {
      const { initVitals, getVital, destroyVitals } = await import('../src/vitals');

      initVitals();

      const observer = (mocks.observers as any).find(
        (o: any) => o.type === 'layout-shift'
      );
      if (observer) {
        // 第一次 layout shift（无用户输入）
        observer.trigger({
          name: 'layout-shift',
          entryType: 'layout-shift',
          startTime: 100,
          duration: 0,
          value: 0.05,
          hadRecentInput: false,
        });

        // 第二次 layout shift（无用户输入）
        observer.trigger({
          name: 'layout-shift',
          entryType: 'layout-shift',
          startTime: 200,
          duration: 0,
          value: 0.08,
          hadRecentInput: false,
        });

        // 有用户输入的 layout shift（应被忽略）
        observer.trigger({
          name: 'layout-shift',
          entryType: 'layout-shift',
          startTime: 300,
          duration: 0,
          value: 0.1,
          hadRecentInput: true,
        });
      }

      const cls = getVital('CLS');
      expect(cls).not.toBeNull();
      expect(cls!.value).toBeCloseTo(0.13, 2);

      destroyVitals();
    });

    it('should handle INP (take worst interaction)', async () => {
      const { initVitals, getVital, destroyVitals } = await import('../src/vitals');

      initVitals();

      const observer = (mocks.observers as any).find(
        (o: any) => o.type === 'interaction-to-next-paint'
      );
      if (observer) {
        observer.trigger({
          name: 'click',
          entryType: 'interaction-to-next-paint',
          startTime: 100,
          duration: 50,
          interactionType: 'click',
          target: { tagName: 'BUTTON' },
        });

        observer.trigger({
          name: 'click',
          entryType: 'interaction-to-next-paint',
          startTime: 200,
          duration: 300,
          interactionType: 'click',
          target: { tagName: 'BUTTON' },
        });
      }

      const inp = getVital('INP');
      expect(inp).not.toBeNull();
      expect(inp!.value).toBe(300);
      expect(inp!.rating).toBe('needs-improvement');

      destroyVitals();
    });

    it('should rate TTFB correctly', async () => {
      const { initVitals, getVital, destroyVitals } = await import('../src/vitals');

      initVitals();

      const observer = (mocks.observers as any).find(
        (o: any) => o.type === 'navigation'
      );
      if (observer) {
        observer.trigger({
          name: 'navigation',
          entryType: 'navigation',
          startTime: 0,
          duration: 500,
          responseStart: 500,
          transferSize: 5000,
          encodedBodySize: 3000,
          decodedBodySize: 10000,
          nextHopProtocol: 'h2',
          type: 'navigate',
        });
      }

      const ttfb = getVital('TTFB');
      expect(ttfb).not.toBeNull();
      expect(ttfb!.value).toBe(500);
      expect(ttfb!.rating).toBe('good');

      destroyVitals();
    });
  });

  // ============================================================
  // 组件渲染追踪测试
  // ============================================================

  describe('Component Tracking', () => {
    it('should export component tracking functions', async () => {
      const {
        initComponentTracking,
        trackComponentRender,
        getComponentStats,
        getSlowComponents,
        getFrequentRerenderComponents,
        resetComponentStats,
        destroyComponentTracking,
        isComponentTrackingInitialized,
        updateComponentConfig,
      } = await import('../src/component');

      expect(typeof initComponentTracking).toBe('function');
      expect(typeof trackComponentRender).toBe('function');
      expect(typeof getComponentStats).toBe('function');
      expect(typeof getSlowComponents).toBe('function');
      expect(typeof getFrequentRerenderComponents).toBe('function');
      expect(typeof resetComponentStats).toBe('function');
      expect(typeof destroyComponentTracking).toBe('function');
      expect(typeof isComponentTrackingInitialized).toBe('function');
      expect(typeof updateComponentConfig).toBe('function');
    });

    it('should track component render', async () => {
      const { initComponentTracking, trackComponentRender, getComponentStats, destroyComponentTracking } = await import('../src/component');

      initComponentTracking();

      const endRender = trackComponentRender('TestComponent');
      // 模拟一些渲染耗时
      endRender();

      const stats = getComponentStats();
      expect(stats['TestComponent']).toBeDefined();
      expect(stats['TestComponent'].renderCount).toBe(1);
      expect(stats['TestComponent'].totalDuration).toBeGreaterThanOrEqual(0);
      expect(stats['TestComponent'].avgDuration).toBeGreaterThanOrEqual(0);
      expect(stats['TestComponent'].maxDuration).toBeGreaterThanOrEqual(0);
      expect(stats['TestComponent'].records.length).toBe(1);

      destroyComponentTracking();
    });

    it('should track multiple renders', async () => {
      const { initComponentTracking, trackComponentRender, getComponentStats, destroyComponentTracking } = await import('../src/component');

      initComponentTracking();

      for (let i = 0; i < 5; i++) {
        const endRender = trackComponentRender('MultiRender');
        endRender();
      }

      const stats = getComponentStats();
      expect(stats['MultiRender'].renderCount).toBe(5);
      expect(stats['MultiRender'].records.length).toBe(5);

      destroyComponentTracking();
    });

    it('should not track before initialization', async () => {
      const { trackComponentRender, getComponentStats, destroyComponentTracking } = await import('../src/component');

      const endRender = trackComponentRender('BeforeInit');
      endRender();

      const stats = getComponentStats();
      expect(stats['BeforeInit']).toBeUndefined();

      destroyComponentTracking();
    });

    it('should identify slow components', async () => {
      const { initComponentTracking, trackComponentRender, getSlowComponents, destroyComponentTracking } = await import('../src/component');

      initComponentTracking({ slowThreshold: 0 }); // 设置极低阈值

      const endRender = trackComponentRender('SlowComponent');
      endRender();

      const slow = getSlowComponents();
      expect(slow.length).toBeGreaterThanOrEqual(1);
      expect(slow.some((c) => c.name === 'SlowComponent')).toBe(true);

      destroyComponentTracking();
    });

    it('should respect maxRecords config', async () => {
      const { initComponentTracking, trackComponentRender, getComponentStats, destroyComponentTracking } = await import('../src/component');

      initComponentTracking({ maxRecords: 3 });

      for (let i = 0; i < 5; i++) {
        const endRender = trackComponentRender('LimitedRecords');
        endRender();
      }

      const stats = getComponentStats();
      expect(stats['LimitedRecords'].renderCount).toBe(5);
      expect(stats['LimitedRecords'].records.length).toBe(3);

      destroyComponentTracking();
    });

    it('should reset stats', async () => {
      const { initComponentTracking, trackComponentRender, getComponentStats, resetComponentStats, destroyComponentTracking } = await import('../src/component');

      initComponentTracking();

      const endRender = trackComponentRender('ResetTest');
      endRender();

      resetComponentStats();

      const stats = getComponentStats();
      expect(stats['ResetTest']).toBeUndefined();

      destroyComponentTracking();
    });
  });

  // ============================================================
  // 内存监控测试
  // ============================================================

  describe('Memory Tracking', () => {
    it('should export memory tracking functions', async () => {
      const {
        trackMemory,
        getMemorySnapshot,
        detectLeaks,
        getMemoryTrend,
        getMemorySummary,
        stopMemoryTracking,
        destroyMemoryTracking,
        isMemoryTrackingInitialized,
        updateMemoryConfig,
      } = await import('../src/memory');

      expect(typeof trackMemory).toBe('function');
      expect(typeof getMemorySnapshot).toBe('function');
      expect(typeof detectLeaks).toBe('function');
      expect(typeof getMemoryTrend).toBe('function');
      expect(typeof getMemorySummary).toBe('function');
      expect(typeof stopMemoryTracking).toBe('function');
      expect(typeof destroyMemoryTracking).toBe('function');
      expect(typeof isMemoryTrackingInitialized).toBe('function');
      expect(typeof updateMemoryConfig).toBe('function');
    });

    it('should take memory snapshot', async () => {
      const { getMemorySnapshot } = await import('../src/memory');

      const snapshot = getMemorySnapshot();

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('usedJSHeapSize');
      expect(snapshot).toHaveProperty('totalJSHeapSize');
      expect(snapshot).toHaveProperty('jsHeapSizeLimit');
      expect(snapshot).toHaveProperty('domNodeCount');
      expect(snapshot).toHaveProperty('eventListenerCount');
    });

    it('should initialize and track memory', async () => {
      vi.useFakeTimers();

      const { trackMemory, isMemoryTrackingInitialized, getMemoryTrend, destroyMemoryTracking } = await import('../src/memory');

      trackMemory({ sampleInterval: 1000 });

      expect(isMemoryTrackingInitialized()).toBe(true);

      // 等待几个采样周期
      vi.advanceTimersByTime(3000);

      const trend = getMemoryTrend();
      expect(trend.length).toBeGreaterThanOrEqual(2);

      destroyMemoryTracking();
      expect(isMemoryTrackingInitialized()).toBe(false);

      vi.useRealTimers();
    });

    it('should detect no leaks with insufficient data', async () => {
      const { detectLeaks } = await import('../src/memory');

      const result = detectLeaks();
      expect(result.hasLeak).toBe(false);
      expect(result.leaks).toHaveLength(0);
    });

    it('should respect maxSamples config', async () => {
      vi.useFakeTimers();

      const { trackMemory, getMemoryTrend, destroyMemoryTracking } = await import('../src/memory');

      trackMemory({ sampleInterval: 100, maxSamples: 5 });

      // 产生 10 个采样
      vi.advanceTimersByTime(1100);

      const trend = getMemoryTrend();
      expect(trend.length).toBeLessThanOrEqual(6); // 初始 + 最多5个

      destroyMemoryTracking();
      vi.useRealTimers();
    });

    it('should provide memory summary', async () => {
      const { getMemorySummary } = await import('../src/memory');

      const summary = getMemorySummary();

      expect(summary).toHaveProperty('currentHeap');
      expect(summary).toHaveProperty('heapLimit');
      expect(summary).toHaveProperty('heapUsagePercent');
      expect(summary).toHaveProperty('domNodeCount');
      expect(summary).toHaveProperty('sampleCount');
      expect(summary).toHaveProperty('trendDirection');
      expect(['increasing', 'stable', 'decreasing', 'unknown']).toContain(summary.trendDirection);
    });
  });

  // ============================================================
  // 上报器测试
  // ============================================================

  describe('Reporter', () => {
    it('should export reporter functions', async () => {
      const { ConsoleReporter, FetchReporter, createReporter } = await import('../src/reporter');

      expect(typeof ConsoleReporter).toBe('function');
      expect(typeof FetchReporter).toBe('function');
      expect(typeof createReporter).toBe('function');
    });

    it('should create console reporter by default', async () => {
      const { createReporter } = await import('../src/reporter');

      const reporter = createReporter();
      expect(reporter).toBeDefined();
      expect(typeof reporter.report).toBe('function');
    });

    it('should create console reporter explicitly', async () => {
      const { createReporter, ConsoleReporter } = await import('../src/reporter');

      const reporter = createReporter({ type: 'console' });
      expect(reporter).toBeInstanceOf(ConsoleReporter);
    });

    it('should create fetch reporter', async () => {
      const { createReporter, FetchReporter } = await import('../src/reporter');

      const reporter = createReporter({
        type: 'fetch',
        endpoint: 'https://example.com/api/perf',
      });
      expect(reporter).toBeInstanceOf(FetchReporter);
    });

    it('should fallback to console reporter when fetch endpoint is missing', async () => {
      const { createReporter, ConsoleReporter } = await import('../src/reporter');

      const reporter = createReporter({ type: 'fetch' });
      expect(reporter).toBeInstanceOf(ConsoleReporter);
    });

    it('should create custom reporter', async () => {
      const { createReporter } = await import('../src/reporter');

      const customReporter = {
        report: vi.fn(),
        destroy: vi.fn(),
      };

      const reporter = createReporter({
        type: 'custom',
        reporter: customReporter,
      });

      expect(reporter).toBe(customReporter);
    });

    it('console reporter should call console methods', async () => {
      const { ConsoleReporter } = await import('../src/reporter');

      const reporter = new ConsoleReporter();

      reporter.report({
        type: 'vitals',
        data: { test: true },
        timestamp: Date.now(),
        url: 'https://example.com',
      });

      expect(console.group).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('fetch reporter should use sendBeacon', async () => {
      const { FetchReporter } = await import('../src/reporter');

      const reporter = new FetchReporter('https://example.com/api/perf', {
        sampleRate: 1.0,
      });

      reporter.report({
        type: 'vitals',
        data: { test: true },
        timestamp: Date.now(),
        url: 'https://example.com',
      });

      expect(navigator.sendBeacon).toHaveBeenCalled();

      reporter.destroy();
    });

    it('fetch reporter should respect sample rate', async () => {
      const { FetchReporter } = await import('../src/reporter');

      const reporter = new FetchReporter('https://example.com/api/perf', {
        sampleRate: 0.0, // 0% 采样率
      });

      reporter.report({
        type: 'vitals',
        data: { test: true },
        timestamp: Date.now(),
        url: 'https://example.com',
      });

      expect(navigator.sendBeacon).not.toHaveBeenCalled();

      reporter.destroy();
    });

    it('fetch reporter should support batch mode', async () => {
      vi.useFakeTimers();

      const { FetchReporter } = await import('../src/reporter');

      const reporter = new FetchReporter('https://example.com/api/perf', {
        batch: { enabled: true, maxSize: 3, interval: 5000 },
      });

      // 发送 2 个报告（未达到 maxSize）
      reporter.report({ type: 'vitals', data: {}, timestamp: 1, url: '' });
      reporter.report({ type: 'vitals', data: {}, timestamp: 2, url: '' });

      expect(navigator.sendBeacon).not.toHaveBeenCalled();

      // 发送第 3 个报告（达到 maxSize，触发 flush）
      reporter.report({ type: 'vitals', data: {}, timestamp: 3, url: '' });

      expect(navigator.sendBeacon).toHaveBeenCalled();

      reporter.destroy();
      vi.useRealTimers();
    });
  });

  // ============================================================
  // SDK 入口测试
  // ============================================================

  describe('SDK Entry', () => {
    it('should export all public APIs', async () => {
      const mod = await import('../src/index');

      // SDK 初始化
      expect(typeof mod.initPerformance).toBe('function');
      expect(typeof mod.getReporter).toBe('function');
      expect(typeof mod.setReporter).toBe('function');
      expect(typeof mod.destroyPerformance).toBe('function');
      expect(typeof mod.isInitialized).toBe('function');

      // Web Vitals
      expect(typeof mod.initVitals).toBe('function');
      expect(typeof mod.onVital).toBe('function');
      expect(typeof mod.getVitals).toBe('function');
      expect(typeof mod.getVital).toBe('function');
      expect(typeof mod.getVitalsReport).toBe('function');
      expect(typeof mod.destroyVitals).toBe('function');

      // 组件渲染追踪
      expect(typeof mod.initComponentTracking).toBe('function');
      expect(typeof mod.trackComponentRender).toBe('function');
      expect(typeof mod.getComponentStats).toBe('function');
      expect(typeof mod.getSlowComponents).toBe('function');

      // 内存监控
      expect(typeof mod.trackMemory).toBe('function');
      expect(typeof mod.getMemorySnapshot).toBe('function');
      expect(typeof mod.detectLeaks).toBe('function');
      expect(typeof mod.getMemoryTrend).toBe('function');

      // 上报器
      expect(typeof mod.ConsoleReporter).toBe('function');
      expect(typeof mod.FetchReporter).toBe('function');
      expect(typeof mod.createReporter).toBe('function');
    });

    it('should initialize and destroy SDK', async () => {
      const { initPerformance, isInitialized, destroyPerformance } = await import('../src/index');

      initPerformance();
      expect(isInitialized()).toBe(true);

      destroyPerformance();
      expect(isInitialized()).toBe(false);
    });

    it('should not double initialize SDK', async () => {
      const { initPerformance, destroyPerformance } = await import('../src/index');

      initPerformance();
      initPerformance(); // 第二次调用应该被忽略
      destroyPerformance();
    });

    it('should initialize with custom config', async () => {
      const { initPerformance, isInitialized, destroyPerformance } = await import('../src/index');

      initPerformance({
        enableVitals: true,
        enableComponentTracking: true,
        enableMemoryTracking: false,
        reporter: { type: 'console', debug: true },
      });

      expect(isInitialized()).toBe(true);
      destroyPerformance();
    });

    it('should set and get reporter', async () => {
      const { initPerformance, getReporter, setReporter, destroyPerformance } = await import('../src/index');

      initPerformance();

      // 初始无 reporter
      expect(getReporter()).toBeNull();

      // 设置 reporter
      setReporter({ type: 'console' });
      expect(getReporter()).not.toBeNull();

      destroyPerformance();
    });
  });
});
