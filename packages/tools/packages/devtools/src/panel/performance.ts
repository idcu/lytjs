/**
 * @lytjs/devtools - Performance Panel
 *
 * Displays component render times, re-render counts, memory usage and other performance metrics.
 */

import { sendToPanel, onPanelMessage } from '../bridge';
import { recordEvent } from '../events';
import type { ComponentTreeNode } from '../types';
import { getComponentTree, getComponentById } from '../component-tree';

// ===== Types =====

export interface ComponentPerformance {
  componentId: string;
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  minRenderTime: number;
  maxRenderTime: number;
  renderTimes: number[]; // Last N render times
  lastRenderTimestamp: number;
  updateFrequency: 'low' | 'medium' | 'high' | 'extreme';
}

export interface PerformanceMetrics {
  timestamp: number;
  totalComponents: number;
  totalRenders: number;
  averageRenderTime: number;
  memoryUsage?: MemoryInfo;
  fps?: number;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface RenderHeatmapData {
  componentId: string;
  componentName: string;
  intensity: number; // 0-1
  renderCount: number;
  frequency: 'low' | 'medium' | 'high' | 'extreme';
}

export interface PerformanceTimelineEntry {
  timestamp: number;
  metrics: PerformanceMetrics;
  slowRenders: SlowRenderInfo[];
}

export interface SlowRenderInfo {
  componentId: string;
  componentName: string;
  renderTime: number;
  timestamp: number;
}

export interface PerformanceConfig {
  maxRenderHistory: number;
  slowRenderThreshold: number; // ms
  timelineMaxSize: number;
  updateInterval: number; // ms
}

// ===== State =====

const performanceConfig: PerformanceConfig = {
  maxRenderHistory: 50,
  slowRenderThreshold: 16, // 60fps = 16.67ms per frame
  timelineMaxSize: 100,
  updateInterval: 1000,
};

const componentPerformanceMap = new Map<string, ComponentPerformance>();
const performanceTimeline: PerformanceTimelineEntry[] = [];
let isMonitoring = false;
let updateIntervalId: ReturnType<typeof setInterval> | null = null;
let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

// ===== Component Performance Tracking =====

/**
 * Record a component render
 */
export function recordComponentRender(
  componentId: string,
  componentName: string,
  renderTime: number,
): void {
  if (!isMonitoring) return;

  const existing = componentPerformanceMap.get(componentId);
  const now = Date.now();

  if (existing) {
    existing.renderCount++;
    existing.totalRenderTime += renderTime;
    existing.averageRenderTime = existing.totalRenderTime / existing.renderCount;
    existing.lastRenderTime = renderTime;
    existing.minRenderTime = Math.min(existing.minRenderTime, renderTime);
    existing.maxRenderTime = Math.max(existing.maxRenderTime, renderTime);
    existing.lastRenderTimestamp = now;

    // Keep last N render times
    existing.renderTimes.push(renderTime);
    if (existing.renderTimes.length > performanceConfig.maxRenderHistory) {
      existing.renderTimes.shift();
    }

    // Update frequency
    existing.updateFrequency = calculateUpdateFrequency(existing);
  } else {
    const performance: ComponentPerformance = {
      componentId,
      componentName,
      renderCount: 1,
      totalRenderTime: renderTime,
      averageRenderTime: renderTime,
      lastRenderTime: renderTime,
      minRenderTime: renderTime,
      maxRenderTime: renderTime,
      renderTimes: [renderTime],
      lastRenderTimestamp: now,
      updateFrequency: 'low',
    };
    componentPerformanceMap.set(componentId, performance);
  }

  // Record slow renders
  if (renderTime > performanceConfig.slowRenderThreshold) {
    recordEvent('error:captured', {
      type: 'slow-render',
      componentId,
      componentName,
      renderTime,
    });
  }
}

/**
 * Calculate update frequency based on render count and time
 */
function calculateUpdateFrequency(performance: ComponentPerformance): ComponentPerformance['updateFrequency'] {
  const recentRenders = performance.renderTimes.length;
  const avgTime = performance.averageRenderTime;

  if (recentRenders > 30 || avgTime > 50) return 'extreme';
  if (recentRenders > 15 || avgTime > 30) return 'high';
  if (recentRenders > 5 || avgTime > 16) return 'medium';
  return 'low';
}

/**
 * Get performance data for a component
 */
export function getComponentPerformance(componentId: string): ComponentPerformance | undefined {
  return componentPerformanceMap.get(componentId);
}

/**
 * Get all component performance data
 */
export function getAllComponentPerformance(): ComponentPerformance[] {
  return Array.from(componentPerformanceMap.values());
}

/**
 * Clear component performance data
 */
export function clearComponentPerformance(): void {
  componentPerformanceMap.clear();
}

// ===== Performance Monitoring =====

/**
 * Start performance monitoring
 */
export function startPerformanceMonitoring(): void {
  if (isMonitoring) return;

  isMonitoring = true;
  lastFpsUpdate = performance.now();
  frameCount = 0;

  // Start FPS counter
  requestAnimationFrame(updateFps);

  // Start periodic metrics update
  updateIntervalId = setInterval(() => {
    updatePerformanceMetrics();
  }, performanceConfig.updateInterval);

  sendToPanel({
    type: 'PERFORMANCE_MONITORING_STATUS',
    data: { isMonitoring: true },
  });
}

/**
 * Stop performance monitoring
 */
export function stopPerformanceMonitoring(): void {
  if (!isMonitoring) return;

  isMonitoring = false;

  if (updateIntervalId) {
    clearInterval(updateIntervalId);
    updateIntervalId = null;
  }

  sendToPanel({
    type: 'PERFORMANCE_MONITORING_STATUS',
    data: { isMonitoring: false },
  });
}

/**
 * Check if monitoring is active
 */
export function isPerformanceMonitoring(): boolean {
  return isMonitoring;
}

/**
 * Update FPS counter
 */
function updateFps(): void {
  if (!isMonitoring) return;

  frameCount++;
  const now = performance.now();

  if (now - lastFpsUpdate >= 1000) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = now;
  }

