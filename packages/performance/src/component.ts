/**
 * @lytjs/performance — 组件渲染追踪
 *
 * 追踪组件渲染性能，检测频繁重渲染和慢渲染组件。
 * 使用 performance.mark/measure 实现高精度计时。
 *
 * 零运行时依赖，优雅降级。
 */

import type {
  RenderRecord,
  ComponentStats,
  SlowComponent,
  ComponentTrackingConfig,
} from './types';

// ============================================================
// 内部状态
// ============================================================

/** 组件渲染数据存储 */
const componentData: Map<string, {
  renderCount: number;
  totalDuration: number;
  maxDuration: number;
  minDuration: number;
  lastDuration: number;
  lastTimestamp: number;
  isFrequentRerender: boolean;
  records: RenderRecord[];
}> = new Map();

/** 配置 */
let config: Required<ComponentTrackingConfig> = {
  frequentThreshold: 16.67,  // 60fps 对应的帧时间
  maxRecords: 50,
  slowThreshold: 50,
};

/** 是否已初始化 */
let initialized = false;

// ============================================================
// 公共 API
// ============================================================

/**
 * 初始化组件渲染追踪
 *
 * @param trackingConfig - 追踪配置（可选）
 */
export function initComponentTracking(trackingConfig?: ComponentTrackingConfig): void {
  if (initialized) return;

  if (trackingConfig) {
    if (trackingConfig.frequentThreshold !== undefined) {
      config.frequentThreshold = trackingConfig.frequentThreshold;
    }
    if (trackingConfig.maxRecords !== undefined) {
      config.maxRecords = trackingConfig.maxRecords;
    }
    if (trackingConfig.slowThreshold !== undefined) {
      config.slowThreshold = trackingConfig.slowThreshold;
    }
  }

  initialized = true;
}

/**
 * 追踪组件渲染开始
 *
 * 返回一个结束函数，调用时记录渲染耗时。
 * 使用 performance.mark/measure 实现高精度计时。
 *
 * @param name - 组件名称
 * @returns 结束函数，调用时完成渲染计时
 *
 * @example
 * ```ts
 * const endRender = trackComponentRender('MyComponent');
 * // ... 渲染逻辑 ...
 * endRender();
 * ```
 */
export function trackComponentRender(name: string): () => void {
  if (!initialized) return () => {};

  const startMark = `lyt-render-start:${name}:${Date.now()}`;
  const endMark = `lyt-render-end:${name}:${Date.now()}`;

  // 使用 performance.mark 记录开始时间
  const startTime = typeof performance !== 'undefined' && performance.mark
    ? (performance.mark(startMark), performance.now())
    : Date.now();

  return () => {
    // 使用 performance.mark 记录结束时间
    let duration: number;
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(endMark);
      const measureName = `lyt-render:${name}`;
      try {
        performance.measure(measureName, startMark, endMark);
        const measures = performance.getEntriesByName(measureName);
        duration = measures.length > 0 ? measures[measures.length - 1].duration : Date.now() - startTime;
      } catch {
        duration = performance.now() - startTime;
      }
      // 清理 marks 和 measure
      try { performance.clearMarks(startMark); } catch { /* ignore */ }
      try { performance.clearMarks(endMark); } catch { /* ignore */ }
      try { performance.clearMeasures(`lyt-render:${name}`); } catch { /* ignore */ }
    } else {
      duration = Date.now() - startTime;
    }

    // 更新组件数据
    const existing = componentData.get(name);
    const now = Date.now();

    if (existing) {
      existing.renderCount++;
      existing.totalDuration += duration;
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.lastDuration = duration;
      existing.lastTimestamp = now;

      // 检测频繁重渲染：两次渲染间隔小于阈值
      const timeSinceLastRender = now - existing.lastTimestamp;
      if (timeSinceLastRender < config.frequentThreshold && duration < config.frequentThreshold) {
        existing.isFrequentRerender = true;
      }

      // 添加渲染记录
      existing.records.push({ name, duration, timestamp: now });
      if (existing.records.length > config.maxRecords) {
        existing.records.shift();
      }
    } else {
      componentData.set(name, {
        renderCount: 1,
        totalDuration: duration,
        maxDuration: duration,
        minDuration: duration,
        lastDuration: duration,
        lastTimestamp: now,
        isFrequentRerender: false,
        records: [{ name, duration, timestamp: now }],
      });
    }
  };
}

/**
 * 获取所有组件的渲染统计
 *
 * @returns 组件名到统计数据的映射
 */
export function getComponentStats(): Record<string, ComponentStats> {
  const result: Record<string, ComponentStats> = {};

  componentData.forEach((data, name) => {
    result[name] = {
      name,
      renderCount: data.renderCount,
      totalDuration: data.totalDuration,
      avgDuration: data.renderCount > 0 ? data.totalDuration / data.renderCount : 0,
      maxDuration: data.maxDuration,
      minDuration: data.minDuration,
      lastDuration: data.lastDuration,
      isFrequentRerender: data.isFrequentRerender,
      records: data.records.map((r) => ({ ...r })),
    };
  });

  return result;
}

/**
 * 获取慢渲染组件列表
 *
 * 平均渲染时间超过阈值的组件。
 *
 * @param threshold - 慢渲染阈值（毫秒），默认使用配置值
 * @returns 慢渲染组件列表，按平均耗时降序排列
 */
export function getSlowComponents(threshold?: number): SlowComponent[] {
  const slowThreshold = threshold ?? config.slowThreshold;
  const result: SlowComponent[] = [];

  componentData.forEach((data, name) => {
    const avgDuration = data.renderCount > 0 ? data.totalDuration / data.renderCount : 0;
    if (avgDuration >= slowThreshold) {
      result.push({
        name,
        avgDuration,
        maxDuration: data.maxDuration,
        renderCount: data.renderCount,
      });
    }
  });

  // 按平均耗时降序排列
  result.sort((a, b) => b.avgDuration - a.avgDuration);

  return result;
}

/**
 * 获取频繁重渲染的组件列表
 *
 * @returns 频繁重渲染的组件名称列表
 */
export function getFrequentRerenderComponents(): string[] {
  const result: string[] = [];

  componentData.forEach((data, name) => {
    if (data.isFrequentRerender) {
      result.push(name);
    }
  });

  return result;
}

/**
 * 重置所有组件渲染数据
 */
export function resetComponentStats(): void {
  componentData.clear();
}

/**
 * 销毁组件渲染追踪
 */
export function destroyComponentTracking(): void {
  componentData.clear();
  initialized = false;
}

/**
 * 检查组件渲染追踪是否已初始化
 */
export function isComponentTrackingInitialized(): boolean {
  return initialized;
}

/**
 * 更新追踪配置
 *
 * @param newConfig - 新配置
 */
export function updateComponentConfig(newConfig: Partial<ComponentTrackingConfig>): void {
  if (newConfig.frequentThreshold !== undefined) {
    config.frequentThreshold = newConfig.frequentThreshold;
  }
  if (newConfig.maxRecords !== undefined) {
    config.maxRecords = newConfig.maxRecords;
  }
  if (newConfig.slowThreshold !== undefined) {
    config.slowThreshold = newConfig.slowThreshold;
  }
}
