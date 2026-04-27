# DevTools API

Lyt.js v3.1.0 includes a powerful DevTools module that provides performance collection, component analysis, memory tracking, render tracking, and batch analysis capabilities.

## PerformanceCollector

A global performance collector for gathering runtime performance metrics from your application.

### Creating an Instance

```ts
import { PerformanceCollector } from 'lyt/devtools'

const collector = new PerformanceCollector(options?: PerformanceCollectorOptions)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| options.sampleInterval | `number` | Sampling interval (ms), default `1000` |
| options.maxSamples | `number` | Maximum number of samples, default `1000` |
| options.autoStart | `boolean` | Whether to auto-start collection, default `false` |

### Methods

#### start()

```ts
collector.start(): void
```

Starts performance data collection.

#### stop()

```ts
collector.stop(): void
```

Stops performance data collection.

#### getMetrics()

```ts
collector.getMetrics(): PerformanceMetrics
```

Gets the currently collected performance metrics.

```ts
interface PerformanceMetrics {
  /** FPS (frames per second) */
  fps: number
  /** Average frame time (ms) */
  avgFrameTime: number
  /** Maximum frame time (ms) */
  maxFrameTime: number
  /** Memory usage (bytes) */
  memoryUsage: number
  /** Component update count */
  updateCount: number
  /** Component render count */
  renderCount: number
  /** Sampling timestamps */
  timestamps: number[]
}
```

#### snapshot()

```ts
collector.snapshot(): PerformanceSnapshot
```

Creates a performance snapshot at the current moment.

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

Registers a metric change callback. Returns an unsubscribe function.

```ts
const unsubscribe = collector.onMetric((metrics) => {
  if (metrics.fps < 30) {
    console.warn('Low FPS warning:', metrics.fps)
  }
})

// Unsubscribe
unsubscribe()
```

---

## ComponentProfiler

A component-level performance profiler that tracks the rendering performance of individual components.

### Creating an Instance

```ts
import { ComponentProfiler } from 'lyt/devtools'

const profiler = new ComponentProfiler()
```

### Methods

#### profile()

```ts
profiler.profile(componentName: string): ComponentProfile
```

Gets the performance profile data for a specified component.

```ts
interface ComponentProfile {
  /** Component name */
  name: string
  /** Render count */
  renderCount: number
  /** Average render time (ms) */
  avgRenderTime: number
  /** Maximum render time (ms) */
  maxRenderTime: number
  /** Update count */
  updateCount: number
  /** Number of tracked dependencies */
  trackedDeps: number
  /** Number of child components */
  childCount: number
  /** Recent render timeline */
  timeline: RenderTimelineEntry[]
}
```

#### startProfiling() / stopProfiling()

```ts
profiler.startProfiling(componentName: string): void
profiler.stopProfiling(componentName: string): ComponentProfile
```

Starts/stops performance profiling for a specified component.

```ts
profiler.startProfiling('MyComponent')

// ... perform some operations ...

const profile = profiler.stopProfiling('MyComponent')
console.log(`Rendered ${profile.renderCount} times, avg ${profile.avgRenderTime}ms`)
```

#### getTopComponents()

```ts
profiler.getTopComponents(limit?: number): ComponentProfile[]
```

Gets the list of components with the longest render times.

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

Gets flamegraph data for a component's rendering, used for visual analysis.

```ts
interface FlamegraphData {
  name: string
  value: number
  children: FlamegraphData[]
}
```

---

## MemoryTracker

A memory usage tracker that monitors component memory allocation and deallocation.

### Creating an Instance

```ts
import { MemoryTracker } from 'lyt/devtools'