  requestAnimationFrame(updateFps);
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics(): void {
  if (!isMonitoring) return;

  const metrics = collectPerformanceMetrics();
  const slowRenders = findSlowRenders();

  const entry: PerformanceTimelineEntry = {
    timestamp: Date.now(),
    metrics,
    slowRenders,
  };

  performanceTimeline.push(entry);

  // Limit timeline size
  if (performanceTimeline.length > performanceConfig.timelineMaxSize) {
    performanceTimeline.shift();
  }

  // Send update to panel
  sendToPanel({
    type: 'PERFORMANCE_METRICS',
    data: {
      metrics,
      slowRenders,
      timeline: getPerformanceTimelineSummary(),
    },
  });
}

/**
 * Collect current performance metrics
 */
function collectPerformanceMetrics(): PerformanceMetrics {
  const components = getAllComponentPerformance();
  const totalRenders = components.reduce((sum, c) => sum + c.renderCount, 0);
  const avgRenderTime = components.length > 0
    ? components.reduce((sum, c) => sum + c.averageRenderTime, 0) / components.length
    : 0;

  return {
    timestamp: Date.now(),
    totalComponents: components.length,
    totalRenders,
    averageRenderTime: Math.round(avgRenderTime * 100) / 100,
    memoryUsage: getMemoryInfo(),
    fps: currentFps,
  };
}

/**
 * Get memory info if available
 */
function getMemoryInfo(): MemoryInfo | undefined {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const mem = (performance as any).memory;
    return {
      usedJSHeapSize: mem.usedJSHeapSize,
      totalJSHeapSize: mem.totalJSHeapSize,
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
    };
  }
  return undefined;
}

/**
 * Find slow renders
 */
function findSlowRenders(): SlowRenderInfo[] {
  const slowRenders: SlowRenderInfo[] = [];

  for (const perf of componentPerformanceMap.values()) {
    if (perf.lastRenderTime > performanceConfig.slowRenderThreshold) {
      slowRenders.push({
        componentId: perf.componentId,
        componentName: perf.componentName,
        renderTime: perf.lastRenderTime,
        timestamp: perf.lastRenderTimestamp,
      });
    }
  }

  return slowRenders.sort((a, b) => b.renderTime - a.renderTime).slice(0, 10);
}

// ===== Render Heatmap =====

/**
 * Get render heatmap data
 */
export function getRenderHeatmap(): RenderHeatmapData[] {
  const components = getAllComponentPerformance();

  if (components.length === 0) return [];

  // Find max render count for normalization
  const maxRenders = Math.max(...components.map(c => c.renderCount), 1);
  const maxAvgTime = Math.max(...components.map(c => c.averageRenderTime), 1);

  return components.map(c => {
    // Calculate intensity based on render count and average time
    const countIntensity = c.renderCount / maxRenders;
    const timeIntensity = Math.min(c.averageRenderTime / maxAvgTime, 1);
    const intensity = (countIntensity * 0.5 + timeIntensity * 0.5);

    return {
      componentId: c.componentId,
      componentName: c.componentName,
      intensity: Math.round(intensity * 100) / 100,
      renderCount: c.renderCount,
      frequency: c.updateFrequency,
    };
  }).sort((a, b) => b.intensity - a.intensity);
}

// ===== Timeline =====

/**
 * Get performance timeline
 */
export function getPerformanceTimeline(): PerformanceTimelineEntry[] {
  return [...performanceTimeline];
}

/**
 * Get timeline summary (for charts)
 */
export function getPerformanceTimelineSummary(): {
  timestamps: number[];
  fps: number[];
  memory: number[];
  renderCounts: number[];
} {
  return {
    timestamps: performanceTimeline.map(e => e.timestamp),
    fps: performanceTimeline.map(e => e.metrics.fps || 0),
    memory: performanceTimeline.map(e => e.metrics.memoryUsage?.usedJSHeapSize || 0),
    renderCounts: performanceTimeline.map(e => e.metrics.totalRenders),
  };
}

