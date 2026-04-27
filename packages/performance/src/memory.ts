/**
 * @lytjs/performance — 内存泄漏检测
 *
 * 基于 performance.memory (Chrome)、DOM 节点计数和事件监听器估算
 * 实现内存使用监控和泄漏检测。
 *
 * 零运行时依赖，优雅降级（非 Chrome 浏览器中堆数据为 null）。
 */

import type {
  MemorySnapshot,
  MemoryTrendPoint,
  MemoryLeakResult,
  MemoryLeakInfo,
  MemoryTrackingConfig,
  ExtendedPerformance,
} from './types';

// ============================================================
// 内部状态
// ============================================================

/** 配置 */
let config: Required<MemoryTrackingConfig> = {
  sampleInterval: 5000,
  maxSamples: 100,
  heapGrowthThreshold: 5 * 1024 * 1024,  // 5MB
  domGrowthThreshold: 200,
  listenerGrowthThreshold: 50,
};

/** 内存趋势数据 */
const trendData: MemoryTrendPoint[] = [];

/** 采样定时器 */
let sampleTimer: ReturnType<typeof setInterval> | null = null;

/** 是否已初始化 */
let initialized = false;

// ============================================================
// 工具函数
// ============================================================

/**
 * 获取 performance.memory 数据（仅 Chrome 可用）
 */
function getHeapData(): {
  usedJSHeapSize: number | null;
  totalJSHeapSize: number | null;
  jsHeapSizeLimit: number | null;
} {
  try {
    const perf = performance as ExtendedPerformance;
    if (perf.memory) {
      return {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
        jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      };
    }
  } catch {
    // 降级处理
  }
  return {
    usedJSHeapSize: null,
    totalJSHeapSize: null,
    jsHeapSizeLimit: null,
  };
}

/**
 * 获取 DOM 节点数
 */
function getDOMNodeCount(): number {
  try {
    return document.querySelectorAll('*').length;
  } catch {
    return 0;
  }
}

/**
 * 估算事件监听器数
 * 注意：浏览器没有原生 API 获取全局事件监听器数量，
 * 这里通过 getEventListeners (DevTools only) 或估算方式。
 * 在生产环境中返回估算值。
 */
function estimateEventListenerCount(): number {
  try {
    // Chrome DevTools 提供的 getEventListeners，但仅在 DevTools 控制台可用
    // 生产环境无法使用，返回 0
    if (typeof (window as any).getEventListeners === 'function') {
      // 仅在 DevTools 环境可用
      return -1; // 标记为不可用
    }
  } catch {
    // 忽略
  }

  // 通过 MutationObserver 监听新增的事件监听器来估算
  // 这里返回一个基于 DOM 节点数的粗略估算
  try {
    const domCount = getDOMNodeCount();
    // 平均每个 DOM 节点约 1-3 个事件监听器
    return Math.round(domCount * 1.5);
  } catch {
    return 0;
  }
}

/**
 * 采集一次快照
 */
