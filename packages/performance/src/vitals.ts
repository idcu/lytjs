/**
 * @lytjs/performance — Web Vitals 监控
 *
 * 基于 PerformanceObserver API 实现 Web Vitals 指标采集：
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - CLS (Cumulative Layout Shift)
 * - INP (Interaction to Next Paint)
 * - TTFB (Time to First Byte)
 *
 * 零运行时依赖，优雅降级。
 */

import type {
  VitalName,
  VitalMetric,
  VitalCallback,
  VitalThresholds,
  VitalsReport,
} from './types';

// ============================================================
// 常量
// ============================================================

/** 各指标的评级阈值 */
const THRESHOLDS: Record<VitalName, VitalThresholds> = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 800, poor: 1800 },
};

/** PerformanceObserver 支持的 entry type 映射 */
const ENTRY_TYPE_MAP: Record<VitalName, string> = {
  FCP: 'paint',
  LCP: 'largest-contentful-paint',
  CLS: 'layout-shift',
  INP: 'interaction-to-next-paint',
  TTFB: 'navigation',
};

// ============================================================
// 内部状态
// ============================================================

/** 已采集的指标 */
const metrics: Map<VitalName, VitalMetric> = new Map();

/** 指标回调列表 */
const callbacks: VitalCallback[] = [];

/** 是否已初始化 */
let initialized = false;

/** 活跃的 observer 列表 */
const observers: PerformanceObserver[] = [];

// ============================================================
// 工具函数
// ============================================================

/**
 * 判断指标评级
 */
function getRating(name: VitalName, value: number): VitalMetric['rating'] {
  const t = THRESHOLDS[name];
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * 生成导航 ID
 */
function getNavigationId(): string {
  try {
    const entries = performance.getEntriesByType('navigation');
    if (entries.length > 0) {
      return (entries[0] as any).id || '0';
    }
  } catch {
    // 降级处理
  }
  return '0';
}

/**
 * 通知所有回调
 */
function notifyCallbacks(metric: VitalMetric): void {
  for (let i = 0; i < callbacks.length; i++) {
    try {
      callbacks[i](metric);
    } catch {
      // 回调错误不影响其他回调
    }
  }
}

/**
 * 安全创建 PerformanceObserver
 */
function createObserver(
  type: string,
  callback: (entry: PerformanceEntry) => void
): PerformanceObserver | null {
  try {
    if (typeof PerformanceObserver === 'undefined') return null;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (let i = 0; i < entries.length; i++) {
        callback(entries[i]);
      }
    });

    // 尝试观察指定类型
    try {
      observer.observe({ type, buffered: true });
    } catch {
      // 某些类型不支持 buffered，尝试不带 buffered
      try {
        observer.observe({ type });
      } catch {
        return null;
      }
    }

    return observer;
  } catch {
    return null;
  }
}

// ============================================================
// 指标采集处理函数
// ============================================================

/**
 * 处理 FCP 指标
 */
function handleFCP(entry: PerformanceEntry): void {
  const value = entry.startTime;
  const metric: VitalMetric = {
    name: 'FCP',
    value,
    rating: getRating('FCP', value),
    timestamp: Date.now(),
    navigationId: getNavigationId(),
    meta: { entryType: entry.entryType },
  };
  metrics.set('FCP', metric);
  notifyCallbacks(metric);
}

/**
 * 处理 LCP 指标
 * LCP 可能多次触发（页面内容变化），取最大值
 */
function handleLCP(entry: PerformanceEntry): void {
  const value = entry.startTime;
  const metric: VitalMetric = {
    name: 'LCP',
    value,
    rating: getRating('LCP', value),
    timestamp: Date.now(),
    navigationId: getNavigationId(),
    meta: {
      entryType: entry.entryType,
      element: (entry as any).element?.tagName || '',
      url: (entry as any).url || '',
    },
  };
  metrics.set('LCP', metric);
  notifyCallbacks(metric);
}

/**
 * 处理 CLS 指标
 * CLS 需要累加所有 layout-shift 值（排除用户输入导致的偏移）
 */
function handleCLS(entry: PerformanceEntry): void {
  const layoutShift = entry as any;
  if (layoutShift.hadRecentInput) return;

  const existing = metrics.get('CLS');
  const currentValue = existing ? existing.value : 0;
  const newValue = currentValue + layoutShift.value;

  const metric: VitalMetric = {
    name: 'CLS',
    value: newValue,
    rating: getRating('CLS', newValue),
    timestamp: Date.now(),
    navigationId: getNavigationId(),
  };
  metrics.set('CLS', metric);
  notifyCallbacks(metric);
}

/**
 * 处理 INP 指标
 * INP 取最差交互延迟
 */
function handleINP(entry: PerformanceEntry): void {
  const value = entry.duration;
  const existing = metrics.get('INP');

  if (!existing || value > existing.value) {
    const metric: VitalMetric = {
      name: 'INP',
      value,
      rating: getRating('INP', value),
      timestamp: Date.now(),
      navigationId: getNavigationId(),
      meta: {
        entryType: entry.entryType,
        interactionType: (entry as any).interactionType || '',
        target: (entry as any).target?.tagName || '',
      },
    };
    metrics.set('INP', metric);
    notifyCallbacks(metric);
  }
}

