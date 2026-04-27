/**
 * @lytjs/performance — 性能监控 SDK
 *
 * 轻量级 Web 性能监控 SDK，提供：
 * - Web Vitals 监控 (FCP, LCP, CLS, INP, TTFB)
 * - 组件渲染追踪（渲染次数、耗时、频繁重渲染检测）
 * - 内存泄漏检测（堆内存、DOM 节点、事件监听器）
 * - 灵活的上报系统（Console / Fetch / 自定义）
 *
 * 特性：
 * - 零运行时依赖
 * - 体积 < 3KB gzip
 * - 引入即生效（自动初始化）
 * - 不影响应用性能
 * - 优雅降级（不支持的浏览器静默失败）
 *
 * @example
 * ```ts
 * import { initPerformance, onVital, trackComponentRender } from '@lytjs/performance'
 *
 * // 自动初始化（默认启用所有功能）
 * initPerformance()
 *
 * // 监听特定指标
 * const unsubscribe = onVital('LCP', (metric) => {
 *   console.log(`LCP: ${metric.value}ms (${metric.rating})`)
 * })
 *
 * // 追踪组件渲染
 * const endRender = trackComponentRender('MyComponent')
 * // ... 渲染逻辑 ...
 * endRender()
 * ```
 */

// ============================================================
// Web Vitals
// ============================================================

export {
  initVitals,
  onVital,
  getVitals,
  getVital,
  getVitalsReport,
  destroyVitals,
  isVitalsInitialized,
} from './vitals';

// ============================================================
// 组件渲染追踪
// ============================================================

export {
  initComponentTracking,
  trackComponentRender,
  getComponentStats,
  getSlowComponents,
  getFrequentRerenderComponents,
  resetComponentStats,
  destroyComponentTracking,
  isComponentTrackingInitialized,
  updateComponentConfig,
} from './component';

// ============================================================
// 内存泄漏检测
// ============================================================

export {
  trackMemory,
  getMemorySnapshot,
  detectLeaks,
  getMemoryTrend,
  getMemorySummary,
  stopMemoryTracking,
  destroyMemoryTracking,
  isMemoryTrackingInitialized,
  updateMemoryConfig,
} from './memory';

// ============================================================
// 上报器
// ============================================================

export {
  ConsoleReporter,
  FetchReporter,
  createReporter,
} from './reporter';

// ============================================================
// 类型导出
// ============================================================

export type {
  // Web Vitals
  VitalName,
  VitalMetric,
  VitalThresholds,
  VitalCallback,
  VitalsReport,

  // 组件渲染追踪
  RenderRecord,
  ComponentStats,
  SlowComponent,
  ComponentTrackingConfig,

  // 内存监控
  MemorySnapshot,
  MemoryTrendPoint,
  MemoryLeakResult,
  MemoryLeakInfo,
  MemoryTrackingConfig,

  // 上报器
  Reporter,
  ReporterConfig,
  ReportData,

  // SDK 配置
  PerformanceConfig,

  // 性能 API 扩展
  PerformanceMemory,
  ExtendedPerformance,
} from './types';

// ============================================================
// SDK 初始化
// ============================================================

import type { PerformanceConfig, Reporter } from './types';
import { initVitals, destroyVitals } from './vitals';
import { initComponentTracking, destroyComponentTracking } from './component';
import { trackMemory, destroyMemoryTracking } from './memory';
import { createReporter } from './reporter';

/** 当前活跃的上报器 */
let activeReporter: Reporter | null = null;

/** 是否已初始化 */
let sdkInitialized = false;

/**
 * 初始化 Performance SDK
 *
 * 根据配置初始化各监控模块。默认自动初始化所有功能。
 *
 * @param config - SDK 配置（可选）
 *
 * @example
 * ```ts
 * // 默认配置（自动初始化所有功能）
 * initPerformance()
 *
 * // 自定义配置
 * initPerformance({
 *   enableVitals: true,
 *   enableComponentTracking: true,
 *   enableMemoryTracking: false,
 *   reporter: {
 *     type: 'fetch',
 *     endpoint: 'https://example.com/api/performance',
 *     sampleRate: 0.5,
 *   },
 * })
 * ```
 */
export function initPerformance(config?: PerformanceConfig): void {
  if (sdkInitialized) return;

  const cfg = config ?? {};

  // 初始化上报器
  if (cfg.reporter) {
    activeReporter = createReporter(cfg.reporter);
  }

  // 初始化 Web Vitals
  if (cfg.enableVitals !== false) {
    initVitals();
  }

  // 初始化组件渲染追踪
  if (cfg.enableComponentTracking !== false) {
    initComponentTracking(cfg.componentConfig);
  }

  // 初始化内存监控
  if (cfg.enableMemoryTracking !== false) {
    trackMemory(cfg.memoryConfig);
  }

  sdkInitialized = true;
}

/**
 * 获取当前活跃的上报器
 *
 * @returns Reporter 实例或 null
 */
export function getReporter(): Reporter | null {
  return activeReporter;
}

/**
 * 设置上报器
 *
 * @param reporterConfig - 上报器配置
 */
export function setReporter(reporterConfig: Parameters<typeof createReporter>[0]): void {
  if (activeReporter && typeof activeReporter.destroy === 'function') {
    activeReporter.destroy();
  }
  activeReporter = createReporter(reporterConfig);
}

/**
 * 销毁 Performance SDK
 *
 * 停止所有监控模块，清理资源。
 */
export function destroyPerformance(): void {
  destroyVitals();
  destroyComponentTracking();
  destroyMemoryTracking();

  if (activeReporter && typeof activeReporter.destroy === 'function') {
    activeReporter.destroy();
  }
  activeReporter = null;
  sdkInitialized = false;
}

/**
 * 检查 SDK 是否已初始化
 */
export function isInitialized(): boolean {
  return sdkInitialized;
}
