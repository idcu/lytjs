// @lytjs/runtime-convergence
// L2 能力收敛模块 - 渲染队列、事件归一化、节点缓存、异步调度、过渡引擎

// ============================================================
// 类型导出
// ============================================================

export type {
  // VNode 相关
  VNode,
  ComponentInstance,
  // 渲染队列
  RenderOperation,
  RenderQueueOptions,
  // 事件归一化
  ParsedModifiers,
  ParsedEventInfo,
  EventInvoker,
  EventListenerEntry,
  // 节点缓存
  ResourceEntry,
  NodeCacheOptions,
  // 异步调度器
  SchedulerPriority,
  SchedulerJob,
  AsyncSchedulerOptions,
  // 过渡引擎（TransitionProps 从 @lytjs/vdom re-export）
  RuntimeTransitionState,
  FLIPRecord,
  ResolvedTransitionClasses,
  TransitionEngineOptions,
} from './types';

// TransitionProps 从 @lytjs/vdom re-export，避免重复定义
export type { TransitionProps } from '@lytjs/vdom/transition';

// ============================================================
// 类导出
// ============================================================

export { RenderQueue } from './render-queue';
export { EventNormalizer } from './event-normalizer';
export { NodeCache } from './node-cache';
export { AsyncScheduler } from './async-scheduler';
export { TransitionEngine } from './transition-engine';

// ============================================================
// 性能监控 (FIX: P2-11 RUNTIME-NEW-02)
// ============================================================

export {
  // Main class
  PerformanceMonitor,
  // Global instance functions
  getPerformanceMonitor,
  setPerformanceMonitor,
  initPerformanceMonitor,
  // Convenience functions
  startRenderTiming,
  recordRenderEntry,
  getComponentStats,
  generatePerformanceReport,
  isPerformanceMonitoringEnabled,
  setPerformanceMonitoringEnabled,
  // Decorator
  withPerformanceTracking,
  // DevTools
  connectToDevTools,
} from './performance';

export type {
  RenderPerformanceEntry,
  ComponentPerformanceStats,
  PerformanceMonitorOptions,
  PerformanceReport,
} from './performance';
