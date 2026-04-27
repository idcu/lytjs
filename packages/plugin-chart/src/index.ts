// Lyt.js 图表插件
//
// 用法：
//   import { createChart } from '@lytjs/plugin-chart'
//   const chart = createChart(document.getElementById('chart'), {
//     type: 'bar',
//     data: {
//       labels: ['一月', '二月', '三月', '四月', '五月'],
//       datasets: [
//         { label: '销售额', data: [120, 200, 150, 80, 170], color: '#42b883' },
//       ],
//     },
//     options: {
//       title: '月度销售统计',
//       width: 600,
//       height: 400,
//     },
//   })
//   // 更新数据：chart.update(newData)
//   // 销毁图表：chart.destroy()

// ======================== 类型定义 ========================

/** 图表类型 */
type ChartType = 'bar' | 'line';

/** 数据集 */
interface ChartDataset {
  /** 数据集标签 */
  label: string;
  /** 数据值数组 */
  data: number[];
  /** 数据集颜色 */
  color?: string;
  /** 数据集背景色（柱状图填充色） */
  backgroundColor?: string;
}

/** 图表数据 */
interface ChartData {
  /** X 轴标签 */
  labels: string[];
  /** 数据集列表 */
  datasets: ChartDataset[];
}

/** 图表配置选项 */
interface ChartOptions {
  /** 图表标题 */
  title?: string;
  /** 图表宽度（像素），默认 600 */
  width?: number;
  /** 图表高度（像素），默认 400 */
  height?: number;
  /** 是否显示网格线，默认 true */
  showGrid?: boolean;
  /** 是否显示图例，默认 true */
  showLegend?: boolean;
  /** 是否显示数值标签，默认 false */
  showValues?: boolean;
  /** 动画时长（毫秒），默认 500 */
  animationDuration?: number;
  /** 内边距 */
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Y 轴最大值 */
  yMax?: number;
  /** Y 轴最小值 */
  yMin?: number;
}

/** 已解析的图表选项（所有属性均为必填） */
interface ResolvedChartOptions {
  title: string;
  width: number;
  height: number;
  showGrid: boolean;
  showLegend: boolean;
  showValues: boolean;
  animationDuration: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  yMax: number;
  yMin: number;
}

/** 图表创建参数 */
interface ChartConfig {
  /** 图表类型 */
  type: ChartType;
  /** 图表数据 */
  data: ChartData;
  /** 图表选项 */
  options?: ChartOptions;
}

/** 图表实例 */
interface ChartInstance {
  /** 更新图表数据 */
  update(data: ChartData): void;
  /** 调整图表尺寸 */
  resize(width: number, height: number): void;
  /** 销毁图表，释放资源 */
  destroy(): void;
  /** 获取 Canvas 上下文 */
  getContext(): CanvasRenderingContext2D;
}

// ======================== 默认配置 ========================

const DEFAULT_COLORS = [
  '#42b883', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

const DEFAULT_OPTIONS: ResolvedChartOptions = {
  title: '',
  width: 600,
  height: 400,
  showGrid: true,
  showLegend: true,
  showValues: false,
  animationDuration: 500,
  padding: { top: 40, right: 30, bottom: 50, left: 60 },
  yMax: 0,
  yMin: 0,
};

// ======================== 工具函数 ========================

/**
 * 获取设备像素比，用于高清屏适配
 */
function getDevicePixelRatio(): number {
  return typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
}

/**
 * 计算合适的 Y 轴刻度
 */
function calculateYTicks(max: number, min: number, tickCount: number = 5): number[] {
  const range = max - min;
  if (range === 0) return [min - 1, min, min + 1];

  const rawStep = range / (tickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let step: number;
  if (normalized <= 1) step = magnitude;
  else if (normalized <= 2) step = 2 * magnitude;
  else if (normalized <= 5) step = 5 * magnitude;
  else step = 10 * magnitude;

  const ticks: number[] = [];
  let tick = Math.floor(min / step) * step;
  while (tick <= max + step * 0.5) {
    ticks.push(Math.round(tick * 1e10) / 1e10);
    tick += step;
  }
  return ticks;
}

/**
 * 格式化数值显示
 */
function formatNumber(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n * 100) / 100);
}

// ======================== 核心绘制 ========================

/**
 * 绘制柱状图
 */
