/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PerformanceMonitor,
  getPerformanceMonitor,
  setPerformanceMonitor,
  initPerformanceMonitor,
  startRenderTiming,
  recordRenderEntry,
  getComponentStats,
  generatePerformanceReport,
  isPerformanceMonitoringEnabled,
  setPerformanceMonitoringEnabled,
  withPerformanceTracking,
} from '../src/index';
import type { RenderPerformanceEntry, PerformanceMonitorOptions } from '../src/index';

describe('@lytjs/common-performance', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ maxHistorySize: 10, enabled: true });
  });

  describe('PerformanceMonitor', () => {
    describe('构造函数', () => {
      it('应使用默认选项创建', () => {
        const m = new PerformanceMonitor();
        expect(m.enabled).toBe(true);
        expect(m.getHistory()).toHaveLength(0);
      });

      it('应使用自定义选项创建', () => {
        const m = new PerformanceMonitor({ maxHistorySize: 50, enabled: false });
        expect(m.enabled).toBe(false);
      });
    });

    describe('enabled 属性', () => {
      it('应能切换启用/禁用状态', () => {
        expect(monitor.enabled).toBe(true);
        monitor.enabled = false;
        expect(monitor.enabled).toBe(false);
        monitor.enabled = true;
        expect(monitor.enabled).toBe(true);
      });

      it('禁用时应跳过记录', () => {
        monitor.enabled = false;
        monitor.recordEntry({
          componentName: 'Test',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        expect(monitor.getHistory()).toHaveLength(0);
      });
    });

    describe('startTiming / recordEntry', () => {
      it('应返回结束计时函数', () => {
        const endTiming = monitor.startTiming('CompA', 'mount');
        expect(typeof endTiming).toBe('function');
      });

      it('结束计时后应记录条目', () => {
        const endTiming = monitor.startTiming('CompA', 'mount');
        const entry = endTiming();
        expect(entry).not.toBeNull();
        expect(entry!.componentName).toBe('CompA');
        expect(entry!.operation).toBe('mount');
        expect(entry!.duration).toBeGreaterThanOrEqual(0);
      });

      it('禁用时应返回空函数', () => {
        monitor.enabled = false;
        const endTiming = monitor.startTiming('CompA', 'mount');
        const entry = endTiming();
        expect(entry).toBeNull();
      });

      it('应支持 metadata 参数', () => {
        const endTiming = monitor.startTiming('CompA', 'patch', { key: 'value' });
        const entry = endTiming({ extra: 'data' });
        expect(entry!.metadata).toEqual({ key: 'value', extra: 'data' });
      });

      it('recordEntry 应直接记录条目', () => {
        const entry: RenderPerformanceEntry = {
          componentName: 'CompB',
          operation: 'patch',
          startTime: 100,
          endTime: 200,
          duration: 100,
        };
        monitor.recordEntry(entry);
        expect(monitor.getHistory()).toHaveLength(1);
        expect(monitor.getHistory()[0].componentName).toBe('CompB');
      });
    });

    describe('getStats / getAllStats', () => {
      it('未记录时应返回 undefined', () => {
        expect(monitor.getStats('CompA')).toBeUndefined();
      });

      it('记录后应返回正确的统计信息', () => {
        const endTiming = monitor.startTiming('CompA', 'mount');
        endTiming();

        const stats = monitor.getStats('CompA');
        expect(stats).toBeDefined();
        expect(stats!.componentName).toBe('CompA');
        expect(stats!.mountCount).toBe(1);
        expect(stats!.totalMountTime).toBeGreaterThanOrEqual(0);
        expect(stats!.averageMountTime).toBeGreaterThanOrEqual(0);
      });

      it('多次记录后应正确计算平均值', () => {
        monitor.recordEntry({
          componentName: 'CompA',
          operation: 'patch',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        monitor.recordEntry({
          componentName: 'CompA',
          operation: 'patch',
          startTime: 0,
          endTime: 20,
          duration: 20,
        });

        const stats = monitor.getStats('CompA');
        expect(stats!.patchCount).toBe(2);
        expect(stats!.averagePatchTime).toBe(15);
        expect(stats!.maxPatchTime).toBe(20);
      });

      it('getAllStats 应返回所有组件统计', () => {
        monitor.recordEntry({
          componentName: 'CompA',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        monitor.recordEntry({
          componentName: 'CompB',
          operation: 'patch',
          startTime: 0,
          endTime: 20,
          duration: 20,
        });

        const allStats = monitor.getAllStats();
        expect(allStats).toHaveLength(2);
      });
    });

    describe('getHistory / getComponentHistory / getOperationHistory', () => {
      it('getHistory 应返回所有记录', () => {
        monitor.recordEntry({
          componentName: 'CompA',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        monitor.recordEntry({
          componentName: 'CompB',
          operation: 'patch',
          startTime: 0,
          endTime: 20,
          duration: 20,
        });

        expect(monitor.getHistory()).toHaveLength(2);
      });

      it('getComponentHistory 应过滤指定组件', () => {
        monitor.recordEntry({
          componentName: 'CompA',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        monitor.recordEntry({
          componentName: 'CompB',
          operation: 'patch',
          startTime: 0,
          endTime: 20,
          duration: 20,
        });

        expect(monitor.getComponentHistory('CompA')).toHaveLength(1);
        expect(monitor.getComponentHistory('CompB')).toHaveLength(1);
        expect(monitor.getComponentHistory('CompC')).toHaveLength(0);
      });

      it('getOperationHistory 应过滤指定操作类型', () => {
        monitor.recordEntry({
          componentName: 'CompA',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        monitor.recordEntry({
          componentName: 'CompA',
          operation: 'patch',
          startTime: 0,
          endTime: 20,
          duration: 20,
        });

        expect(monitor.getOperationHistory('mount')).toHaveLength(1);
        expect(monitor.getOperationHistory('patch')).toHaveLength(1);
        expect(monitor.getOperationHistory('unmount')).toHaveLength(0);
      });
    });

    describe('getSlowestRenders', () => {
      it('应按持续时间降序返回', () => {
        monitor.recordEntry({
          componentName: 'A',
          operation: 'mount',
          startTime: 0,
          endTime: 5,
          duration: 5,
        });
        monitor.recordEntry({
          componentName: 'B',
          operation: 'mount',
          startTime: 0,
          endTime: 30,
          duration: 30,
        });
        monitor.recordEntry({
          componentName: 'C',
          operation: 'mount',
          startTime: 0,
          endTime: 15,
          duration: 15,
        });

        const slowest = monitor.getSlowestRenders(2);
        expect(slowest).toHaveLength(2);
        expect(slowest[0].duration).toBe(30);
        expect(slowest[1].duration).toBe(15);
      });
    });

    describe('getGlobalAverageRenderTime / getGlobalTotalRenderTime', () => {
      it('无记录时平均时间应为 0', () => {
        expect(monitor.getGlobalAverageRenderTime()).toBe(0);
        expect(monitor.getGlobalTotalRenderTime()).toBe(0);
      });

      it('应正确计算全局统计', () => {
        monitor.recordEntry({
          componentName: 'A',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        monitor.recordEntry({
          componentName: 'B',
          operation: 'patch',
          startTime: 0,
          endTime: 30,
          duration: 30,
        });

        expect(monitor.getGlobalTotalRenderTime()).toBe(40);
        expect(monitor.getGlobalAverageRenderTime()).toBe(20);
      });
    });

    describe('clear / clearComponent', () => {
      it('clear 应清除所有历史和统计', () => {
        monitor.recordEntry({
          componentName: 'A',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        monitor.clear();
        expect(monitor.getHistory()).toHaveLength(0);
        expect(monitor.getAllStats()).toHaveLength(0);
      });

      it('clearComponent 应仅清除指定组件', () => {
        monitor.recordEntry({
          componentName: 'A',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        monitor.recordEntry({
          componentName: 'B',
          operation: 'patch',
          startTime: 0,
          endTime: 20,
          duration: 20,
        });

        monitor.clearComponent('A');
        expect(monitor.getComponentHistory('A')).toHaveLength(0);
        expect(monitor.getComponentHistory('B')).toHaveLength(1);
        expect(monitor.getStats('A')).toBeUndefined();
        expect(monitor.getStats('B')).toBeDefined();
      });
    });

    describe('generateReport', () => {
      it('无记录时应返回空报告', () => {
        const report = monitor.generateReport();
        expect(report.totalRenders).toBe(0);
        expect(report.totalRenderTime).toBe(0);
        expect(report.averageRenderTime).toBe(0);
        expect(report.componentCount).toBe(0);
        expect(report.slowestComponent).toBeNull();
        expect(report.mostRenderedComponent).toBeNull();
      });

      it('有记录时应返回正确报告', () => {
        monitor.recordEntry({
          componentName: 'A',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        monitor.recordEntry({
          componentName: 'B',
          operation: 'patch',
          startTime: 0,
          endTime: 30,
          duration: 30,
        });

        const report = monitor.generateReport();
        expect(report.totalRenders).toBe(2);
        expect(report.totalRenderTime).toBe(40);
        expect(report.averageRenderTime).toBe(20);
        expect(report.componentCount).toBe(2);
        expect(report.slowestComponent).toBe('B');
        expect(report.mostRenderedComponent).toBe('B');
        expect(report.timestamp).toBeGreaterThan(0);
      });
    });

    describe('环形缓冲区', () => {
      it('超过 maxHistorySize 时应覆盖最旧记录', () => {
        const smallMonitor = new PerformanceMonitor({ maxHistorySize: 3 });
        for (let i = 0; i < 5; i++) {
          smallMonitor.recordEntry({
            componentName: `Comp${i}`,
            operation: 'mount',
            startTime: 0,
            endTime: i * 10,
            duration: i * 10,
          });
        }

        const history = smallMonitor.getHistory();
        expect(history).toHaveLength(3);
        // 最旧的记录应被覆盖，保留最新的 3 条
        expect(history[0].componentName).toBe('Comp2');
        expect(history[1].componentName).toBe('Comp3');
        expect(history[2].componentName).toBe('Comp4');
      });
    });

    describe('回调', () => {
      it('onEntry 应在记录条目时被调用', () => {
        const onEntry = vi.fn();
        const m = new PerformanceMonitor({ onEntry });
        m.recordEntry({
          componentName: 'A',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        expect(onEntry).toHaveBeenCalledTimes(1);
        expect(onEntry).toHaveBeenCalledWith(expect.objectContaining({ componentName: 'A' }));
      });

      it('onStatsUpdate 应在统计更新时被调用', () => {
        const onStatsUpdate = vi.fn();
        const m = new PerformanceMonitor({ onStatsUpdate });
        m.recordEntry({
          componentName: 'A',
          operation: 'mount',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        expect(onStatsUpdate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('全局实例函数', () => {
    beforeEach(() => {
      initPerformanceMonitor({ maxHistorySize: 10, enabled: true });
    });

    describe('getPerformanceMonitor / setPerformanceMonitor', () => {
      it('应返回同一个实例', () => {
        const a = getPerformanceMonitor();
        const b = getPerformanceMonitor();
        expect(a).toBe(b);
      });

      it('setPerformanceMonitor 应替换全局实例', () => {
        const custom = new PerformanceMonitor({ maxHistorySize: 5 });
        setPerformanceMonitor(custom);
        expect(getPerformanceMonitor()).toBe(custom);
      });
    });

    describe('initPerformanceMonitor', () => {
      it('应创建新的全局实例', () => {
        const m = initPerformanceMonitor({ maxHistorySize: 20 });
        expect(m).toBe(getPerformanceMonitor());
        expect(m.enabled).toBe(true);
      });
    });

    describe('startRenderTiming', () => {
      it('应使用全局 monitor 计时', () => {
        const endTiming = startRenderTiming('GlobalComp', 'mount');
        const entry = endTiming();
        expect(entry).not.toBeNull();
        expect(entry!.componentName).toBe('GlobalComp');
      });
    });

    describe('recordRenderEntry', () => {
      it('应使用全局 monitor 记录', () => {
        recordRenderEntry({
          componentName: 'GlobalComp',
          operation: 'patch',
          startTime: 0,
          endTime: 10,
          duration: 10,
        });
        expect(getComponentStats('GlobalComp')).toBeDefined();
      });
    });

    describe('isPerformanceMonitoringEnabled / setPerformanceMonitoringEnabled', () => {
      it('应正确反映全局 monitor 状态', () => {
        expect(isPerformanceMonitoringEnabled()).toBe(true);
        setPerformanceMonitoringEnabled(false);
        expect(isPerformanceMonitoringEnabled()).toBe(false);
        setPerformanceMonitoringEnabled(true);
        expect(isPerformanceMonitoringEnabled()).toBe(true);
      });
    });

    describe('generatePerformanceReport', () => {
      it('应使用全局 monitor 生成报告', () => {
        const report = generatePerformanceReport();
        expect(report).toBeDefined();
        expect(typeof report.timestamp).toBe('number');
      });
    });
  });

  describe('withPerformanceTracking', () => {
    it('应包装函数并记录性能', () => {
      const fn = (x: number) => x * 2;
      const wrapped = withPerformanceTracking('TrackedComp', fn, 'patch');

      const result = wrapped(5);
      expect(result).toBe(10);
      expect(getComponentStats('TrackedComp')).toBeDefined();
    });

    it('函数抛出异常时应仍记录性能', () => {
      const fn = () => {
        throw new Error('test error');
      };
      const wrapped = withPerformanceTracking('ErrorComp', fn, 'mount');

      expect(() => wrapped()).toThrow('test error');
      // 异常时也应记录
      expect(getComponentStats('ErrorComp')).toBeDefined();
    });
  });
});
