# DevTools API

Lyt.js v3.1.0 内置了强大的 DevTools 模块，提供性能采集、组件分析、内存追踪、渲染追踪和批量分析能力。

## PerformanceCollector

全局性能采集器，用于收集应用运行时的性能指标。

### 创建实例

```ts
import { PerformanceCollector } from 'lyt/devtools'

const collector = new PerformanceCollector(options?: PerformanceCollectorOptions)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| options.sampleInterval | `number` | 采样间隔（ms），默认 `1000` |
| options.maxSamples | `number` | 最大采样数，默认 `1000` |
| options.autoStart | `boolean` | 是否自动开始采集，默认 `false` |

### 方法

#### start()

```ts
collector.start(): void
```

开始性能数据采集。

#### stop()

```ts
collector.stop(): void
```

停止性能数据采集。

#### getMetrics()

```ts
collector.getMetrics(): PerformanceMetrics
```

获取当前采集的性能指标。

```ts
interface PerformanceMetrics {
  /** FPS（帧率） */
  fps: number
  /** 平均帧时间（ms） */
  avgFrameTime: number
  /** 最大帧时间（ms） */
  maxFrameTime: number
  /** 内存使用量（bytes） */
  memoryUsage: number
  /** 组件更新次数 */
  updateCount: number
  /** 组件渲染次数 */
  renderCount: number
  /** 采样时间戳列表 */
  timestamps: number[]
}
```

#### snapshot()

```ts
collector.snapshot(): PerformanceSnapshot
```

创建当前时刻的性能快照。

```ts
const snapshot = collector.snapshot()
console.log(snapshot.fps)           // 60
console.log(snapshot.memoryUsage)   // 10485760
console.log(snapshot.componentCount) // 42
```

#### onMetric()

```ts
collector.onMetric(callback: (metrics: PerformanceMetrics) => void): () => void
```

注册指标变化回调，返回取消监听函数。

```ts
const unsubscribe = collector.onMetric((metrics) => {
  if (metrics.fps < 30) {
    console.warn('低帧率警告:', metrics.fps)
  }
})

// 取消监听
unsubscribe()
```

---

## ComponentProfiler

组件级性能分析器，追踪单个组件的渲染性能。

### 创建实例

```ts
import { ComponentProfiler } from 'lyt/devtools'

const profiler = new ComponentProfiler()
```

### 方法

#### profile()

```ts
profiler.profile(componentName: string): ComponentProfile
```

获取指定组件的性能分析数据。

```ts
interface ComponentProfile {
  /** 组件名称 */
  name: string
  /** 渲染次数 */
  renderCount: number
  /** 平均渲染时间（ms） */
  avgRenderTime: number
  /** 最大渲染时间（ms） */
  maxRenderTime: number
  /** 更新次数 */
  updateCount: number
  /** 依赖追踪数量 */
  trackedDeps: number
  /** 子组件数量 */
  childCount: number
  /** 最近渲染时间线 */
  timeline: RenderTimelineEntry[]
}
```

#### startProfiling() / stopProfiling()

```ts
profiler.startProfiling(componentName: string): void
profiler.stopProfiling(componentName: string): ComponentProfile
```

开始/停止对指定组件的性能分析。

```ts
profiler.startProfiling('MyComponent')

// ... 执行一些操作 ...

const profile = profiler.stopProfiling('MyComponent')
console.log(`渲染 ${profile.renderCount} 次，平均 ${profile.avgRenderTime}ms`)
```

#### getTopComponents()

```ts
profiler.getTopComponents(limit?: number): ComponentProfile[]
```

获取渲染耗时最长的组件列表。

```ts
const top5 = profiler.getTopComponents(5)
top5.forEach(p => {
  console.log(`${p.name}: ${p.avgRenderTime}ms / render`)
})
```

#### getFlamegraph()

```ts
profiler.getFlamegraph(componentName: string): FlamegraphData
```

获取组件渲染火焰图数据，用于可视化分析。

```ts
interface FlamegraphData {
  name: string
  value: number
  children: FlamegraphData[]
}
```

---

## MemoryTracker

内存使用追踪器，监控组件的内存分配和释放。

### 创建实例

```ts
import { MemoryTracker } from 'lyt/devtools'

const tracker = new MemoryTracker()
```

### 方法

#### track()

```ts
tracker.track(target: any, label?: string): TrackedObject
```

开始追踪一个对象的内存使用。

```ts
const state = reactive({ items: [] })
tracker.track(state, 'main-state')
```

#### getReport()

```ts
tracker.getReport(): MemoryReport
```

获取内存使用报告。

```ts
interface MemoryReport {
  /** 总追踪对象数 */
  totalTracked: number
  /** 总内存使用量（bytes） */
  totalMemory: number
  /** 按组件分组的内存使用 */
  byComponent: Record<string, ComponentMemory>
  /** 可能的内存泄漏列表 */
  potentialLeaks: MemoryLeak[]
}
```

#### detectLeaks()

```ts
tracker.detectLeaks(): MemoryLeak[]
```

检测可能的内存泄漏。

```ts
interface MemoryLeak {
  /** 对象标签 */
  label: string
  /** 对象引用计数 */
  refCount: number
  /** 创建时间 */
  createdAt: number
  /** 最后访问时间 */
  lastAccessedAt: number
  /** 泄漏严重程度 */
  severity: 'low' | 'medium' | 'high'
}
```

```ts
const leaks = tracker.detectLeaks()
leaks.forEach(leak => {
  console.warn(`[${leak.severity}] 可能的内存泄漏: ${leak.label}`)
})
```

#### gc()

```ts
tracker.gc(): void
```

建议垃圾回收（仅在支持 `gc()` 的环境中有效）。

---

## RenderTracker

渲染过程追踪器，记录每次渲染的详细信息。

### 创建实例

```ts
import { RenderTracker } from 'lyt/devtools'

