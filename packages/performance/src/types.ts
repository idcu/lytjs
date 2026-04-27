/**
 * @lytjs/performance — 类型定义
 *
 * 零运行时依赖的性能监控 SDK 类型系统。
 */

// ============================================================
// Web Vitals 类型
// ============================================================

/** 支持的 Web Vitals 指标名称 */
export type VitalName = 'FCP' | 'LCP' | 'CLS' | 'INP' | 'TTFB';

/** 单个 Vital 指标数据 */
export interface VitalMetric {
  /** 指标名称 */
  name: VitalName;
  /** 指标值（毫秒，CLS 为无单位分数） */
  value: number;
  /** 指标评级 */
  rating: 'good' | 'needs-improvement' | 'poor';
  /** 采集时间戳 */
  timestamp: number;
  /** 导航 ID */
  navigationId: string;
  /** 指标额外元数据 */
  meta?: Record<string, unknown>;
}

/** Vital 指标评级阈值 */
export interface VitalThresholds {
  good: number;
  poor: number;
}

/** Vital 指标回调 */
export type VitalCallback = (metric: VitalMetric) => void;

/** Web Vitals 完整报告 */
export interface VitalsReport {
  /** 采集时间 */
  timestamp: number;
  /** 页面 URL */
  url: string;
  /** 导航类型 */
  navigationType: string;
  /** 所有指标 */
  metrics: VitalMetric[];
  /** 评级汇总 */
  summary: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
}

// ============================================================
// 组件渲染追踪类型
// ============================================================

/** 单次渲染记录 */
export interface RenderRecord {
  /** 组件名称 */
  name: string;
  /** 渲染耗时（毫秒） */
  duration: number;
  /** 时间戳 */
  timestamp: number;
}

/** 组件渲染统计 */
export interface ComponentStats {
  /** 组件名称 */
  name: string;
  /** 总渲染次数 */
  renderCount: number;
  /** 总渲染耗时（毫秒） */
  totalDuration: number;
  /** 平均渲染耗时（毫秒） */
  avgDuration: number;
  /** 最大渲染耗时（毫秒） */
  maxDuration: number;
  /** 最小渲染耗时（毫秒） */
  minDuration: number;
  /** 最近一次渲染耗时 */
  lastDuration: number;
  /** 是否存在频繁重渲染警告 */
  isFrequentRerender: boolean;
  /** 渲染记录（最近 N 条） */
  records: RenderRecord[];
}

/** 慢渲染组件条目 */
export interface SlowComponent {
  /** 组件名称 */
  name: string;
  /** 平均渲染耗时 */
  avgDuration: number;
  /** 最大渲染耗时 */
  maxDuration: number;
  /** 渲染次数 */
  renderCount: number;
}

/** 组件渲染追踪配置 */
export interface ComponentTrackingConfig {
  /** 频繁重渲染阈值（毫秒），默认 16.67ms (60fps) */
  frequentThreshold?: number;
  /** 保留的最近渲染记录数，默认 50 */
  maxRecords?: number;
  /** 慢渲染阈值（毫秒），默认 50ms */
  slowThreshold?: number;
}

// ============================================================
// 内存监控类型
// ============================================================

/** 内存快照 */
export interface MemorySnapshot {
  /** 采集时间戳 */
  timestamp: number;
  /** 已用 JS 堆大小（字节） */
  usedJSHeapSize: number | null;
  /** 总 JS 堆大小（字节） */
  totalJSHeapSize: number | null;
  /** JS 堆大小上限（字节） */
  jsHeapSizeLimit: number | null;
  /** DOM 节点数 */
  domNodeCount: number;
  /** 事件监听器数（估算） */
  eventListenerCount: number;
}

/** 内存趋势数据点 */
export interface MemoryTrendPoint {
  /** 时间戳 */
  timestamp: number;
  /** 已用 JS 堆大小（字节） */
  usedJSHeapSize: number | null;
  /** DOM 节点数 */
  domNodeCount: number;
}

/** 内存泄漏检测结果 */
export interface MemoryLeakResult {
  /** 是否检测到可能的泄漏 */
  hasLeak: boolean;
  /** 泄漏类型列表 */
  leaks: MemoryLeakInfo[];
}

/** 单个泄漏信息 */
export interface MemoryLeakInfo {
  /** 泄漏类型 */
  type: 'heap-growth' | 'dom-growth' | 'listener-growth';
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high';
  /** 描述 */
  description: string;
  /** 相关数据 */
  data: {
    /** 起始值 */
    startValue: number;
    /** 结束值 */
    endValue: number;
    /** 增长量 */
    growth: number;
    /** 增长百分比 */
    growthPercent: number;
  };
}

/** 内存追踪配置 */
export interface MemoryTrackingConfig {
  /** 采样间隔（毫秒），默认 5000 */
  sampleInterval?: number;
  /** 最大保留采样数，默认 100 */
  maxSamples?: number;
  /** 堆增长警告阈值（字节），默认 5MB */
  heapGrowthThreshold?: number;
  /** DOM 节点增长警告阈值，默认 200 */
  domGrowthThreshold?: number;
  /** 事件监听器增长警告阈值，默认 50 */
  listenerGrowthThreshold?: number;
}

// ============================================================
// 上报器类型
// ============================================================

/** 上报数据 */
export interface ReportData {
  /** 数据类型 */
  type: 'vitals' | 'component' | 'memory' | 'custom';
  /** 数据内容 */
  data: unknown;
  /** 时间戳 */
  timestamp: number;
  /** 页面 URL */
  url: string;
}

/** 上报器接口 */
export interface Reporter {
  /** 上报数据 */
  report(data: ReportData): void;
  /** 销毁上报器 */
  destroy?(): void;
}

/** 上报器配置 */
export interface ReporterConfig {
  /** 上报器类型 */
  type: 'console' | 'fetch' | 'custom';
  /** 上报端点 URL（fetch 类型使用） */
  endpoint?: string;
  /** 自定义上报器实例（custom 类型使用） */
  reporter?: Reporter;
  /** 是否在开发模式下启用 */
  debug?: boolean;
  /** 上报采样率 (0-1)，默认 1.0 */
  sampleRate?: number;
  /** 批量上报配置 */
  batch?: {
    /** 是否启用批量上报 */
    enabled: boolean;
    /** 批量大小上限 */
    maxSize: number;
    /** 批量上报间隔（毫秒） */
    interval: number;
  };
}

// ============================================================
// SDK 配置
// ============================================================

/** Performance SDK 总配置 */
export interface PerformanceConfig {
  /** 是否自动初始化，默认 true */
  autoInit?: boolean;
  /** 是否启用 Web Vitals 监控，默认 true */
  enableVitals?: boolean;
  /** 是否启用组件渲染追踪，默认 true */
  enableComponentTracking?: boolean;
  /** 是否启用内存监控，默认 true */
  enableMemoryTracking?: boolean;
  /** 上报器配置 */
  reporter?: ReporterConfig;
  /** 组件追踪配置 */
  componentConfig?: ComponentTrackingConfig;
  /** 内存追踪配置 */
  memoryConfig?: MemoryTrackingConfig;
}

// ============================================================
// 性能 API 类型扩展
// ============================================================

/** Chrome 特有的 performance.memory 接口 */
export interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/** 扩展 Performance 接口 */
export interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}