function drawBarChart(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  options: ResolvedChartOptions,
  progress: number
): void {
  const { width, height, padding, showGrid, showLegend, showValues, title } = options;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // 计算数据范围
  let allValues: number[] = [];
  for (const ds of data.datasets) {
    allValues = allValues.concat(ds.data);
  }
  const dataMax = options.yMax || Math.max(...allValues, 0);
  const dataMin = options.yMin || Math.min(...allValues, 0);
  const yTicks = calculateYTicks(dataMax, dataMin);

  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const yRange = yMax - yMin || 1;

  // 清空画布
  ctx.clearRect(0, 0, width, height);

  // 绘制标题
  if (title) {
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 24);
  }

  // 绘制网格线和 Y 轴刻度
  if (showGrid) {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#95a5a6';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';

    for (const tick of yTicks) {
      const y = padding.top + plotHeight - ((tick - yMin) / yRange) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(formatNumber(tick), padding.left - 8, y + 4);
    }
  }

  // 绘制柱状图
  const groupCount = data.labels.length;
  const barGroupWidth = plotWidth / groupCount;
  const barWidth = Math.min(barGroupWidth * 0.6 / data.datasets.length, 50);
  const groupPadding = (barGroupWidth - barWidth * data.datasets.length) / 2;

  for (let d = 0; d < data.datasets.length; d++) {
    const ds = data.datasets[d];
    const color = ds.color || DEFAULT_COLORS[d % DEFAULT_COLORS.length];

    for (let i = 0; i < ds.data.length; i++) {
      const value = ds.data[i] * progress;
      const x = padding.left + i * barGroupWidth + groupPadding + d * barWidth;
      const barHeight = ((value - yMin) / yRange) * plotHeight;
      const y = padding.top + plotHeight - barHeight;

      // 绘制柱子
      ctx.fillStyle = color;
      ctx.beginPath();
      const radius = Math.min(4, barWidth / 4);
      const bh = Math.max(0, barHeight);
      if (bh > radius * 2) {
        ctx.moveTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius);
        ctx.lineTo(x + barWidth, padding.top + plotHeight);
        ctx.lineTo(x, padding.top + plotHeight);
      } else {
        ctx.rect(x, y, barWidth, bh);
      }
      ctx.fill();

      // 绘制数值标签
      if (showValues && progress >= 1) {
        ctx.fillStyle = '#2c3e50';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatNumber(ds.data[i]), x + barWidth / 2, y - 6);
      }
    }
  }

  // 绘制 X 轴标签
  ctx.fillStyle = '#6c757d';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < data.labels.length; i++) {
    const x = padding.left + i * barGroupWidth + barGroupWidth / 2;
    ctx.fillText(data.labels[i], x, height - padding.bottom + 20);
  }

  // 绘制图例
  if (showLegend && data.datasets.length > 1) {
    const legendY = padding.top - 10;
    let legendX = width / 2 - (data.datasets.length * 80) / 2;

    for (let d = 0; d < data.datasets.length; d++) {
      const ds = data.datasets[d];
      const color = ds.color || DEFAULT_COLORS[d % DEFAULT_COLORS.length];

      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY - 8, 12, 12);
      ctx.fillStyle = '#2c3e50';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ds.label, legendX + 16, legendY + 2);
      legendX += ctx.measureText(ds.label).width + 36;
    }
  }
}

/**
 * 绘制折线图
 */
function drawLineChart(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  options: ResolvedChartOptions,
  progress: number
): void {
  const { width, height, padding, showGrid, showLegend, showValues, title } = options;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // 计算数据范围
  let allValues: number[] = [];
  for (const ds of data.datasets) {
    allValues = allValues.concat(ds.data);
  }
  const dataMax = options.yMax || Math.max(...allValues, 0);
  const dataMin = options.yMin || Math.min(...allValues, 0);
  const yTicks = calculateYTicks(dataMax, dataMin);

  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const yRange = yMax - yMin || 1;

  // 清空画布
  ctx.clearRect(0, 0, width, height);

  // 绘制标题
  if (title) {
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 24);
  }

  // 绘制网格线和 Y 轴刻度
  if (showGrid) {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#95a5a6';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';

    for (const tick of yTicks) {
      const y = padding.top + plotHeight - ((tick - yMin) / yRange) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(formatNumber(tick), padding.left - 8, y + 4);
    }
  }

  // 绘制折线
  const pointSpacing = data.labels.length > 1 ? plotWidth / (data.labels.length - 1) : 0;

  for (let d = 0; d < data.datasets.length; d++) {
    const ds = data.datasets[d];
    const color = ds.color || DEFAULT_COLORS[d % DEFAULT_COLORS.length];

    // 绘制填充区域
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + plotHeight);
    for (let i = 0; i < ds.data.length; i++) {
      const value = ds.data[i] * progress;
      const x = padding.left + i * pointSpacing;
      const y = padding.top + plotHeight - ((value - yMin) / yRange) * plotHeight;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + (ds.data.length - 1) * pointSpacing, padding.top + plotHeight);
    ctx.closePath();
    ctx.fillStyle = color + '15';
    ctx.fill();

    // 绘制线条
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = 0; i < ds.data.length; i++) {
      const value = ds.data[i] * progress;
      const x = padding.left + i * pointSpacing;
      const y = padding.top + plotHeight - ((value - yMin) / yRange) * plotHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 绘制数据点
    for (let i = 0; i < ds.data.length; i++) {
      const value = ds.data[i] * progress;
      const x = padding.left + i * pointSpacing;
      const y = padding.top + plotHeight - ((value - yMin) / yRange) * plotHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 数值标签
      if (showValues && progress >= 1) {
        ctx.fillStyle = '#2c3e50';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatNumber(ds.data[i]), x, y - 10);
      }
    }
  }

  // 绘制 X 轴标签
  ctx.fillStyle = '#6c757d';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < data.labels.length; i++) {
    const x = padding.left + i * pointSpacing;
    ctx.fillText(data.labels[i], x, height - padding.bottom + 20);
  }

  // 绘制图例
  if (showLegend && data.datasets.length > 1) {
    const legendY = padding.top - 10;
    let legendX = width / 2 - (data.datasets.length * 80) / 2;

    for (let d = 0; d < data.datasets.length; d++) {
      const ds = data.datasets[d];
      const color = ds.color || DEFAULT_COLORS[d % DEFAULT_COLORS.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(legendX, legendY - 2);
      ctx.lineTo(legendX + 16, legendY - 2);
      ctx.stroke();

      ctx.fillStyle = '#2c3e50';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ds.label, legendX + 22, legendY + 2);
      legendX += ctx.measureText(ds.label).width + 42;
    }
  }
}