const tracker = new MemoryTracker()
```

### Methods

#### track()

```ts
tracker.track(target: any, label?: string): TrackedObject
```

Starts tracking the memory usage of an object.

```ts
const state = reactive({ items: [] })
tracker.track(state, 'main-state')
```

#### getReport()

```ts
tracker.getReport(): MemoryReport
```

Gets a memory usage report.

```ts
interface MemoryReport {
  /** Total tracked objects */
  totalTracked: number
  /** Total memory usage (bytes) */
  totalMemory: number
  /** Memory usage grouped by component */
  byComponent: Record<string, ComponentMemory>
  /** Potential memory leak list */
  potentialLeaks: MemoryLeak[]
}
```

#### detectLeaks()

```ts
tracker.detectLeaks(): MemoryLeak[]
```

Detects potential memory leaks.

```ts
interface MemoryLeak {
  /** Object label */
  label: string
  /** Object reference count */
  refCount: number
  /** Creation time */
  createdAt: number
  /** Last access time */
  lastAccessedAt: number
  /** Leak severity */
  severity: 'low' | 'medium' | 'high'
}
```

```ts
const leaks = tracker.detectLeaks()
leaks.forEach(leak => {
  console.warn(`[${leak.severity}] Potential memory leak: ${leak.label}`)
})
```

#### gc()

```ts
tracker.gc(): void
```

Suggests garbage collection (only effective in environments that support `gc()`).

---

## RenderTracker

A render process tracker that records detailed information about each render.

### Creating an Instance

```ts
import { RenderTracker } from 'lyt/devtools'

const renderTracker = new RenderTracker()
```

### Methods

#### enable() / disable()

```ts
renderTracker.enable(): void
renderTracker.disable(): void
```

Enables/disables render tracking.

#### getRenderLog()

```ts
renderTracker.getRenderLog(filter?: RenderLogFilter): RenderLogEntry[]
```

Gets the render log.

```ts
interface RenderLogEntry {
  /** Timestamp */
  timestamp: number
  /** Component name */
  component: string
  /** Render type */
  type: 'initial' | 'update' | 'force'
  /** Render duration (ms) */
  duration: number
  /** Trigger reason */
  trigger: string
  /** VNode count */
  vnodeCount: number
  /** Skipped nodes (static hoisting) */
  skippedNodes: number
}
```

```ts
// Get the latest 10 update-type render log entries
const logs = renderTracker.getRenderLog({
  type: 'update',
  limit: 10
})
```

#### getStats()

```ts
renderTracker.getStats(): RenderStats
```

Gets render statistics.

```ts
interface RenderStats {
  totalRenders: number
  initialRenders: number
  updateRenders: number
  forcedRenders: number
  avgDuration: number
  totalSkippedNodes: number
  staticHoistRate: number  // Static hoist hit rate
}
```

---

## BatchAnalyzer

A batch update analyzer that detects and optimizes batch rendering performance.

### Creating an Instance

```ts
import { BatchAnalyzer } from 'lyt/devtools'

const analyzer = new BatchAnalyzer()
```

### Methods

#### analyze()

```ts
analyzer.analyze(renderLog: RenderLogEntry[]): BatchAnalysis
```

Analyzes batch update patterns in the render log.

```ts
interface BatchAnalysis {
  /** Number of batch updates */
  batchCount: number
  /** Average updates per batch */
  avgBatchSize: number
  /** Unbatched updates (optimizable) */
  unbatchedUpdates: number
  /** Optimization suggestions */
  suggestions: BatchSuggestion[]
}
```

#### getSuggestions()

```ts
analyzer.getSuggestions(): BatchSuggestion[]
```

Gets batch update optimization suggestions.

```ts
interface BatchSuggestion {
  /** Suggestion type */
  type: 'merge-updates' | 'use-nextTick' | 'debounce' | 'throttle'
  /** Related component */
  component: string
  /** Estimated improvement */
  estimatedImprovement: number
  /** Suggestion description */
  description: string
}
```

```ts
const suggestions = analyzer.getSuggestions()
suggestions.forEach(s => {
  console.log(`[${s.component}] ${s.type}: ${s.description}`)
  console.log(`  Estimated improvement: ${s.estimatedImprovement}%`)
})
```

#### getTimeline()

```ts
analyzer.getTimeline(): BatchTimeline
```

Gets the timeline view data for batch updates.

```ts
interface BatchTimeline {
  /** Time range */
  range: { start: number; end: number }
  /** Batch update blocks */
  batches: BatchBlock[]
}

interface BatchBlock {
  /** Start time */
  start: number
  /** End time */
  end: number
  /** Included render entries */
  entries: RenderLogEntry[]
}
```

---

## Integration Example

### Enabling DevTools in Development

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

### Browser Extension Integration

Data output by the DevTools API can be accessed by browser extensions via the `window.__LYT_DEVTOOLS__` global variable:

```ts
// Auto-mounted to window (development only)
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

::: warning Note
The DevTools API is recommended for development use only. In production, related code should be removed via Tree Shaking.
:::
