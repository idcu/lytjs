# DevTools 开发者工具

@lytjs/devtools 是 LytJS 官方开发者工具，帮助调试和检查应用。

## 安装

```bash
pnpm add @lytjs/devtools
```

## 基础用法

### 安装 DevTools

```typescript
import { installDevTools, registerStore, registerRouter } from '@lytjs/devtools';
import { useCounterStore } from './stores/counter';
import { router } from './router';

// 安装 DevTools
installDevTools({
  enabled: import.meta.env.DEV, // 只在开发环境启用
  position: 'right', // 面板位置
  size: 400, // 面板宽度
});

// 注册 Store
registerStore('counter', useCounterStore());

// 注册 Router
registerRouter(router);
```

### 快捷键

- **Ctrl + Shift + D** (Windows/Linux)
- **Cmd + Shift + D** (macOS)

## 功能

### 组件树查看器

查看应用组件层级结构：

```typescript
import { registerRootComponent, getComponentTree } from '@lytjs/devtools';

// 注册根组件
registerRootComponent(App);

// 获取组件树
const tree = getComponentTree();
console.log(tree);
```

### Store 状态检查器

查看和修改 Store 状态：

```typescript
import { 
  registerStore, 
  getStoreStates, 
  getStoreState,
  setStoreState,
  dispatchStoreAction
} from '@lytjs/devtools';

// 注册 Store
registerStore('user', userStore);

// 获取所有 Store 状态
const states = getStoreStates();

// 获取单个 Store 状态
const userState = getStoreState('user');

// 修改状态（调试用）
setStoreState('user', 'name', 'New Name');

// 派发 action
dispatchStoreAction('user', 'updateName', 'New Name');
```

### 路由查看器

查看当前路由信息：

```typescript
import { 
  registerRouter, 
  getCurrentRoute, 
  getRoutes,
  navigateTo,
  goBack,
  getRouteHistory,
  clearRouteHistory
} from '@lytjs/devtools';

// 注册路由器
registerRouter(router);

// 获取当前路由
const route = getCurrentRoute();

// 获取所有路由
const routes = getRoutes();

// 导航到指定路由
navigateTo('/about');

// 返回上一页
goBack();

// 获取路由历史
const history = getRouteHistory();

// 清除路由历史
clearRouteHistory();
```

### 信号检查器与时间旅行调试

查看和调试信号变化：

```typescript
import {
  registerSignal,
  getSignalNodes,
  getSignalNode,
  getDependencyGraph,
  createSnapshot,
  getSnapshots,
  getTimeTravelState,
  restoreSnapshot,
  clearSnapshots,
  getPerformanceStats,
  getPerformanceRecords,
  clearPerformanceRecords
} from '@lytjs/devtools';
import { ref, computed } from '@lytjs/reactivity';

// 创建信号
const count = ref(0);
const doubled = computed(() => count.value * 2);

// 注册信号（DevTools 内部会自动检测，也可以手动注册）
registerSignal(count, 'count');
registerSignal(doubled, 'doubled');

// 获取所有信号节点
const signals = getSignalNodes();
console.log(signals);

// 获取单个信号
const countSignal = getSignalNode('count');

// 获取依赖关系图
const graph = getDependencyGraph();

// 创建状态快照
createSnapshot('before-update');

// 修改状态
count.value = 10;

// 创建另一个快照
createSnapshot('after-update');

// 获取所有快照
const snapshots = getSnapshots();
console.log(snapshots);

// 获取时间旅行状态
const timeTravelState = getTimeTravelState();

// 恢复到之前的快照
restoreSnapshot(snapshots[0].id);

// 清除所有快照
clearSnapshots();

// 获取性能统计
const perfStats = getPerformanceStats();
console.log('性能统计:', perfStats);

// 获取性能记录
const perfRecords = getPerformanceRecords();
console.log('性能记录:', perfRecords);

// 清除性能记录
clearPerformanceRecords();
```

### 性能监控

监控应用性能：

