# @lytjs/performance

Lyt.js 性能监控 SDK -- 轻量级 Web 性能监控解决方案。

## 特性

- **Web Vitals 监控** -- FCP、LCP、CLS、INP、TTFB 五大核心指标
- **组件渲染追踪** -- 渲染次数、耗时统计、频繁重渲染检测
- **内存泄漏检测** -- 堆内存、DOM 节点、事件监听器监控
- **灵活的上报系统** -- Console / Fetch / 自定义上报器
- **零运行时依赖** -- 纯原生 API 实现
- **体积小巧** -- 目标 < 3KB gzip
- **优雅降级** -- 不支持的浏览器中静默失败
- **极低开销** -- 监控本身不影响应用性能

## 安装

```bash
npm install @lytjs/performance
```

## 快速开始

```ts
import { initPerformance, onVital, trackComponentRender } from '@lytjs/performance'

// 一行代码初始化（自动启用所有功能）
initPerformance()

// 监听 LCP 指标
onVital('LCP', (metric) => {
  console.log(`LCP: ${metric.value.toFixed(0)}ms (${metric.rating})`)
})

// 追踪组件渲染
const endRender = trackComponentRender('MyComponent')
// ... 组件渲染逻辑 ...
endRender()
```

## API 文档

### SDK 初始化

#### `initPerformance(config?)`

初始化 Performance SDK，默认自动启用所有监控功能。

```ts
import { initPerformance } from '@lytjs/performance'

initPerformance({
  enableVitals: true,           // 启用 Web Vitals 监控
  enableComponentTracking: true, // 启用组件渲染追踪
  enableMemoryTracking: true,    // 启用内存监控
  reporter: {                   // 上报器配置
    type: 'console',            // 'console' | 'fetch' | 'custom'
    debug: true,
  },
  componentConfig: {            // 组件追踪配置
    slowThreshold: 50,          // 慢渲染阈值 (ms)
    frequentThreshold: 16.67,   // 频繁重渲染阈值 (ms)
    maxRecords: 50,             // 保留记录数
  },
  memoryConfig: {               // 内存追踪配置
    sampleInterval: 5000,       // 采样间隔 (ms)
    maxSamples: 100,            // 最大采样数
    heapGrowthThreshold: 5242880, // 堆增长警告阈值 (bytes)
  },
})
```

#### `destroyPerformance()`

销毁 SDK，停止所有监控并清理资源。

#### `isInitialized(): boolean`

检查 SDK 是否已初始化。

---

### Web Vitals 监控

#### `onVital(metric, callback): () => void`

注册指标回调，返回取消订阅函数。

```ts
// 监听特定指标
const unsubscribe = onVital('LCP', (metric) => {
  console.log(metric.name, metric.value, metric.rating)
})

// 监听所有指标
onVital('*', (metric) => {
  console.log(metric)
})

// 取消订阅
unsubscribe()
```

#### `getVitals(): VitalMetric[]`

获取所有已采集的指标。

#### `getVital(name): VitalMetric | null`

获取指定指标。

```ts
const lcp = getVital('LCP')
if (lcp) {
  console.log(`LCP: ${lcp.value}ms, Rating: ${lcp.rating}`)
}
```

#### `getVitalsReport(): VitalsReport`

生成完整的 Web Vitals 报告。

```ts
const report = getVitalsReport()
console.log(report.summary)
// { good: 3, needsImprovement: 1, poor: 1 }
```

#### `initVitals()` / `destroyVitals()`

手动初始化/销毁 Web Vitals 监控。

---

### 组件渲染追踪

#### `trackComponentRender(name): () => void`

追踪组件渲染，返回结束函数。

```ts
function renderComponent() {
  const endRender = trackComponentRender('UserList')

  try {
    // ... 渲染逻辑 ...
  } finally {
    endRender()
  }
}
```

#### `getComponentStats(): Record<string, ComponentStats>`

获取所有组件的渲染统计。

```ts
const stats = getComponentStats()
for (const [name, stat] of Object.entries(stats)) {
  console.log(`${name}: ${stat.renderCount} renders, avg ${stat.avgDuration.toFixed(2)}ms`)
}
```

#### `getSlowComponents(threshold?): SlowComponent[]`

获取慢渲染组件列表（按平均耗时降序排列）。

```ts
const slow = getSlowComponents(100) // 超过 100ms 的组件
slow.forEach((c) => {
  console.warn(`Slow component: ${c.name} (avg: ${c.avgDuration.toFixed(2)}ms)`)
})
```

#### `getFrequentRerenderComponents(): string[]`

获取频繁重渲染的组件名称列表。

---

### 内存泄漏检测

#### `trackMemory(config?)`

开始内存追踪，定期采集快照。

```ts
trackMemory({
  sampleInterval: 5000,  // 每 5 秒采样一次
  maxSamples: 100,       // 最多保留 100 个采样
})
```

#### `getMemorySnapshot(): MemorySnapshot`

获取当前内存快照。

```ts
const snapshot = getMemorySnapshot()
console.log(`Heap: ${formatBytes(snapshot.usedJSHeapSize!)}`)
console.log(`DOM nodes: ${snapshot.domNodeCount}`)
```

#### `detectLeaks(): MemoryLeakResult`

检测可能的内存泄漏。

```ts
const result = detectLeaks()
if (result.hasLeak) {
  result.leaks.forEach((leak) => {
    console.warn(`[${leak.severity}] ${leak.type}: ${leak.description}`)
  })
}
```

#### `getMemoryTrend(): MemoryTrendPoint[]`

获取内存使用趋势数据。

#### `getMemorySummary()`

获取内存使用摘要（含趋势方向判断）。

---

### 上报器

#### `createReporter(config): Reporter`

创建上报器实例。

```ts
// 开发环境：控制台上报
const reporter = createReporter({ type: 'console' })

// 生产环境：Fetch 上报
const reporter = createReporter({
  type: 'fetch',
  endpoint: 'https://example.com/api/performance',
  sampleRate: 0.5,  // 50% 采样率
  batch: {
    enabled: true,
    maxSize: 10,
    interval: 5000,
  },
})

// 自定义上报器
const reporter = createReporter({
  type: 'custom',
  reporter: {
    report(data) {
      // 自定义上报逻辑
    },
    destroy() {
      // 清理逻辑
    },
  },
})
```

#### `ConsoleReporter`

控制台上报器，将数据格式化输出到控制台。

#### `FetchReporter`

Fetch 上报器，支持批量上报、采样率控制和 sendBeacon 降级。

---

## 指标评级标准

| 指标 | Good | Needs Improvement | Poor |
|------|------|-------------------|------|
| FCP | <= 1800ms | 1800-3000ms | > 3000ms |
| LCP | <= 2500ms | 2500-4000ms | > 4000ms |
| CLS | <= 0.1 | 0.1-0.25 | > 0.25 |
| INP | <= 200ms | 200-500ms | > 500ms |
| TTFB | <= 800ms | 800-1800ms | > 1800ms |

## 浏览器兼容性

- Web Vitals: 支持所有现代浏览器（PerformanceObserver API）
- performance.memory: 仅 Chrome/Edge
- 内存泄漏检测: 在不支持 performance.memory 的浏览器中，堆数据为 null
- 组件渲染追踪: 所有浏览器（使用 performance.now 或 Date.now 降级）

## License

MIT
