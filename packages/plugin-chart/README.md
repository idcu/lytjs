# @lytjs/plugin-chart

Lyt.js 图表插件 - 提供柱状图和折线图组件，使用 Canvas API 绘制，零运行时依赖。

## 特性

- 柱状图（Bar Chart）和折线图（Line Chart）
- Canvas API 绘制，零运行时依赖
- 高清屏（Retina）适配
- 入场动画（easeOutCubic）
- 多数据系列支持
- 自定义颜色、标题、图例
- Y 轴自动刻度计算
- 数值标签显示
- 响应式尺寸调整

## 安装

```bash
npm install @lytjs/plugin-chart
```

## 使用

### 柱状图

```js
import { createChart } from '@lytjs/plugin-chart'

const chart = createChart(document.getElementById('chart'), {
  type: 'bar',
  data: {
    labels: ['一月', '二月', '三月', '四月', '五月'],
    datasets: [
      {
        label: '销售额',
        data: [120, 200, 150, 80, 170],
        color: '#42b883',
      },
    ],
  },
  options: {
    title: '月度销售统计',
    width: 600,
    height: 400,
    showValues: true,
  },
})
```

### 折线图

```js
const chart = createChart(document.getElementById('chart'), {
  type: 'line',
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      { label: '2024', data: [30, 50, 80, 60], color: '#42b883' },
      { label: '2023', data: [20, 40, 60, 50], color: '#3b82f6' },
    ],
  },
  options: {
    title: '季度对比',
    showLegend: true,
  },
})
```

### 更新数据

```js
chart.update({
  labels: ['A', 'B', 'C'],
  datasets: [{ label: '新数据', data: [10, 20, 30] }],
})
```

### 调整尺寸

```js
chart.resize(800, 500)
```

### 销毁图表

```js
chart.destroy()
```

## API

### `createChart(container, config): ChartInstance`

| 参数 | 类型 | 说明 |
|------|------|------|
| `container` | `HTMLElement \| HTMLCanvasElement` | 容器元素或 Canvas 元素 |
| `config.type` | `'bar' \| 'line'` | 图表类型 |
| `config.data` | `ChartData` | 图表数据 |
| `config.options` | `ChartOptions` | 图表选项（可选） |

### ChartInstance

| 方法 | 说明 |
|------|------|
| `update(data)` | 更新图表数据 |
| `resize(width, height)` | 调整图表尺寸 |
| `destroy()` | 销毁图表 |
| `getContext()` | 获取 Canvas 上下文 |

## License

MIT