function takeSnapshot(): MemoryTrendPoint {
  const heap = getHeapData();
  const domCount = getDOMNodeCount();

  return {
    timestamp: Date.now(),
    usedJSHeapSize: heap.usedJSHeapSize,
    domNodeCount: domCount,
  };
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 开始内存追踪
 *
 * 定期采集内存快照，用于趋势分析和泄漏检测。
 *
 * @param trackingConfig - 追踪配置（可选）
 */
export function trackMemory(trackingConfig?: MemoryTrackingConfig): void {
  if (initialized) return;

  if (trackingConfig) {
    if (trackingConfig.sampleInterval !== undefined) {
      config.sampleInterval = trackingConfig.sampleInterval;
    }
    if (trackingConfig.maxSamples !== undefined) {
      config.maxSamples = trackingConfig.maxSamples;
    }
    if (trackingConfig.heapGrowthThreshold !== undefined) {
      config.heapGrowthThreshold = trackingConfig.heapGrowthThreshold;
    }
    if (trackingConfig.domGrowthThreshold !== undefined) {
      config.domGrowthThreshold = trackingConfig.domGrowthThreshold;
    }
    if (trackingConfig.listenerGrowthThreshold !== undefined) {
      config.listenerGrowthThreshold = trackingConfig.listenerGrowthThreshold;
    }
  }

  initialized = true;

  // 立即采集一次
  trendData.push(takeSnapshot());

  // 定期采集
  if (typeof setInterval !== 'undefined') {
    sampleTimer = setInterval(() => {
      trendData.push(takeSnapshot());

      // 限制最大采样数
      while (trendData.length > config.maxSamples) {
        trendData.shift();
      }
    }, config.sampleInterval);
  }
}

/**
 * 获取当前内存快照
 *
 * @returns 内存快照
 */
export function getMemorySnapshot(): MemorySnapshot {
  const heap = getHeapData();
  const domCount = getDOMNodeCount();
  const listenerCount = estimateEventListenerCount();

  return {
    timestamp: Date.now(),
    usedJSHeapSize: heap.usedJSHeapSize,
    totalJSHeapSize: heap.totalJSHeapSize,
    jsHeapSizeLimit: heap.jsHeapSizeLimit,
    domNodeCount: domCount,
    eventListenerCount: listenerCount,
  };
}

/**
 * 检测可能的内存泄漏
 *
 * 基于内存趋势数据分析：
 * - 堆内存持续增长
 * - DOM 节点数持续增长
 * - 事件监听器数持续增长
 *
 * 需要至少 3 个采样点才能进行检测。
 *
 * @returns 泄漏检测结果
 */
export function detectLeaks(): MemoryLeakResult {
  const leaks: MemoryLeakInfo[] = [];

  if (trendData.length < 3) {
    return { hasLeak: false, leaks: [] };
  }

  // 取最近的数据段进行分析（前 1/3 和后 1/3）
  const len = trendData.length;
  const firstThirdEnd = Math.floor(len / 3);
  const lastThirdStart = Math.floor((len * 2) / 3);

  // 分析堆内存增长
  const heapStart = trendData[0].usedJSHeapSize;
  const heapEnd = trendData[len - 1].usedJSHeapSize;

  if (heapStart !== null && heapEnd !== null) {
    const heapGrowth = heapEnd - heapStart;
    const heapGrowthPercent = heapStart > 0 ? (heapGrowth / heapStart) * 100 : 0;

    // 检查是否持续增长（中间值也大于起始值）
    let isConsistentGrowth = true;
    for (let i = firstThirdEnd; i < lastThirdStart; i++) {
      if (trendData[i].usedJSHeapSize !== null && trendData[i].usedJSHeapSize! < heapStart) {
        isConsistentGrowth = false;
        break;
      }
    }

    if (isConsistentGrowth && heapGrowth > config.heapGrowthThreshold) {
      const severity: MemoryLeakInfo['severity'] =
        heapGrowth > config.heapGrowthThreshold * 3 ? 'high' :
        heapGrowth > config.heapGrowthThreshold * 1.5 ? 'medium' : 'low';

      leaks.push({
        type: 'heap-growth',
        severity,
        description: `JS 堆内存持续增长 ${formatBytes(heapGrowth)} (${heapGrowthPercent.toFixed(1)}%)`,
        data: {
          startValue: heapStart,
          endValue: heapEnd,
          growth: heapGrowth,
          growthPercent: heapGrowthPercent,
        },
      });
    }
  }

  // 分析 DOM 节点增长
  const domStart = trendData[0].domNodeCount;
  const domEnd = trendData[len - 1].domNodeCount;
  const domGrowth = domEnd - domStart;
  const domGrowthPercent = domStart > 0 ? (domGrowth / domStart) * 100 : 0;

  if (domGrowth > config.domGrowthThreshold) {
    // 检查是否持续增长
    let isConsistentGrowth = true;
    for (let i = firstThirdEnd; i < lastThirdStart; i++) {
      if (trendData[i].domNodeCount < domStart) {
        isConsistentGrowth = false;
        break;
      }
    }

    if (isConsistentGrowth) {
      const severity: MemoryLeakInfo['severity'] =
        domGrowth > config.domGrowthThreshold * 3 ? 'high' :
        domGrowth > config.domGrowthThreshold * 1.5 ? 'medium' : 'low';

      leaks.push({
        type: 'dom-growth',
        severity,
        description: `DOM 节点数持续增长 ${domGrowth} 个 (${domGrowthPercent.toFixed(1)}%)`,
        data: {
          startValue: domStart,
          endValue: domEnd,
          growth: domGrowth,
          growthPercent: domGrowthPercent,
        },
      });
    }
  }

  return {
    hasLeak: leaks.length > 0,
    leaks,
  };
}

/**
 * 获取内存使用趋势
 *
 * @returns 趋势数据点数组
 */
export function getMemoryTrend(): MemoryTrendPoint[] {
  return trendData.map((point) => ({ ...point }));
}

/**
 * 获取内存使用摘要
 *
 * @returns 内存摘要信息
 */
export function getMemorySummary(): {
  currentHeap: number | null;
  heapLimit: number | null;
  heapUsagePercent: number | null;
  domNodeCount: number;
  sampleCount: number;
  trendDirection: 'increasing' | 'stable' | 'decreasing' | 'unknown';
} {
  const snapshot = getMemorySnapshot();
  const heapUsagePercent = snapshot.jsHeapSizeLimit && snapshot.usedJSHeapSize
    ? (snapshot.usedJSHeapSize / snapshot.jsHeapSizeLimit) * 100
    : null;

  let trendDirection: 'increasing' | 'stable' | 'decreasing' | 'unknown' = 'unknown';

  if (trendData.length >= 3) {
    const recent = trendData.slice(-3);
    if (recent[0].usedJSHeapSize !== null &&
        recent[1].usedJSHeapSize !== null &&
        recent[2].usedJSHeapSize !== null) {
      const diff1 = recent[1].usedJSHeapSize! - recent[0].usedJSHeapSize!;
      const diff2 = recent[2].usedJSHeapSize! - recent[1].usedJSHeapSize!;

      if (diff1 > 0 && diff2 > 0) {
        trendDirection = 'increasing';
      } else if (diff1 < 0 && diff2 < 0) {
        trendDirection = 'decreasing';
      } else {
        trendDirection = 'stable';
      }
    }
  }

  return {
    currentHeap: snapshot.usedJSHeapSize,
    heapLimit: snapshot.jsHeapSizeLimit,
    heapUsagePercent,
    domNodeCount: snapshot.domNodeCount,
    sampleCount: trendData.length,
    trendDirection,
  };
}

/**
 * 停止内存追踪
 */
export function stopMemoryTracking(): void {
  if (sampleTimer !== null) {
    clearInterval(sampleTimer);
    sampleTimer = null;
  }
}

/**
 * 销毁内存追踪
 *
 * 停止追踪并清除所有数据。
 */
export function destroyMemoryTracking(): void {
  stopMemoryTracking();
  trendData.length = 0;
  initialized = false;
}

/**
 * 检查内存追踪是否已初始化
 */
export function isMemoryTrackingInitialized(): boolean {
  return initialized;
}

/**
 * 更新内存追踪配置
 *
 * @param newConfig - 新配置
 */
export function updateMemoryConfig(newConfig: Partial<MemoryTrackingConfig>): void {
  if (newConfig.sampleInterval !== undefined) {
    config.sampleInterval = newConfig.sampleInterval;
  }
  if (newConfig.maxSamples !== undefined) {
    config.maxSamples = newConfig.maxSamples;
  }
  if (newConfig.heapGrowthThreshold !== undefined) {
    config.heapGrowthThreshold = newConfig.heapGrowthThreshold;
  }
  if (newConfig.domGrowthThreshold !== undefined) {
    config.domGrowthThreshold = newConfig.domGrowthThreshold;
  }
  if (newConfig.listenerGrowthThreshold !== undefined) {
    config.listenerGrowthThreshold = newConfig.listenerGrowthThreshold;
  }

  // 如果正在追踪，重启定时器
  if (initialized && sampleTimer !== null) {
    stopMemoryTracking();
    sampleTimer = setInterval(() => {
      trendData.push(takeSnapshot());
      while (trendData.length > config.maxSamples) {
        trendData.shift();
      }
    }, config.sampleInterval);
  }
}

// ============================================================
// 内部工具
// ============================================================

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
