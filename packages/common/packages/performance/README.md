# @lytjs/common-performance

组件渲染性能监控 API，用于统计 mount / patch / unmount 的耗时与性能指标。

## 安装

```bash
pnpm add @lytjs/common-performance
```

## 使用示例

### 性能监控器

```typescript
import { PerformanceMonitor } from '@lytjs/common-performance';

const monitor = new PerformanceMonitor({ maxHistorySize: 100 });

// 开始计时某次渲染
const endTiming = monitor.startTiming('MyComponent', 'patch');

// ... 执行渲染逻辑 ...

// 结束计时
endTiming({ propsChanged: true });

// 获取统计数据
const stats = monitor.getStats('MyComponent');
console.log(`平均渲染耗时: ${stats?.averagePatchTime}ms`);
```

### 全局监控与便捷函数

```typescript
import {
  initPerformanceMonitor,
  getPerformanceMonitor,
  startRenderTiming,
  generatePerformanceReport,
} from '@lytjs/common-performance';

initPerformanceMonitor();
const endTiming = startRenderTiming('MyComponent', 'mount');
endTiming();

const report = generatePerformanceReport();
console.log(report.averageRenderTime, report.slowestComponent);
```

## API 说明

### `PerformanceMonitor`

核心类，内部使用环形缓冲区（O(1)）记录历史，并根据操作类型汇总组件统计。

主要方法：

| 方法                                               | 说明                       |
| -------------------------------------------------- | -------------------------- |
| `enabled`（属性）                                  | 获取 / 设置是否启用监控    |
| `startTiming(componentName, operation, metadata?)` | 开始计时，返回结束计时函数 |
| `recordEntry(entry)`                               | 直接记录一条性能条目       |
| `getStats(componentName)`                          | 获取指定组件的统计信息     |
| `getAllStats()`                                    | 获取所有组件的统计信息     |
| `getHistory()`                                     | 获取全部性能历史           |
| `getComponentHistory(componentName)`               | 获取指定组件的性能历史     |
| `getOperationHistory(operation)`                   | 获取指定操作类型的历史     |
| `getSlowestRenders(limit?)`                        | 获取耗时最长的渲染         |
| `getGlobalAverageRenderTime()`                     | 全局平均渲染耗时           |
| `getGlobalTotalRenderTime()`                       | 全局总渲染耗时             |
| `clear()`                                          | 清空历史与统计             |
| `clearComponent(componentName)`                    | 清空指定组件的历史与统计   |
| `generateReport()`                                 | 生成性能报告               |

### 全局实例函数

| 函数                                                     | 说明                             |
| -------------------------------------------------------- | -------------------------------- |
| `getPerformanceMonitor()`                                | 获取全局监控实例（不存在时创建） |
| `setPerformanceMonitor(monitor)`                         | 设置全局监控实例                 |
| `initPerformanceMonitor(options?)`                       | 以指定选项初始化全局监控实例     |
| `startRenderTiming(componentName, operation, metadata?)` | 使用全局实例开始计时             |
| `recordRenderEntry(entry)`                               | 使用全局实例记录条目             |
| `getComponentStats(componentName)`                       | 从全局实例获取组件统计           |
| `generatePerformanceReport()`                            | 从全局实例生成报告               |
| `isPerformanceMonitoringEnabled()`                       | 监控是否启用                     |
| `setPerformanceMonitoringEnabled(enabled)`               | 启用 / 禁用监控                  |

### 辅助函数

| 函数                                                           | 说明                                               |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `withPerformanceTracking(componentName, renderFn, operation?)` | 包装渲染函数，自动计时并在异常时标记 error         |
| `connectToDevTools()`                                          | 将监控实例挂载到 `window` 上供浏览器 DevTools 使用 |

### 常用类型

- `RenderPerformanceEntry`：单次渲染的性能条目。
- `ComponentPerformanceStats`：单组件的汇总统计（次数、总耗时、平均值、最大值）。
- `PerformanceReport`：性能报告（总次数、总耗时、平均耗时、最慢组件、渲染最多的组件等）。
- `PerformanceMonitorOptions`：监控配置（`maxHistorySize`、`enabled`、`onEntry`、`onStatsUpdate`）。

> 计时优先使用 `performance.now()`，在非浏览器环境（如 SSR、Node.js）下自动回退到 `Date.now()`。

## 相关包

本包为 [`@lytjs/common`](../common/) 聚合包的成员，内部依赖 `@lytjs/common-error`。

## 许可证

[MIT](../../../../LICENSE)
