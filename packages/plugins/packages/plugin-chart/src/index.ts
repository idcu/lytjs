/**
 * @lytjs/plugin-chart
 *
 * LytJS official chart plugin for rendering charts using Canvas API with zero dependencies.
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import type {
  ChartDataPoint,
  ChartDataset,
  ChartType,
  ChartConfig,
  ChartInstance,
  ChartPluginOptions,
} from './types';

// 默认颜色 palette
const DEFAULT_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#ff4d4f',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa541c',
];

// 默认配置
const DEFAULT_CONFIG = {
  showLegend: true,
  showGrid: true,
  width: 400,
  height: 300,
  animationDuration: 500,
  padding: 40,
};

/**
 * 创建图表实例
 */
function createChart(
  canvas: HTMLCanvasElement,
  config: ChartConfig,
  options: ChartPluginOptions = {},
): ChartInstance {
  const { defaultAnimationDuration = 500 } = options;

  const currentConfig = { ...DEFAULT_CONFIG, ...config };
  let animationFrame: number | null = null;

  // 获取颜色
  function getColor(datasetIndex: number, dataIndex: number): string {
    const dataset = currentConfig.datasets[datasetIndex];
    const dataPoint = dataset?.data?.[dataIndex];
    if (dataPoint?.color) return dataPoint.color;
    if (dataset?.color) return dataset.color;
    const colorIndex = dataIndex % DEFAULT_COLORS.length;
    return DEFAULT_COLORS[colorIndex] || '#1890ff';
  }

  // 绘制柱状图
  function drawBarChart(ctx: CanvasRenderingContext2D, progress: number = 1) {
    const { width, height, padding, datasets, showGrid } = currentConfig;
    const ctxWidth = width - padding * 2;
    const ctxHeight = height - padding * 2;

    // 找到最大值
    let maxValue = 0;
    datasets.forEach((dataset) => {
      dataset.data.forEach((point) => {
        if (point.value > maxValue) maxValue = point.value;
      });
    });

    // 绘制网格线
    if (showGrid) {
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (ctxHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        // Y轴标签
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxValue - (maxValue / 5) * i).toString(), padding - 10, y + 4);
      }
    }

    // 绘制柱状图
    const totalBars = datasets.reduce((sum, ds) => sum + ds.data.length, 0);
    const barWidth = (ctxWidth / totalBars) * 0.7;
    const gap = (ctxWidth / totalBars) * 0.3;

    let x = padding + gap / 2;

    datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((point, dataIndex) => {
        const barHeight = (point.value / maxValue) * ctxHeight * progress;
        const y = height - padding - barHeight;

        ctx.fillStyle = getColor(datasetIndex, dataIndex);
        ctx.fillRect(x, y, barWidth, barHeight);

        // X轴标签
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(point.label, x + barWidth / 2, height - padding + 20);

        x += barWidth + gap;
      });
    });
  }

  // 绘制折线图
  function drawLineChart(ctx: CanvasRenderingContext2D, progress: number = 1) {
    const { width, height, padding, datasets, showGrid } = currentConfig;
    const ctxWidth = width - padding * 2;
    const ctxHeight = height - padding * 2;

    // 找到最大值
    let maxValue = 0;
    datasets.forEach((dataset) => {
      dataset.data.forEach((point) => {
        if (point.value > maxValue) maxValue = point.value;
      });
    });

    // 绘制网格线
    if (showGrid) {
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (ctxHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        // Y轴标签
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxValue - (maxValue / 5) * i).toString(), padding - 10, y + 4);
      }
    }

    // 绘制折线
    datasets.forEach((dataset, datasetIndex) => {
      const color = getColor(datasetIndex, 0);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = dataset.borderWidth || 2;
      ctx.beginPath();

      const stepX = ctxWidth / (dataset.data.length - 1);

      dataset.data.forEach((point, index) => {
        const x = padding + stepX * index;
        const y = height - padding - (point.value / maxValue) * ctxHeight * progress;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        // 绘制点
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);

        // X轴标签
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(point.label, x, height - padding + 20);
      });

      ctx.stroke();
    });
  }

  // 绘制饼图
  function drawPieChart(ctx: CanvasRenderingContext2D, progress: number = 1) {
    const { width, height, padding, datasets } = currentConfig;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - padding;

    // 计算总值
    let totalValue = 0;
    datasets.forEach((dataset) => {
      dataset.data.forEach((point) => {
        totalValue += point.value;
      });
    });

    let currentAngle = -Math.PI / 2; // 从顶部开始

    datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((point, dataIndex) => {
        const sliceAngle = (point.value / totalValue) * Math.PI * 2 * progress;

        ctx.fillStyle = getColor(datasetIndex, dataIndex);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();

        currentAngle += sliceAngle;
      });
    });
  }

  // 绘制环形图
  function drawDoughnutChart(ctx: CanvasRenderingContext2D, progress: number = 1) {
    const { width, height, padding, datasets } = currentConfig;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - padding;
    const innerRadius = outerRadius * 0.5;

    // 计算总值
    let totalValue = 0;
    datasets.forEach((dataset) => {
      dataset.data.forEach((point) => {
        totalValue += point.value;
      });
    });

    let currentAngle = -Math.PI / 2;

    datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((point, dataIndex) => {
        const sliceAngle = (point.value / totalValue) * Math.PI * 2 * progress;

        ctx.fillStyle = getColor(datasetIndex, dataIndex);
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fill();

        currentAngle += sliceAngle;
      });
    });
  }

  // 绘制标题
  function drawTitle(ctx: CanvasRenderingContext2D) {
    if (!currentConfig.title) return;

    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(currentConfig.title, currentConfig.width / 2, 25);
  }

  // 绘制图例
  function drawLegend(ctx: CanvasRenderingContext2D) {
    if (!currentConfig.showLegend) return;

    let legendX = currentConfig.padding;
    const legendY = currentConfig.height - 20;

    currentConfig.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((point, dataIndex) => {
        const color = getColor(datasetIndex, dataIndex);

        // 绘制颜色方块
        ctx.fillStyle = color;
        ctx.fillRect(legendX, legendY, 12, 12);

        // 绘制标签
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(point.label, legendX + 18, legendY + 10);

        legendX += 100;
      });
    });
  }

  // 渲染函数
  function render() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置 canvas 尺寸
    canvas.width = currentConfig.width;
    canvas.height = currentConfig.height;

    // 清空画布
    ctx.clearRect(0, 0, currentConfig.width, currentConfig.height);

    const startTime = Date.now();
    const duration = currentConfig.animationDuration || defaultAnimationDuration;

    function animate() {
      if (!ctx) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, currentConfig.width, currentConfig.height);

      // 绘制标题
      drawTitle(ctx);

      // 绘制图表
      switch (currentConfig.type) {
        case 'bar':
          drawBarChart(ctx, progress);
          break;
        case 'line':
          drawLineChart(ctx, progress);
          break;
        case 'pie':
          drawPieChart(ctx, progress);
          break;
        case 'doughnut':
          drawDoughnutChart(ctx, progress);
          break;
      }

      // 绘制图例
      drawLegend(ctx);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    animate();
  }

  // 更新数据
  function updateData(datasets: ChartDataset[]) {
    currentConfig.datasets = datasets;
    render();
  }

  // 销毁
  function destroy() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  }

  // 初始化渲染
  render();

  return {
    render,
    updateData,
    destroy,
    getCanvas: () => canvas,
  };
}

const pluginChart = definePlugin({
  name: 'chart',
  version: '6.0.0',
  description: 'LytJS official chart plugin for rendering charts using Canvas API',
  author: 'LytJS Team',
  keywords: ['lytjs', 'chart', 'canvas', 'visualization'],
  schema: {
    type: 'object',
    object: {
      properties: {
        defaultColors: {
          type: 'array',
          default: DEFAULT_COLORS,
        },
        defaultAnimationDuration: { type: 'number', default: 500 },
        responsive: { type: 'boolean', default: true },
      },
    },
  },
  install(app, options) {
    const chartOptions = options as ChartPluginOptions;

    // 提供创建图表的方法
    app.provide('lyt-chart', {
      create: (canvas: HTMLCanvasElement, config: ChartConfig) =>
        createChart(canvas, config, chartOptions),
    });

    // 挂载到全局属性
    app.config.globalProperties.$chart = {
      create: (canvas: HTMLCanvasElement, config: ChartConfig) =>
        createChart(canvas, config, chartOptions),
    };
  },
});

export default pluginChart;
export type {
  ChartDataPoint,
  ChartDataset,
  ChartType,
  ChartConfig,
  ChartInstance,
  ChartPluginOptions,
};
export { createChart, DEFAULT_COLORS };
