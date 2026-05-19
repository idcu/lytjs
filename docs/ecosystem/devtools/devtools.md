# @lytjs/devtools

> LytJS 官方开发者工具，提供组件树检查、状态管理、路由调试和性能监控功能。

[![npm version](https://img.shields.io/npm/v/@lytjs/devtools.svg)](https://www.npmjs.com/package/@lytjs/devtools)
[![license](https://img.shields.io/npm/l/@lytjs/devtools.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/devtools` 是 LytJS 框架的官方开发者工具包，提供了一套完整的调试和检查功能，帮助开发者更好地理解和调试 LytJS 应用。它支持组件树检查、Store 状态查看、路由调试、Signal 可视化、性能监控等功能。

### 核心特性

- **组件树检查**：可视化组件层级结构，查看组件属性和状态
- **Store 检查器**：实时查看和修改 Store 状态，追踪状态变化
- **路由调试器**：查看路由历史、导航轨迹，支持时间旅行调试
- **Signal 可视化**：依赖图可视化，时间旅行调试，性能分析
- **性能监控**：FPS 监控、内存使用、慢操作检测、告警规则
- **时序事件**：Timeline 事件记录、火焰图生成、慢操作分析
- **基准测试**：内置性能基准测试，支持大规模场景测试
- **零依赖**：完全基于 LytJS 原生 API，无外部依赖

## 安装

```bash
npm install @lytjs/devtools
```

或使用 pnpm：

```bash
pnpm add @lytjs/devtools
```

## 依赖关系

`@lytjs/devtools` 依赖以下 LytJS 核心包：

- `@lytjs/reactivity` - 响应式系统
- `@lytjs/component` - 组件系统
- `@lytjs/vdom` - 虚拟 DOM
- `@lytjs/router` - 路由系统
- `@lytjs/store` - 状态管理
- `@lytjs/common-is` - 工具函数
- `@lytjs/common-env` - 环境检测
- `@lytjs/common-dom` - DOM 工具函数
- `@lytjs/common-object` - 对象工具函数

## 快速开始

### 安装 DevTools

```typescript
import { installDevTools } from '@lytjs/devtools';

if (import.meta.env.DEV) {
  installDevTools({
    displayPanel: true,
    position: 'bottom-right'
  });
}
```

### 获取 DevTools 实例

```typescript
import { getDevTools } from '@lytjs/devtools';

const devtools = getDevTools();
if (devtools) {
  console.log('DevTools 已安装');
}
```

## DevTools 安装 API

### `installDevTools(options?)`

安装 DevTools 并返回 API 实例。

```typescript
import { installDevTools } from '@lytjs/devtools';

const devtools = installDevTools({
  displayPanel: true,
  position: 'bottom-right',
  theme: 'dark',
  filters: {
    components: ['MyApp', 'Layout'],
    stores: ['userStore']
  }
});
```

### `getDevTools()`

获取已安装的 DevTools 实例。

```typescript
import { getDevTools } from '@lytjs/devtools';

const devtools = getDevTools();
if (devtools) {
  devtools.getComponentTree();
}
```

### `uninstallDevTools()`

卸载 DevTools。

```typescript
import { uninstallDevTools } from '@lytjs/devtools';

uninstallDevTools();
```

## 组件树 API

### 获取组件树

```typescript
import { getComponentTree, serializeComponentTree } from '@lytjs/devtools';

const tree = getComponentTree();
const serialized = serializeComponentTree(tree);
console.log(serialized);
```

### 注册根组件

```typescript
import { registerRootComponent } from '@lytjs/devtools';

registerRootComponent(App, {
  id: 'main-app',
  name: 'MyApp'
});
```

### 注销根组件

```typescript
import { unregisterRootComponent } from '@lytjs/devtools';

unregisterRootComponent('main-app');
```

## Store 检查器 API

### 获取所有 Store 状态

```typescript
import { getStoreStates, serializeStoreStates } from '@lytjs/devtools';

const states = getStoreStates();
const serialized = serializeStoreStates(states);
console.log(serialized);
```

### 获取单个 Store 状态

```typescript
import { getStoreState } from '@lytjs/devtools';

const userState = getStoreState('user');
console.log(userState);
```

### 设置 Store 状态

```typescript
import { setStoreState } from '@lytjs/devtools';

setStoreState('user', { name: '新名称' });
```

### 派发 Store 动作

```typescript
import { dispatchStoreAction } from '@lytjs/devtools';

dispatchStoreAction('cart', 'addItem', { id: 'p1', name: '产品1' });
```

### 注册/注销 Store

```typescript
import { registerStore, unregisterStore } from '@lytjs/devtools';

registerStore('cart', cartStore);
unregisterStore('cart');
```

### 订阅 Store 变化

```typescript
import { subscribeStore, unsubscribeStore, onStoreChange } from '@lytjs/devtools';

const unsubscribe = subscribeStore('user', (mutation, state) => {
  console.log('User Store 变化:', mutation.type);
});

onStoreChange('user', (state) => {
  console.log('新的 user 状态:', state);
});

unsubscribeStore('user', unsubscribe);
```

## 路由检查器 API

### 获取当前路由信息

```typescript
import { getCurrentRoute, serializeRouteInfo } from '@lytjs/devtools';

const route = getCurrentRoute();
const serialized = serializeRouteInfo(route);
console.log(serialized);
```

### 编程式导航

```typescript
import { navigateTo, navigateToName, goBack } from '@lytjs/devtools';

navigateTo('/dashboard');
navigateToName('user-profile', { id: '123' });
goBack();
```

### 获取路由列表

```typescript
import { getRoutes } from '@lytjs/devtools';

const routes = getRoutes();
console.log(routes);
```

### 注册/注销路由器

```typescript
import { registerRouter, unregisterRouter, isRouterRegistered } from '@lytjs/devtools';

registerRouter(router);
console.log(isRouterRegistered());
unregisterRouter();
```

### 监听路由变化

```typescript
import { watchRouteChanges, unwatchRouteChanges } from '@lytjs/devtools';

const unwatch = watchRouteChanges((to, from) => {
  console.log(`路由变化: ${from.path} -> ${to.path}`);
});

unwatchRouteChanges(unwatch);
```

### 路由历史管理

```typescript
import { getRouteHistory, clearRouteHistory } from '@lytjs/devtools';

const history = getRouteHistory();
console.log(history);

clearRouteHistory();
```

## Signal 检查器 API

### 获取 Signal 节点

```typescript
import { getSignalNodes, serializeSignalNode } from '@lytjs/devtools';

const nodes = getSignalNodes();
console.log(nodes);

const serialized = serializeSignalNode(nodes[0]);
```

### 获取依赖图

```typescript
import { getDependencyGraph, serializeDependencyGraph } from '@lytjs/devtools';

const graph = getDependencyGraph();
const serialized = serializeDependencyGraph(graph);
```

### 创建快照

```typescript
import { createSnapshot, getSnapshots, getTimeTravelState } from '@lytjs/devtools';

const snapshot = createSnapshot('v1.0');
const allSnapshots = getSnapshots();

const timeTravelState = getTimeTravelState();
```

### 时间旅行调试

```typescript
import { restoreSnapshot, clearSnapshots, getTimeTravelNavigator } from '@lytjs/devtools';

restoreSnapshot('v1.0');

const navigator = getTimeTravelNavigator();
navigator.back();
navigator.forward();
navigator.jumpTo('v2.0');
```

### 信号性能分析

```typescript
import { getPerformanceStats, getPerformanceRecords } from '@lytjs/devtools';

const stats = getPerformanceStats();
const records = getPerformanceRecords();

clearPerformanceRecords();
```

### 注册/追踪 Signal

```typescript
import { registerSignal, recordSignalUpdate, recordDependency } from '@lytjs/devtools';

registerSignal('counter', counterSignal);

recordSignalUpdate('counter', 1);
recordDependency('counter', 'doubled');
```

### 可视化布局图

```typescript
import { getVisualLayoutGraph, getSubgraph, searchSignals } from '@lytjs/devtools';

const layoutGraph = getVisualLayoutGraph();
const subgraph = getSubgraph('counter');

const results = searchSignals('user');
```

### 快照比较

```typescript
import { compareSnapshots, serializeSnapshotDiff, getDiffBetweenSnapshots } from '@lytjs/devtools';

const comparison = compareSnapshots('v1.0', 'v2.0');
const diff = serializeSnapshotDiff(comparison);

const detailedDiff = getDiffBetweenSnapshots('v1.0', 'v2.0');
```

## 性能监控 API

### 初始化性能监控

```typescript
import { initPerformanceMonitor, recordMetric, getMetrics } from '@lytjs/devtools';

initPerformanceMonitor({
  fps: true,
  memory: true,
  custom: true
});

recordMetric('render', performance.now());
const metrics = getMetrics();
```

### 统计信息

```typescript
import { getStats, getPerformanceReport, serializePerformanceReport } from '@lytjs/devtools';

const stats = getStats();
console.log(stats);

const report = getPerformanceReport();
const serialized = serializePerformanceReport(report);
```

### 告警规则

```typescript
import {
  registerAlertRule,
  unregisterAlertRule,
  getAlertRules,
  getAlerts,
  acknowledgeAlert,
  clearAlerts
} from '@lytjs/devtools';

registerAlertRule({
  id: 'high-memory',
  condition: (metrics) => metrics.memory.used > 100 * 1024 * 1024,
  level: 'warning',
  message: '内存使用过高'
});

const rules = getAlertRules();
const alerts = getAlerts();

acknowledgeAlert('high-memory-001');
clearAlerts();
```

### 自定义计时器

```typescript
import { startTimer, addObserver, removeObserver, clearMetrics } from '@lytjs/devtools';

const end = startTimer('my-operation');
doSomething();
end();

const observer = (metrics) => console.log(metrics);
addObserver(observer);
removeObserver(observer);

clearMetrics();
resetPerformanceMonitor();
```

## 时序事件 API

### 时间线事件

```typescript
import {
  beginTimelineEvent,
  endTimelineEvent,
  getTimelineEvents,
  getTimelineEventsInRange,
  clearTimelineEvents
} from '@lytjs/devtools';

const eventId = beginTimelineEvent('render', { component: 'App' });
render();
endTimelineEvent(eventId);

const events = getTimelineEvents();
const rangeEvents = getTimelineEventsInRange(0, 1000);
```

### 慢操作分析

```typescript
import { getSlowOperations, getFlameGraphData } from '@lytjs/devtools';

const slowOps = getSlowOperations({ threshold: 100 });
const flameGraph = getFlameGraphData();
```

### 导出时间线

```typescript
import { exportTimelineAsJSON, serializeTimelineEvents } from '@lytjs/devtools';

const json = exportTimelineAsJSON();
const serialized = serializeTimelineEvents(events);
```

## 基准测试 API

### 运行基准测试

```typescript
import {
  runBenchmark,
  runAsyncBenchmark,
  getBenchmarkResults,
  compareBenchmarkResults
} from '@lytjs/devtools';

const result = await runBenchmark({
  name: 'array-iterate',
  fn: () => {
    for (let i = 0; i < 1000; i++) {
      arr.push(i);
    }
  },
  iterations: 100
});

const asyncResult = await runAsyncBenchmark({
  name: 'fetch-data',
  fn: async () => {
    return await fetch('/api/data').then(r => r.json());
  },
  iterations: 10
});

const allResults = getBenchmarkResults();
const comparison = compareBenchmarkResults(result1, result2);
```

### 大规模基准测试

```typescript
import { createLargeScaleBenchmark, LARGE_SCALE_SCENARIOS } from '@lytjs/devtools';

const result = await createLargeScaleBenchmark({
  scenario: LARGE_SCALE_SCENARIOS.LARGE_LIST,
  options: { items: 10000 }
});
```

### 内存使用分析

```typescript
import { getMemoryUsage, serializeMemoryUsage } from '@lytjs/devtools';

const memory = getMemoryUsage();
const serialized = serializeMemoryUsage(memory);
console.log(serialized);
```

### 回归检测

```typescript
import { createRegressionDetector } from '@lytjs/devtools';

const detector = createRegressionDetector({
  baseline: baselineResults,
  threshold: 0.1
});

detector.addResult(newResults);
if (detector.hasRegression()) {
  console.log('检测到性能回归');
}
```

## 类型定义

### DevTools 选项

```typescript
interface DevToolsOptions {
  displayPanel?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme?: 'light' | 'dark' | 'auto';
  filters?: {
    components?: string[];
    stores?: string[];
  };
  enabled?: boolean;
}
```

### 组件树节点

```typescript
interface ComponentTreeNode {
  id: string;
  name: string;
  type: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  children?: ComponentTreeNode[];
}
```

### Store 状态信息

```typescript
interface StoreStateInfo {
  id: string;
  state: any;
  getters?: Record<string, any>;
  actions?: Record<string, Function>;
  subscriptions?: number;
}
```

### 路由信息

```typescript
interface RouteInfo {
  path: string;
  name?: string;
  params: Record<string, string>;
  query: Record<string, string>;
  meta?: Record<string, any>;
}
```

### 性能指标

```typescript
interface PerformanceMetric {
  type: 'fps' | 'memory' | 'render' | 'custom';
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface AlertRule {
  id: string;
  condition: (metrics: PerformanceStats) => boolean;
  level: 'info' | 'warning' | 'error';
  message: string;
  enabled?: boolean;
}
```

## 配置示例

### 完整配置

```typescript
import { installDevTools } from '@lytjs/devtools';

installDevTools({
  displayPanel: true,
  position: 'bottom-right',
  theme: 'dark',
  filters: {
    components: ['App', 'Layout', 'Header', 'Footer'],
    stores: ['userStore', 'cartStore']
  },
  enabled: import.meta.env.DEV
});
```

### 仅在开发模式启用

```typescript
import { installDevTools, getDevTools } from '@lytjs/devtools';

if (import.meta.env.DEV) {
  installDevTools();
}

export function DebugPanel() {
  const devtools = getDevTools();
  if (!devtools) return null;

  return () => (
    <div class="debug-panel">
      <button onClick={() => devtools.getComponentTree()}>
        查看组件树
      </button>
      <button onClick={() => devtools.getStoreStates()}>
        查看状态
      </button>
    </div>
  );
}
```

## 最佳实践

### 生产环境禁用

```typescript
import { installDevTools, getDevTools } from '@lytjs/devtools';

if (import.meta.env.DEV) {
  installDevTools();
}
```

### 自定义性能监控

```typescript
import { recordMetric, startTimer } from '@lytjs/devtools';

function measureAsyncOperation(name: string, fn: () => Promise<any>) {
  const end = startTimer(name);
  return fn().finally(end);
}

measureAsyncOperation('api-fetch', () => fetch('/api/data').then(r => r.json()));
```

### 告警规则配置

```typescript
import { registerAlertRule } from '@lytjs/devtools';

registerAlertRule({
  id: 'low-fps',
  condition: (stats) => stats.fps?.current < 30,
  level: 'warning',
  message: 'FPS 过低，可能存在性能问题'
});

registerAlertRule({
  id: 'memory-leak',
  condition: (stats) => stats.memory?.leaked > 10 * 1024 * 1024,
  level: 'error',
  message: '检测到可能的内存泄漏'
});
```

## 浏览器兼容性

`@lytjs/devtools` 支持所有现代浏览器（Chrome、Firefox、Safari、Edge）。

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