```typescript
import {
  initPerformanceMonitor,
  recordMetric,
  getMetrics,
  getStats,
  registerAlertRule,
  getAlertRules,
  getAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  clearAlerts,
  addObserver,
  removeObserver,
  clearMetrics,
  resetPerformanceMonitor,
  getPerformanceReport,
  startTimer
} from '@lytjs/devtools';

// 初始化性能监控
initPerformanceMonitor({
  maxRecords: 1000, // 最多保存的记录数
  sampleRate: 1, // 采样率（0-1）
  autoSnapshot: true, // 是否自动创建快照
  alertThreshold: 100, // 性能警告阈值（毫秒）
});

// 记录性能指标
const endTimer = startTimer('render-component');
// ... 执行渲染
endTimer();

// 手动记录指标
recordMetric('update-state', {
  type: 'signal',
  duration: 50,
  metadata: { component: 'Counter' },
});

// 获取所有指标
const metrics = getMetrics();
console.log('性能指标:', metrics);

// 获取统计信息
const stats = getStats();
console.log('统计信息:', stats);

// 注册告警规则
registerAlertRule({
  id: 'slow-render',
  name: 'Slow Render',
  description: '渲染时间超过 100ms',
  condition: (record) => record.duration > 100,
  level: 'warning', // error, warning, info
});

// 获取告警规则
const rules = getAlertRules();

// 获取告警
const alerts = getAlerts();
console.log('告警:', alerts);

// 确认告警
acknowledgeAlert(alerts[0].id);

// 确认所有告警
acknowledgeAllAlerts();

// 清除告警
clearAlerts();

// 添加性能观察者
addObserver((record) => {
  console.log('性能记录:', record);
});

// 移除观察者
removeObserver();

// 清除指标
clearMetrics();

// 重置监控器
resetPerformanceMonitor();

// 获取完整性能报告
const report = getPerformanceReport();
console.log('性能报告:', report);
```

### 基准测试

运行性能基准测试：

```typescript
import {
  runBenchmark,
  runAsyncBenchmark,
  getBenchmarkResults,
  getLatestBenchmarkResult,
  clearBenchmarkResults,
  compareBenchmarkResults,
  createLargeScaleBenchmark,
  getMemoryUsage,
  createRegressionDetector,
  LARGE_SCALE_SCENARIOS
} from '@lytjs/devtools';

// 运行同步基准测试
const result = runBenchmark({
  name: 'signal-update',
  iterations: 1000,
  warmup: 100,
  fn: () => {
    const counter = ref(0);
    for (let i = 0; i < 100; i++) {
      counter.value++;
    }
  },
});

console.log('基准测试结果:', result);

// 运行异步基准测试
const asyncResult = await runAsyncBenchmark({
  name: 'async-data-fetch',
  iterations: 100,
  async fn() {
    await new Promise(resolve => setTimeout(resolve, 10));
  },
});

// 获取所有基准测试结果
const allResults = getBenchmarkResults();

// 获取最新的基准测试结果
const latest = getLatestBenchmarkResult();

// 比较两个基准测试结果
if (allResults.length >= 2) {
  const comparison = compareBenchmarkResults(allResults[0], allResults[1]);
  console.log('比较结果:', comparison);
}

// 创建大规模基准测试
const largeBench = createLargeScaleBenchmark({
  name: 'large-scale-render',
  scenario: LARGE_SCALE_SCENARIOS.LIST_RENDER, // 预定义场景
  iterations: 10,
  size: 1000, // 数据大小
});

const largeResult = await largeBench.run();

// 获取内存使用情况
const memory = getMemoryUsage();
console.log('内存使用:', memory);

// 创建性能回归检测器
const detector = createRegressionDetector({
  threshold: 1.1, // 10% 的性能下降触发告警
  historySize: 10, // 保存的历史结果数量
});

// 添加基准测试结果到检测器
detector.addResult(result);
detector.addResult(asyncResult);

// 检查是否有性能回归
const regressionCheck = detector.check();
if (regressionCheck.hasRegression) {
  console.warn('检测到性能回归:', regressionCheck.message);
}

// 清除基准测试结果
clearBenchmarkResults();
```

## 性能优化建议

### 在生产环境禁用 DevTools

```typescript
import { installDevTools } from '@lytjs/devtools';

if (import.meta.env.DEV) {
  installDevTools();
}
```

### 自定义采样率

```typescript
import { initPerformanceMonitor } from '@lytjs/devtools';

initPerformanceMonitor({
  sampleRate: 0.1, // 只记录 10% 的操作，减少性能影响
  maxRecords: 500,
});
```

### 条件性注册

只在需要时注册观察者和监控：

```typescript
import { addObserver, recordMetric } from '@lytjs/devtools';

if (import.meta.env.DEV && window.location.search.includes('debug')) {
  addObserver((record) => {
    console.log(record);
  });
}
```

## API 参考

### DevTools 安装与控制

- `installDevTools(options)` - 安装 DevTools
- `getDevTools()` - 获取 DevTools 实例
- `uninstallDevTools()` - 卸载 DevTools