const renderTracker = new RenderTracker()
```

### 方法

#### enable() / disable()

```ts
renderTracker.enable(): void
renderTracker.disable(): void
```

启用/禁用渲染追踪。

#### getRenderLog()

```ts
renderTracker.getRenderLog(filter?: RenderLogFilter): RenderLogEntry[]
```

获取渲染日志。

```ts
interface RenderLogEntry {
  /** 时间戳 */
  timestamp: number
  /** 组件名称 */
  component: string
  /** 渲染类型 */
  type: 'initial' | 'update' | 'force'
  /** 渲染耗时（ms） */
  duration: number
  /** 触发原因 */
  trigger: string
  /** VNode 数量 */
  vnodeCount: number
  /** 跳过的节点数（静态提升） */
  skippedNodes: number
}
```

```ts
// 获取最近 10 条更新类型的渲染日志
const logs = renderTracker.getRenderLog({
  type: 'update',
  limit: 10
})
```

#### getStats()

```ts
renderTracker.getStats(): RenderStats
```

获取渲染统计信息。

```ts
interface RenderStats {
  totalRenders: number
  initialRenders: number
  updateRenders: number
  forcedRenders: number
  avgDuration: number
  totalSkippedNodes: number
  staticHoistRate: number  // 静态提升命中率
}
```

---

## BatchAnalyzer

批量更新分析器，检测和优化批量渲染性能。

### 创建实例

```ts
import { BatchAnalyzer } from 'lyt/devtools'

const analyzer = new BatchAnalyzer()
```

### 方法

#### analyze()

```ts
analyzer.analyze(renderLog: RenderLogEntry[]): BatchAnalysis
```

分析渲染日志中的批量更新模式。

```ts
interface BatchAnalysis {
  /** 批量更新次数 */
  batchCount: number
  /** 平均每批更新数 */
  avgBatchSize: number
  /** 未批量的更新数（可优化项） */
  unbatchedUpdates: number
  /** 优化建议 */
  suggestions: BatchSuggestion[]
}
```

#### getSuggestions()

```ts
analyzer.getSuggestions(): BatchSuggestion[]
```

获取批量更新优化建议。

```ts
interface BatchSuggestion {
  /** 建议类型 */
  type: 'merge-updates' | 'use-nextTick' | 'debounce' | 'throttle'
  /** 相关组件 */
  component: string
  /** 预估优化收益 */
  estimatedImprovement: number
  /** 建议描述 */
  description: string
}
```

```ts
const suggestions = analyzer.getSuggestions()
suggestions.forEach(s => {
  console.log(`[${s.component}] ${s.type}: ${s.description}`)
  console.log(`  预估提升: ${s.estimatedImprovement}%`)
})
```

#### getTimeline()

```ts
analyzer.getTimeline(): BatchTimeline
```

获取批量更新的时间线视图数据。

```ts
interface BatchTimeline {
  /** 时间范围 */
  range: { start: number; end: number }
  /** 批量更新块 */
  batches: BatchBlock[]
}

interface BatchBlock {
  /** 开始时间 */
  start: number
  /** 结束时间 */
  end: number
  /** 包含的渲染条目 */
  entries: RenderLogEntry[]
}
```

---

## 集成示例

### 在开发环境中启用 DevTools

```ts
import { createApp } from 'lyt'
import { PerformanceCollector, ComponentProfiler, MemoryTracker } from 'lyt/devtools'

const app = createApp(App)

if (import.meta.env.DEV) {
  const collector = new PerformanceCollector({ autoStart: true })
  const profiler = new ComponentProfiler()
  const tracker = new MemoryTracker()

  collector.onMetric((metrics) => {
    console.log(`[DevTools] FPS: ${metrics.fps}, Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`)
  })
}

app.mount('#app')
```

### 浏览器扩展集成

DevTools API 输出的数据可通过 `window.__LYT_DEVTOOLS__` 全局变量被浏览器扩展访问：

```ts
// 自动挂载到 window（仅开发环境）
if (import.meta.env.DEV) {
  window.__LYT_DEVTOOLS__ = {
    collector,
    profiler,
    tracker,
    renderTracker,
    analyzer
  }
}
```

::: warning 注意
DevTools API 仅建议在开发环境中使用，生产环境应通过 Tree Shaking 移除相关代码。
:::
