/**
 * @lytjs/core - ErrorBoundary 与 PerformanceMonitor 集成
 *
 * 提供错误追踪与性能监控的无缝集成
 */
/* eslint-disable no-console */

import type { ErrorReporter, ErrorContext } from './error-boundary';

/** 性能监控集成配置 */
export interface PerformanceIntegrationOptions {
  /** 是否自动追踪错误到性能监控 */
  trackErrors?: boolean;
  /** 是否在错误时记录性能快照 */
  snapshotOnError?: boolean;
}

/** 性能快照信息 */
export interface PerformanceSnapshot {
  timestamp: number;
  metrics: {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    navigation?: {
      type: string;
      duration: number;
    };
    resources: number;
  };
}

/** 性能监控错误报告器 */
export class PerformanceErrorReporter implements ErrorReporter {
  private snapshots: Map<string, PerformanceSnapshot> = new Map();
  private trackErrors: boolean = true;
  private snapshotOnError: boolean = true;

  constructor(options: PerformanceIntegrationOptions = {}) {
    this.trackErrors = options.trackErrors ?? true;
    this.snapshotOnError = options.snapshotOnError ?? true;
  }

  report(error: Error, context: ErrorContext): void {
    if (!this.trackErrors) {
      return;
    }

    const snapshot = this.snapshotOnError ? this.captureSnapshot() : undefined;

    if (snapshot) {
      this.snapshots.set(error.message, snapshot);
    }

    if (typeof console !== 'undefined') {
      console.group(`[LytJS] Error Tracked: ${error.message}`);
      console.log('Component:', context.componentName);
      console.log('URL:', context.url);
      console.log('Timestamp:', context.timestamp.toISOString());
      if (snapshot) {
        console.log('Performance Snapshot:', snapshot);
      }
      console.groupEnd();
    }
  }

  private captureSnapshot(): PerformanceSnapshot | null {
    if (typeof window === 'undefined' || typeof performance === 'undefined') {
      return null;
    }

    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      metrics: {
        resources: performance.getEntriesByType('resource').length,
      },
    };

    const perfWithMemory = performance as typeof performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    if (perfWithMemory.memory) {
      snapshot.metrics.memory = {
        usedJSHeapSize: perfWithMemory.memory.usedJSHeapSize,
        totalJSHeapSize: perfWithMemory.memory.totalJSHeapSize,
        jsHeapSizeLimit: perfWithMemory.memory.jsHeapSizeLimit,
      };
    }

    const navigation = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigation) {
      snapshot.metrics.navigation = {
        type: navigation.type,
        duration: navigation.duration,
      };
    }

    return snapshot;
  }

  getSnapshots(): Map<string, PerformanceSnapshot> {
    return new Map(this.snapshots);
  }

  getSnapshotByError(errorMessage: string): PerformanceSnapshot | undefined {
    return this.snapshots.get(errorMessage);
  }
}

let globalPerformanceReporter: PerformanceErrorReporter | null = null;

/** 初始化错误边界与性能监控集成 */
export function initErrorBoundaryPerformanceIntegration(
  options: PerformanceIntegrationOptions = {},
): PerformanceErrorReporter {
  const reporter = new PerformanceErrorReporter(options);
  globalPerformanceReporter = reporter;

  /* eslint-disable @typescript-eslint/no-require-imports */
  const { setGlobalErrorReporter } = require('./error-boundary');
  setGlobalErrorReporter(reporter);

  return reporter;
}

/** 获取全局性能错误报告器 */
export function getPerformanceErrorReporter(): PerformanceErrorReporter | null {
  return globalPerformanceReporter;
}

/** 性能错误分析工具 */
export class PerformanceErrorAnalyzer {
  private snapshots: Map<string, PerformanceSnapshot> = new Map();

  addSnapshot(errorMessage: string, snapshot: PerformanceSnapshot): void {
    this.snapshots.set(errorMessage, snapshot);
  }

  analyzeErrorPatterns(): {
    highMemoryErrors: string[];
    slowNavigationErrors: string[];
    resourceHeavyErrors: string[];
  } {
    const highMemoryErrors: string[] = [];
    const slowNavigationErrors: string[] = [];
    const resourceHeavyErrors: string[] = [];

    this.snapshots.forEach((snapshot, errorMessage) => {
      if (snapshot.metrics.memory && snapshot.metrics.memory.usedJSHeapSize > 100 * 1024 * 1024) {
        highMemoryErrors.push(errorMessage);
      }

      if (snapshot.metrics.navigation && snapshot.metrics.navigation.duration > 5000) {
        slowNavigationErrors.push(errorMessage);
      }

      if (snapshot.metrics.resources > 100) {
        resourceHeavyErrors.push(errorMessage);
      }
    });

    return {
      highMemoryErrors,
      slowNavigationErrors,
      resourceHeavyErrors,
    };
  }
}