// ======================== 图表创建 ========================

/**
 * 创建图表实例
 *
 * @param container - 容器元素或 Canvas 元素
 * @param config - 图表配置
 * @returns 图表实例
 */
function createChart(
  container: HTMLElement | HTMLCanvasElement,
  config: ChartConfig
): ChartInstance {
  // 获取或创建 Canvas
  let canvas: HTMLCanvasElement;
  if (container instanceof HTMLCanvasElement) {
    canvas = container;
  } else {
    canvas = document.createElement('canvas');
    container.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d')!;

  // 合并选项（逐个合并可选属性以确保非 undefined）
  const userOpts = config.options;
  const userPadding = userOpts?.padding;
  const opts: ResolvedChartOptions = {
    title: userOpts?.title ?? DEFAULT_OPTIONS.title,
    width: userOpts?.width ?? DEFAULT_OPTIONS.width,
    height: userOpts?.height ?? DEFAULT_OPTIONS.height,
    showGrid: userOpts?.showGrid ?? DEFAULT_OPTIONS.showGrid,
    showLegend: userOpts?.showLegend ?? DEFAULT_OPTIONS.showLegend,
    showValues: userOpts?.showValues ?? DEFAULT_OPTIONS.showValues,
    animationDuration: userOpts?.animationDuration ?? DEFAULT_OPTIONS.animationDuration,
    padding: {
      top: userPadding?.top ?? DEFAULT_OPTIONS.padding.top,
      right: userPadding?.right ?? DEFAULT_OPTIONS.padding.right,
      bottom: userPadding?.bottom ?? DEFAULT_OPTIONS.padding.bottom,
      left: userPadding?.left ?? DEFAULT_OPTIONS.padding.left,
    },
    yMax: userOpts?.yMax ?? DEFAULT_OPTIONS.yMax,
    yMin: userOpts?.yMin ?? DEFAULT_OPTIONS.yMin,
  };

  // 设置 Canvas 尺寸（高清屏适配）
  const dpr = getDevicePixelRatio();
  let currentWidth = opts.width;
  let currentHeight = opts.height;
  let currentData = config.data;

  function setupCanvas(): void {
    canvas.width = currentWidth * dpr;
    canvas.height = currentHeight * dpr;
    canvas.style.width = currentWidth + 'px';
    canvas.style.height = currentHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 动画绘制
  let animationId: number | null = null;

  function draw(progress: number): void {
    if (config.type === 'bar') {
      drawBarChart(ctx, currentData, opts, progress);
    } else {
      drawLineChart(ctx, currentData, opts, progress);
    }
  }

  function animate(): void {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }

    const startTime = performance.now();
    const duration = opts.animationDuration;

    function frame(now: number): void {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      draw(eased);

      if (progress < 1) {
        animationId = requestAnimationFrame(frame);
      } else {
        animationId = null;
      }
    }

    animationId = requestAnimationFrame(frame);
  }

  // 初始绘制
  setupCanvas();
  animate();

  // 返回图表实例
  return {
    update(data: ChartData): void {
      currentData = data;
      setupCanvas();
      animate();
    },

    resize(width: number, height: number): void {
      currentWidth = width;
      currentHeight = height;
      setupCanvas();
      draw(1);
    },

    destroy(): void {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      ctx.clearRect(0, 0, currentWidth, currentHeight);
      if (canvas.parentElement && container instanceof HTMLElement && canvas !== container) {
        container.removeChild(canvas);
      }
    },

    getContext(): CanvasRenderingContext2D {
      return ctx;
    },
  };
}

export { createChart };
export type {
  ChartType,
  ChartDataset,
  ChartData,
  ChartOptions,
  ChartConfig,
  ChartInstance,
};
