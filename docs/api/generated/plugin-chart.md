# @lytjs/plugin-chart

官方图表插件，用于数据可视化渲染

## 目录

- [createChart](#createchart)
- [ChartDataPoint](#chartdatapoint)
- [ChartDataset](#chartdataset)
- [ChartType](#charttype)
- [ChartConfig](#chartconfig)
- [ChartInstance](#chartinstance)
- [ChartPluginOptions](#chartpluginoptions)

## createChart

**Function**

创建图表实例

### 签名

```typescript
createChart: ChartInstance;
```

### 参数

| 参数    | 类型                 | 描述 | 可选 | 默认值 |
| ------- | -------------------- | ---- | ---- | ------ |
| canvas  | `HTMLCanvasElement`  |      | 否   | -      |
| config  | `ChartConfig`        |      | 否   | -      |
| options | `ChartPluginOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `ChartInstance`

## ChartDataPoint

**Interface**

图表数据点

### 成员

| 名称  | 类型     | 描述         | 可选 |
| ----- | -------- | ------------ | ---- |
| label | `string` | 标签         | 否   |
| value | `number` | 数值         | 否   |
| color | `string` | 颜色（可选） | 是   |

## ChartDataset

**Interface**

数据集

### 成员

| 名称        | 类型               | 描述                           | 可选 |
| ----------- | ------------------ | ------------------------------ | ---- |
| label       | `string`           | 数据集标签                     | 否   |
| data        | `ChartDataPoint[]` | 数据点数组                     | 否   |
| color       | `string`           | 颜色（可选，应用于整个数据集） | 是   |
| borderWidth | `number`           | 边框宽度（可选）               | 是   |

## ChartType

**Type**

图表类型

### 签名

```typescript
ChartType: 'bar' | 'line' | 'pie' | 'doughnut';
```

## ChartConfig

**Interface**

图表配置

### 成员

| 名称              | 类型             | 描述                 | 可选 |
| ----------------- | ---------------- | -------------------- | ---- |
| type              | `ChartType`      | 图表类型             | 否   |
| datasets          | `ChartDataset[]` | 数据集               | 否   |
| title             | `string`         | 标题（可选）         | 是   |
| showLegend        | `boolean`        | 是否显示图例         | 是   |
| showGrid          | `boolean`        | 是否显示网格线       | 是   |
| width             | `number`         | 图表宽度             | 是   |
| height            | `number`         | 图表高度             | 是   |
| animationDuration | `number`         | 动画持续时间（毫秒） | 是   |
| padding           | `number`         | 内边距               | 是   |

## ChartInstance

**Interface**

图表实例接口

### 成员

| 名称       | 类型 | 描述             | 可选 |
| ---------- | ---- | ---------------- | ---- |
| render     | -    | 渲染图表         | 否   |
| updateData | -    | 更新数据         | 否   |
| destroy    | -    | 销毁图表         | 否   |
| getCanvas  | -    | 获取 Canvas 元素 | 否   |

## ChartPluginOptions

**Interface**

图表插件选项

### 成员

| 名称                     | 类型       | 描述             | 可选 |
| ------------------------ | ---------- | ---------------- | ---- |
| defaultColors            | `string[]` | 默认颜色 palette | 是   |
| defaultAnimationDuration | `number`   | 默认动画持续时间 | 是   |
| responsive               | `boolean`  | 响应式配置       | 是   |