/**
 * 处理 TTFB 指标
 */
function handleTTFB(entry: PerformanceEntry): void {
  const navEntry = entry as PerformanceNavigationTiming;
  const value = navEntry.responseStart;
  const metric: VitalMetric = {
    name: 'TTFB',
    value,
    rating: getRating('TTFB', value),
    timestamp: Date.now(),
    navigationId: getNavigationId(),
    meta: {
      transferSize: navEntry.transferSize || 0,
      encodedBodySize: navEntry.encodedBodySize || 0,
      decodedBodySize: navEntry.decodedBodySize || 0,
      protocol: navEntry.nextHopProtocol || '',
    },
  };
  metrics.set('TTFB', metric);
  notifyCallbacks(metric);
}

// ============================================================
// 指标名称到处理函数的映射
// ============================================================

const HANDLERS: Record<VitalName, (entry: PerformanceEntry) => void> = {
  FCP: handleFCP,
  LCP: handleLCP,
  CLS: handleCLS,
  INP: handleINP,
  TTFB: handleTTFB,
};

// ============================================================
// 公共 API
// ============================================================

/**
 * 初始化 Web Vitals 监控
 *
 * 自动注册所有 PerformanceObserver，开始采集指标。
 * 重复调用不会重复初始化。
 */
export function initVitals(): void {
  if (initialized) return;

  // 检测浏览器环境
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return;
  }

  initialized = true;

  // 为每个指标创建 observer
  const vitalNames: VitalName[] = ['FCP', 'LCP', 'CLS', 'INP', 'TTFB'];

  for (let i = 0; i < vitalNames.length; i++) {
    const name = vitalNames[i];
    const entryType = ENTRY_TYPE_MAP[name];
    const handler = HANDLERS[name];

    const observer = createObserver(entryType, handler);
    if (observer) {
      observers.push(observer);
    }
  }

  // 页面隐藏时，对 LCP 和 CLS 做最终处理
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // LCP: 取当前值作为最终值
        // CLS: 当前值即为最终值
        // 这些值已经在 handler 中更新，无需额外处理
      }
    }, { once: true, capture: true });
  } catch {
    // 降级处理
  }
}

/**
 * 注册 Vital 指标回调
 *
 * 当指标值更新时触发回调。
 * 如果已有指标值，立即触发一次回调。
 *
 * @param metric - 指标名称，或 '*' 监听所有指标
 * @param callback - 回调函数
 */
export function onVital(
  metric: VitalName | '*',
  callback: VitalCallback
): () => void {
  const wrappedCallback: VitalCallback = metric === '*'
    ? callback
    : (m) => { if (m.name === metric) callback(m); };

  callbacks.push(wrappedCallback);

  // 如果已有指标值，立即触发
  if (metric === '*') {
    metrics.forEach((m) => {
      try { wrappedCallback(m); } catch { /* ignore */ }
    });
  } else {
    const existing = metrics.get(metric);
    if (existing) {
      try { wrappedCallback(existing); } catch { /* ignore */ }
    }
  }

  // 返回取消订阅函数
  return () => {
    const idx = callbacks.indexOf(wrappedCallback);
    if (idx !== -1) {
      callbacks.splice(idx, 1);
    }
  };
}

/**
 * 获取所有已采集的 Vital 指标
 *
 * @returns 指标数组
 */
export function getVitals(): VitalMetric[] {
  const result: VitalMetric[] = [];
  metrics.forEach((metric) => {
    result.push({ ...metric });
  });
  return result;
}

/**
 * 获取指定 Vital 指标
 *
 * @param name - 指标名称
 * @returns 指标数据，未采集到则返回 null
 */
export function getVital(name: VitalName): VitalMetric | null {
  const metric = metrics.get(name);
  return metric ? { ...metric } : null;
}

/**
 * 生成 Web Vitals 完整报告
 *
 * @returns Vitals 报告
 */
export function getVitalsReport(): VitalsReport {
  const allMetrics = getVitals();
  let good = 0;
  let needsImprovement = 0;
  let poor = 0;

  for (let i = 0; i < allMetrics.length; i++) {
    const rating = allMetrics[i].rating;
    if (rating === 'good') good++;
    else if (rating === 'needs-improvement') needsImprovement++;
    else poor++;
  }

  let navigationType = 'unknown';
  try {
    const entries = performance.getEntriesByType('navigation');
    if (entries.length > 0) {
      navigationType = (entries[0] as PerformanceNavigationTiming).type || 'unknown';
    }
  } catch {
    // 降级处理
  }

  return {
    timestamp: Date.now(),
    url: typeof location !== 'undefined' ? location.href : '',
    navigationType,
    metrics: allMetrics,
    summary: { good, needsImprovement, poor },
  };
}

/**
 * 销毁 Web Vitals 监控
 *
 * 断开所有 PerformanceObserver，清除回调。
 */
export function destroyVitals(): void {
  for (let i = 0; i < observers.length; i++) {
    try {
      observers[i].disconnect();
    } catch {
      // 忽略
    }
  }
  observers.length = 0;
  callbacks.length = 0;
  metrics.clear();
  initialized = false;
}

/**
 * 检查 Web Vitals 监控是否已初始化
 */
export function isVitalsInitialized(): boolean {
  return initialized;
}
