/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect, vi } from 'vitest';

const pluginChart = require('../dist/index.cjs');

const createChart = pluginChart.createChart;
const DEFAULT_COLORS = pluginChart.DEFAULT_COLORS;

describe('@lytjs/plugin-chart', () => {
  // 模拟 Canvas 环境
  const mockCanvas = document.createElement('canvas');
  mockCanvas.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    getTransform: vi.fn().mockReturnValue({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    isPointInPath: vi.fn().mockReturnValue(false),
    isPointInStroke: vi.fn().mockReturnValue(false),
  });

  describe('Plugin exports', () => {
    it('should export default plugin', () => {
      expect(pluginChart.default).toBeDefined();
      expect(pluginChart.default.name).toBe('chart');
    });

    it('should export createChart function', () => {
      expect(typeof createChart).toBe('function');
    });

    it('should export DEFAULT_COLORS', () => {
      expect(Array.isArray(DEFAULT_COLORS)).toBe(true);
      expect(DEFAULT_COLORS.length).toBeGreaterThan(0);
    });
  });

  describe('createChart', () => {
    const testConfig = {
      type: 'bar',
      datasets: [
        {
          label: 'Test Dataset',
          data: [
            { label: 'A', value: 10 },
            { label: 'B', value: 20 },
            { label: 'C', value: 30 },
          ],
        },
      ],
    };

    it('should create a chart instance', () => {
      const chart = createChart(mockCanvas, testConfig);
      expect(chart).toBeDefined();
      expect(typeof chart.render).toBe('function');
      expect(typeof chart.updateData).toBe('function');
      expect(typeof chart.destroy).toBe('function');
      expect(typeof chart.getCanvas).toBe('function');
    });

    it('should return the same canvas element', () => {
      const chart = createChart(mockCanvas, testConfig);
      expect(chart.getCanvas()).toBe(mockCanvas);
    });

    it('should support all chart types', () => {
      const types = ['bar', 'line', 'pie', 'doughnut'];
      types.forEach((type) => {
        expect(() => {
          createChart(mockCanvas, { ...testConfig, type });
        }).not.toThrow();
      });
    });

    it('should update data successfully', () => {
      const chart = createChart(mockCanvas, testConfig);
      const newData = [
        {
          label: 'New Dataset',
          data: [
            { label: 'X', value: 100 },
            { label: 'Y', value: 200 },
          ],
        },
      ];
      expect(() => chart.updateData(newData)).not.toThrow();
    });

    it('should destroy without errors', () => {
      const chart = createChart(mockCanvas, testConfig);
      expect(() => chart.destroy()).not.toThrow();
    });
  });

  describe('Plugin installation', () => {
    it('should have install function', () => {
      expect(typeof pluginChart.default.install).toBe('function');
    });

    it('should provide chart creation via app.provide', () => {
      const mockApp = {
        provide: vi.fn(),
        config: {
          globalProperties: {},
        },
      };
      pluginChart.default.install(mockApp, {});
      expect(mockApp.provide).toHaveBeenCalledWith('lyt-chart', expect.any(Object));
      expect(mockApp.config.globalProperties.$chart).toBeDefined();
    });
  });
});
