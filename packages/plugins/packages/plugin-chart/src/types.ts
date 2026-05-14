/**
 * @lytjs/plugin-chart types
 *
 * Type definitions for the chart plugin
 */

/** 图表数据点 */
export interface ChartDataPoint {
  /** 标签 */
  label: string;
  /** 数值 */
  value: number;
  /** 颜色（可选） */
  color?: string;
}

/** 数据集 */
export interface ChartDataset {
  /** 数据集标签 */
  label: string;
  /** 数据点数组 */
  data: ChartDataPoint[];
  /** 颜色（可选，应用于整个数据集） */
  color?: string;
  /** 边框宽度（可选） */
  borderWidth?: number;
}

/** 图表类型 */
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

/** 图表配置 */
export interface ChartConfig {
  /** 图表类型 */
  type: ChartType;
  /** 数据集 */
  datasets: ChartDataset[];
  /** 标题（可选） */
  title?: string;
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 是否显示网格线 */
  showGrid?: boolean;
  /** 图表宽度 */
  width?: number;
  /** 图表高度 */
  height?: number;
  /** 动画持续时间（毫秒） */
  animationDuration?: number;
  /** 内边距 */
  padding?: number;
}

/** 图表实例接口 */
export interface ChartInstance {
  /** 渲染图表 */
  render(): void;
  /** 更新数据 */
  updateData(datasets: ChartDataset[]): void;
  /** 销毁图表 */
  destroy(): void;
  /** 获取 Canvas 元素 */
  getCanvas(): HTMLCanvasElement;
}

/** 图表插件选项 */
export interface ChartPluginOptions {
  /** 默认颜色 palette */
  defaultColors?: string[];
  /** 默认动画持续时间 */
  defaultAnimationDuration?: number;
  /** 响应式配置 */
  responsive?: boolean;
}