### 组件树

- `registerRootComponent(component)` - 注册根组件
- `unregisterRootComponent()` - 注销根组件
- `getComponentTree()` - 获取组件树
- `serializeComponentTree()` - 序列化组件树

### Store 检查器

- `registerStore(id, store)` - 注册 Store
- `unregisterStore(id)` - 注销 Store
- `getStoreStates()` - 获取所有 Store 状态
- `getStoreState(id)` - 获取单个 Store 状态
- `setStoreState(id, key, value)` - 设置 Store 状态
- `dispatchStoreAction(id, action, args)` - 派发 Store Action
- `subscribeStore(id, callback)` - 订阅 Store 变化
- `unsubscribeStore(id)` - 取消订阅
- `onStoreChange(callback)` - 监听 Store 变化
- `getRegisteredStoreIds()` - 获取已注册的 Store ID
- `clearStoreRegistry()` - 清空 Store 注册表

### 路由检查器

- `registerRouter(router)` - 注册 Router
- `unregisterRouter()` - 注销 Router
- `isRouterRegistered()` - 检查 Router 是否已注册
- `getCurrentRoute()` - 获取当前路由
- `getRoutes()` - 获取所有路由
- `navigateTo(path, params, query)` - 导航到指定路由
- `navigateToName(name, params, query)` - 按名称导航
- `goBack()` - 返回上一页
- `getRouteHistory()` - 获取路由历史
- `clearRouteHistory()` - 清除路由历史
- `watchRouteChanges(callback)` - 监听路由变化
- `unwatchRouteChanges()` - 取消监听
- `serializeRouteInfo()` - 序列化路由信息

### 信号检查器

- `registerSignal(signal, name)` - 注册信号
- `unregisterSignal(name)` - 注销信号
- `getSignalNodes()` - 获取所有信号节点
- `getSignalNode(id)` - 获取单个信号节点
- `getDependencyGraph()` - 获取依赖关系图
- `createSnapshot(label)` - 创建状态快照
- `getSnapshots()` - 获取所有快照
- `getTimeTravelState()` - 获取时间旅行状态
- `restoreSnapshot(id)` - 恢复到指定快照
- `clearSnapshots()` - 清除所有快照
- `recordSignalUpdate(signal, oldValue, newValue)` - 记录信号更新
- `recordDependency(source, target)` - 记录依赖关系
- `clearSignalRegistry()` - 清空信号注册表
- `getPerformanceStats()` - 获取性能统计
- `getPerformanceRecords()` - 获取性能记录
- `clearPerformanceRecords()` - 清除性能记录

### 性能监控

- `initPerformanceMonitor(options)` - 初始化性能监控
- `recordMetric(name, data)` - 记录性能指标
- `getMetrics()` - 获取所有指标
- `getStats()` - 获取统计信息
- `registerAlertRule(rule)` - 注册告警规则
- `unregisterAlertRule(id)` - 注销告警规则
- `setAlertRuleEnabled(id, enabled)` - 设置告警规则是否启用
- `getAlertRules()` - 获取所有告警规则
- `getAlerts()` - 获取所有告警
- `acknowledgeAlert(id)` - 确认告警
- `acknowledgeAllAlerts()` - 确认所有告警
- `clearAlerts()` - 清除告警
- `addObserver(callback)` - 添加观察者
- `removeObserver(callback)` - 移除观察者
- `clearMetrics()` - 清除指标
- `resetPerformanceMonitor()` - 重置监控器
- `getPerformanceReport()` - 获取性能报告
- `startTimer(name)` - 开始计时器

### 基准测试

- `runBenchmark(config)` - 运行同步基准测试
- `runAsyncBenchmark(config)` - 运行异步基准测试
- `getBenchmarkResults()` - 获取所有基准测试结果
- `getLatestBenchmarkResult()` - 获取最新的基准测试结果
- `clearBenchmarkResults()` - 清除基准测试结果
- `serializeBenchmarkResult(result)` - 序列化基准测试结果
- `serializeAllBenchmarkResults()` - 序列化所有基准测试结果
- `compareBenchmarkResults(before, after)` - 比较两个基准测试结果
- `createLargeScaleBenchmark(config)` - 创建大规模基准测试
- `getMemoryUsage()` - 获取内存使用情况
- `serializeMemoryUsage()` - 序列化内存使用情况
- `createRegressionDetector(config)` - 创建性能回归检测器
- `LARGE_SCALE_SCENARIOS` - 大规模测试场景常量
