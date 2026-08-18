# @lytjs/plugin-chart

LytJS 官方图表插件，基于 Canvas API 渲染图表，零外部依赖。

## 安装

```bash
pnpm add @lytjs/plugin-chart
```

## 快速开始

### 作为插件使用

```typescript
import { createApp } from '@lytjs/core';
import pluginChart from '@lytjs/plugin-chart';

const app = createApp();
app.use(pluginChart);
```

安装后可通过 `$chart`（或 provide 注入的 `lyt-chart`）创建图表：

```typescript
const canvas = document.getElementById('chart') as HTMLCanvasElement;

$chart.create(canvas, {
  type: 'line', // 'bar' | 'line' | 'pie' | 'doughnut'
  width: 600,
  height: 400,
  title: '月度销量',
  datasets: [
    {
      data: [
        { value: 30, label: '一月' },
        { value: 50, label: '二月' },
        { value: 40, label: '三月' },
      ],
    },
  ],
});
```

### 独立使用

```typescript
import { createChart } from '@lytjs/plugin-chart';

const chart = createChart(canvas, { type: 'bar', datasets: [] });
chart.updateData(newDatasets); // 更新数据并重绘
chart.render(); // 重新渲染
chart.destroy(); // 销毁（取消动画帧）
```

## 特性

- 支持柱状图、折线图、饼图、环形图
- 图表标题、网格线、图例
- 内置调色板与自定义颜色
- 动画渲染与数据更新
- 零外部依赖

## API

### createChart(canvas, config, options?)

创建图表实例，返回 `ChartInstance`（含 `render()`、`updateData(datasets)`、`destroy()`、`getCanvas()`）。

### 类型

`ChartDataPoint`、`ChartDataset`、`ChartType`（`bar`/`line`/`pie`/`doughnut`）、`ChartConfig`、`ChartInstance`、`ChartPluginOptions`。

### 常量

`DEFAULT_COLORS`：默认调色板数组。

## 相关包

- [@lytjs/core](../../../core)：应用核心，提供 `definePlugin` 与 `createApp`。

## 许可证

[MIT](../../../../LICENSE)