/**
 * Clear performance timeline
 */
export function clearPerformanceTimeline(): void {
  performanceTimeline.length = 0;
}

// ===== Memory Tracking =====

/**
 * Get memory trend data
 */
export function getMemoryTrend(): {
  timestamps: number[];
  used: number[];
  total: number[];
  limit: number[];
} {
  const entries = performanceTimeline.filter(e => e.metrics.memoryUsage);

  return {
    timestamps: entries.map(e => e.timestamp),
    used: entries.map(e => e.metrics.memoryUsage!.usedJSHeapSize / 1024 / 1024), // MB
    total: entries.map(e => e.metrics.memoryUsage!.totalJSHeapSize / 1024 / 1024), // MB
    limit: entries.map(e => e.metrics.memoryUsage!.jsHeapSizeLimit / 1024 / 1024), // MB
  };
}

/**
 * Force garbage collection hint (if available)
 */
export function suggestGarbageCollection(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).gc) {
    try {
      (globalThis as any).gc();
      sendToPanel({
        type: 'GC_SUGGESTED',
        data: { success: true },
      });
    } catch (e) {
      sendToPanel({
        type: 'GC_SUGGESTED',
        data: { success: false, error: String(e) },
      });
    }
  } else {
    sendToPanel({
      type: 'GC_SUGGESTED',
      data: { success: false, error: 'GC not available' },
    });
  }
}

// ===== Config =====

/**
 * Update performance config
 */
export function updatePerformanceConfig(config: Partial<PerformanceConfig>): void {
  Object.assign(performanceConfig, config);

  sendToPanel({
    type: 'PERFORMANCE_CONFIG_UPDATED',
    data: performanceConfig,
  });
}

/**
 * Get performance config
 */
export function getPerformanceConfig(): PerformanceConfig {
  return { ...performanceConfig };
}

// ===== Panel Integration =====

/**
 * Initialize performance panel
 */
export function initPerformancePanel(): () => void {
  const unsubscribe = onPanelMessage((message: unknown) => {
    const msg = message as { type: string; data?: unknown };

    switch (msg.type) {
      case 'START_PERFORMANCE_MONITORING':
        startPerformanceMonitoring();
        break;

      case 'STOP_PERFORMANCE_MONITORING':
        stopPerformanceMonitoring();
        break;

      case 'GET_PERFORMANCE_METRICS':
        handleGetPerformanceMetrics();
        break;

      case 'GET_RENDER_HEATMAP':
        handleGetRenderHeatmap();
        break;

      case 'GET_COMPONENT_PERFORMANCE':
        handleGetComponentPerformance(msg.data as { componentId: string });
        break;

      case 'GET_PERFORMANCE_TIMELINE':
        handleGetPerformanceTimeline();
        break;

      case 'GET_MEMORY_TREND':
        handleGetMemoryTrend();
        break;

      case 'CLEAR_PERFORMANCE_DATA':
        clearComponentPerformance();
        clearPerformanceTimeline();
        sendToPanel({ type: 'PERFORMANCE_DATA_CLEARED', data: {} });
        break;

      case 'SUGGEST_GC':
        suggestGarbageCollection();
        break;

      case 'UPDATE_PERFORMANCE_CONFIG':
        if (msg.data) {
          updatePerformanceConfig(msg.data as Partial<PerformanceConfig>);
        }
        break;

      case 'GET_PERFORMANCE_CONFIG':
        sendToPanel({
          type: 'PERFORMANCE_CONFIG',
          data: getPerformanceConfig(),
        });
        break;
    }
  });

  return unsubscribe;
}

function handleGetPerformanceMetrics(): void {
  const metrics = collectPerformanceMetrics();
  const slowRenders = findSlowRenders();

  sendToPanel({
    type: 'PERFORMANCE_METRICS',
    data: {
      metrics,
      slowRenders,
      isMonitoring,
    },
  });
}

function handleGetRenderHeatmap(): void {
  const heatmap = getRenderHeatmap();

  sendToPanel({
    type: 'RENDER_HEATMAP',
    data: heatmap,
  });
}

function handleGetComponentPerformance(data: { componentId: string } | undefined): void {
  if (!data?.componentId) return;

  const performance = getComponentPerformance(data.componentId);

  sendToPanel({
    type: 'COMPONENT_PERFORMANCE',
    data: performance,
  });
}

function handleGetPerformanceTimeline(): void {
  sendToPanel({
    type: 'PERFORMANCE_TIMELINE',
    data: getPerformanceTimelineSummary(),
  });
}

function handleGetMemoryTrend(): void {
  sendToPanel({
    type: 'MEMORY_TREND',
    data: getMemoryTrend(),
  });
}

// ===== Exports =====

export {
  performanceConfig,
  componentPerformanceMap,
  performanceTimeline,
};
