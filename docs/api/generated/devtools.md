# @lytjs/devtools

开发调试工具（服务端包，区别于 devtools-extension）

## 目录

- [BenchmarkResult](#benchmarkresult)
- [BenchmarkConfig](#benchmarkconfig)
- [LargeScaleScenario](#largescalescenario)
- [LARGE_SCALE_SCENARIOS](#large-scale-scenarios)
- [runBenchmark](#runbenchmark)
- [runAsyncBenchmark](#runasyncbenchmark)
- [storeBenchmarkResult](#storebenchmarkresult)
- [getBenchmarkResults](#getbenchmarkresults)
- [getLatestBenchmarkResult](#getlatestbenchmarkresult)
- [clearBenchmarkResults](#clearbenchmarkresults)
- [serializeBenchmarkResult](#serializebenchmarkresult)
- [serializeAllBenchmarkResults](#serializeallbenchmarkresults)
- [compareBenchmarkResults](#comparebenchmarkresults)
- [createLargeScaleBenchmark](#createlargescalebenchmark)
- [MemoryUsage](#memoryusage)
- [getMemoryUsage](#getmemoryusage)
- [serializeMemoryUsage](#serializememoryusage)
- [createRegressionDetector](#createregressiondetector)
- [generateComponentId](#generatecomponentid)
- [extractComponentInfo](#extractcomponentinfo)
- [buildComponentTreeRecursive](#buildcomponenttreerecursive)
- [getComponentTree](#getcomponenttree)
- [serializeComponentTree](#serializecomponenttree)
- [registerRootComponent](#registerrootcomponent)
- [unregisterRootComponent](#unregisterrootcomponent)
- [SimpleEventEmitter](#simpleeventemitter)
- [createEventEmitter](#createeventemitter)
- [LogLevel](#loglevel)
- [LogEntry](#logentry)
- [DebugOptions](#debugoptions)
- [DebugEvents](#debugevents)
- [initDebugEnhancer](#initdebugenhancer)
- [log](#log)
- [debug](#debug)
- [info](#info)
- [warn](#warn)
- [error](#error)
- [trace](#trace)
- [outputToConsole](#outputtoconsole)
- [getLogs](#getlogs)
- [clearLogs](#clearlogs)
- [onLog](#onlog)
- [onClear](#onclear)
- [createDebugger](#createdebugger)
- [measurePerformance](#measureperformance)
- [measureAsyncPerformance](#measureasyncperformance)
- [Checkpoint](#checkpoint)
- [createCheckpoint](#createcheckpoint)
- [getCheckpoints](#getcheckpoints)
- [compareCheckpoints](#comparecheckpoints)
- [clearCheckpoints](#clearcheckpoints)
- [installGlobalDebugTools](#installglobaldebugtools)
- [serializeDebugInfo](#serializedebuginfo)
- [DevTools](#devtools)
- [installDevTools](#installdevtools)
- [getDevTools](#getdevtools)
- [uninstallDevTools](#uninstalldevtools)
- [MetricType](#metrictype)
- [PerformanceMetric](#performancemetric)
- [AlertLevel](#alertlevel)
- [AlertRule](#alertrule)
- [Alert](#alert)
- [PerformanceStats](#performancestats)
- [MonitorOptions](#monitoroptions)
- [DEFAULT_OPTIONS](#default-options)
- [ObserverCallback](#observercallback)
- [initPerformanceMonitor](#initperformancemonitor)
- [initPageMetrics](#initpagemetrics)
- [initLongTaskObserver](#initlongtaskobserver)
- [initDefaultAlertRules](#initdefaultalertrules)
- [recordMetric](#recordmetric)
- [getMetrics](#getmetrics)
- [getStats](#getstats)
- [percentile](#percentile)
- [registerAlertRule](#registeralertrule)
- [unregisterAlertRule](#unregisteralertrule)
- [setAlertRuleEnabled](#setalertruleenabled)
- [getAlertRules](#getalertrules)
- [getAlerts](#getalerts)
- [acknowledgeAlert](#acknowledgealert)
- [acknowledgeAllAlerts](#acknowledgeallalerts)
- [clearAlerts](#clearalerts)
- [checkAlertRules](#checkalertrules)
- [interpolateMessage](#interpolatemessage)
- [outputAlert](#outputalert)
- [addObserver](#addobserver)
- [removeObserver](#removeobserver)
- [clearMetrics](#clearmetrics)
- [resetPerformanceMonitor](#resetperformancemonitor)
- [getPerformanceReport](#getperformancereport)
- [serializePerformanceReport](#serializeperformancereport)
- [startTimer](#starttimer)
- [TimelineEvent](#timelineevent)
- [FlameGraphNode](#flamegraphnode)
- [timelineEventStack](#timelineeventstack)
- [currentDepth](#currentdepth)
- [beginTimelineEvent](#begintimelineevent)
- [endTimelineEvent](#endtimelineevent)
- [getTimelineEvents](#gettimelineevents)
- [getTimelineEventsInRange](#gettimelineeventsinrange)
- [getSlowOperations](#getslowoperations)
- [getFlameGraphData](#getflamegraphdata)
- [findParentNode](#findparentnode)
- [aggregateFlameGraphValues](#aggregateflamegraphvalues)
- [clearTimelineEvents](#cleartimelineevents)
- [exportTimelineAsJSON](#exporttimelineasjson)
- [serializeTimelineEvents](#serializetimelineevents)
- [RouterMatched](#routermatched)
- [RouterLocation](#routerlocation)
- [RouterInstance](#routerinstance)
- [registerRouter](#registerrouter)
- [unregisterRouter](#unregisterrouter)
- [getCurrentRoute](#getcurrentroute)
- [getRouteHistory](#getroutehistory)
- [watchRouteChanges](#watchroutechanges)
- [unwatchRouteChanges](#unwatchroutechanges)
- [navigateTo](#navigateto)
- [navigateToName](#navigatetoname)
- [goBack](#goback)
- [serializeRouteInfo](#serializerouteinfo)
- [getRoutes](#getroutes)
- [isRouterRegistered](#isrouterregistered)
- [clearRouteHistory](#clearroutehistory)
- [SignalNode](#signalnode)
- [Snapshot](#snapshot)
- [SignalSnapshot](#signalsnapshot)
- [TimeTravelState](#timetravelstate)
- [PerformanceRecord](#performancerecord)
- [DependencyGraphNode](#dependencygraphnode)
- [DependencyGraphEdge](#dependencygraphedge)
- [DependencyGraph](#dependencygraph)
- [VisualLayoutNode](#visuallayoutnode)
- [VisualLayoutEdge](#visuallayoutedge)
- [VisualLayoutGraph](#visuallayoutgraph)
- [LayoutOptions](#layoutoptions)
- [DEFAULT_LAYOUT_OPTIONS](#default-layout-options)
- [registerSignal](#registersignal)
- [unregisterSignal](#unregistersignal)
- [recordSignalUpdate](#recordsignalupdate)
- [recordDependency](#recorddependency)
- [getSignalNodes](#getsignalnodes)
- [getSignalNode](#getsignalnode)
- [getDependencyGraph](#getdependencygraph)
- [createSnapshot](#createsnapshot)
- [getSnapshots](#getsnapshots)
- [getSnapshot](#getsnapshot)
- [getTimeTravelState](#gettimetravelstate)
- [restoreSnapshot](#restoresnapshot)
- [clearSnapshots](#clearsnapshots)
- [recordPerformance](#recordperformance)
- [getPerformanceRecords](#getperformancerecords)
- [getPerformanceStats](#getperformancestats)
- [clearPerformanceRecords](#clearperformancerecords)
- [clearSignalRegistry](#clearsignalregistry)
- [serializeSignalNode](#serializesignalnode)
- [serializeDependencyGraph](#serializedependencygraph)
- [serializePerformanceStats](#serializeperformancestats)
- [calculateNodeLevels](#calculatenodelevels)
- [calculateNodeDegrees](#calculatenodedegrees)
- [getVisualLayoutGraph](#getvisuallayoutgraph)
- [getSubgraph](#getsubgraph)
- [searchSignals](#searchsignals)
- [filterSignals](#filtersignals)
- [SnapshotDiff](#snapshotdiff)
- [compareSnapshots](#comparesnapshots)
- [serializeSnapshotDiff](#serializesnapshotdiff)
- [getDiffBetweenSnapshots](#getdiffbetweensnapshots)
- [TimeTravelNavigator](#timetravelnavigator)
- [getTimeTravelNavigator](#gettimetravelnavigator)
- [timeTravelBack](#timetravelback)
- [timeTravelForward](#timetravelforward)
- [StoreInstance](#storeinstance)
- [StoreChangeCallback](#storechangecallback)
- [registerStore](#registerstore)
- [unregisterStore](#unregisterstore)
- [getStoreStates](#getstorestates)
- [getStoreState](#getstorestate)
- [setStoreState](#setstorestate)
- [dispatchStoreAction](#dispatchstoreaction)
- [serializeStoreStates](#serializestorestates)
- [deepClone](#deepclone)
- [subscribeStore](#subscribestore)
- [unsubscribeStore](#unsubscribestore)
- [onStoreChange](#onstorechange)
- [clearStoreRegistry](#clearstoreregistry)
- [getRegisteredStoreIds](#getregisteredstoreids)
- [DevToolsOptions](#devtoolsoptions)
- [ComponentTreeNode](#componenttreenode)
- [StoreStateInfo](#storestateinfo)
- [RouteInfo](#routeinfo)
- [SignalNode](#signalnode)
- [Snapshot](#snapshot)
- [SignalSnapshot](#signalsnapshot)
- [TimeTravelState](#timetravelstate)
- [PerformanceRecord](#performancerecord)
- [DependencyGraphNode](#dependencygraphnode)
- [DependencyGraphEdge](#dependencygraphedge)
- [DependencyGraph](#dependencygraph)
- [PerformanceStats](#performancestats)
- [DevToolsAPI](#devtoolsapi)
- [VDOMNodeInfo](#vdomnodeinfo)
- [VDOMRegistry](#vdomregistry)
- [generateId](#generateid)
- [getVNodeType](#getvnodetype)
- [extractTextContent](#extracttextcontent)
- [extractProps](#extractprops)
- [registerVDOMRoot](#registervdomroot)
- [processVNode](#processvnode)
- [unregisterVDOMRoot](#unregistervdomroot)
- [cleanupNode](#cleanupnode)
- [getVDOMRoots](#getvdomroots)
- [getVDOMNodeById](#getvdomnodebyid)
- [getVDOMTree](#getvdomtree)
- [findVDOMNodesByTag](#findvdomnodesbytag)
- [findVDOMNodesByProp](#findvdomnodesbyprop)
- [getVDOMStats](#getvdomstats)
- [clearVDOMRegistry](#clearvdomregistry)
- [serializeVDOMNode](#serializevdomnode)
- [serializeVDOMTree](#serializevdomtree)
- [getVDOMPath](#getvdompath)
- [highlightVDOMNode](#highlightvdomnode)
- [inspectVDOMNode](#inspectvdomnode)

## BenchmarkResult

**Interface**

基准测试结果

### 成员

| 名称            | 类型     | 描述 | 可选 |
| --------------- | -------- | ---- | ---- |
| name            | `string` |      | 否   |
| iterations      | `number` |      | 否   |
| totalDuration   | `number` |      | 否   |
| averageDuration | `number` |      | 否   |
| minDuration     | `number` |      | 否   |
| maxDuration     | `number` |      | 否   |
| opsPerSecond    | `number` |      | 否   |
| timestamp       | `number` |      | 否   |

## BenchmarkConfig

**Interface**

基准测试配置

### 成员

| 名称       | 类型                          | 描述         | 可选 |
| ---------- | ----------------------------- | ------------ | ---- |
| name       | `string`                      | 测试名称     | 否   |
| iterations | `number`                      | 迭代次数     | 否   |
| warmup     | `number`                      | 预热次数     | 是   |
| fn         | `() => void \| Promise<void>` | 异步测试回调 | 否   |
| asyncFn    | `() => Promise<void>`         | 异步回调     | 是   |

## LargeScaleScenario

**Interface**

大规模场景配置

### 成员

| 名称        | 类型     | 描述 | 可选 |
| ----------- | -------- | ---- | ---- |
| name        | `string` |      | 否   |
| nodeCount   | `number` |      | 否   |
| description | `string` |      | 否   |

## LARGE_SCALE_SCENARIOS

**Variable**

预定义的大规模场景

## runBenchmark

**Function**

运行同步基准测试

### 签名

```typescript
runBenchmark: BenchmarkResult;
```

### 参数

| 参数   | 类型              | 描述 | 可选 | 默认值 |
| ------ | ----------------- | ---- | ---- | ------ |
| config | `BenchmarkConfig` |      | 否   | -      |

### 返回值

**类型:** `BenchmarkResult`

## runAsyncBenchmark

**Function**

运行异步基准测试

### 签名

```typescript
runAsyncBenchmark: Promise<BenchmarkResult>;
```

### 参数

| 参数   | 类型              | 描述 | 可选 | 默认值 |
| ------ | ----------------- | ---- | ---- | ------ |
| config | `BenchmarkConfig` |      | 否   | -      |

### 返回值

**类型:** `Promise<BenchmarkResult>`

## storeBenchmarkResult

**Function**

存储基准测试结果

### 签名

```typescript
storeBenchmarkResult: void
```

### 参数

| 参数   | 类型              | 描述 | 可选 | 默认值 |
| ------ | ----------------- | ---- | ---- | ------ |
| name   | `string`          |      | 否   | -      |
| result | `BenchmarkResult` |      | 否   | -      |

### 返回值

**类型:** `void`

## getBenchmarkResults

**Function**

获取基准测试结果

### 签名

```typescript
getBenchmarkResults: BenchmarkResult[]
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| name | `string` |      | 是   | -      |

### 返回值

**类型:** `BenchmarkResult[]`

## getLatestBenchmarkResult

**Function**

获取最新基准测试结果

### 签名

```typescript
getLatestBenchmarkResult: BenchmarkResult | undefined;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| name | `string` |      | 否   | -      |

### 返回值

**类型:** `BenchmarkResult | undefined`

## clearBenchmarkResults

**Function**

清除基准测试结果

### 签名

```typescript
clearBenchmarkResults: void
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| name | `string` |      | 是   | -      |

### 返回值

**类型:** `void`

## serializeBenchmarkResult

**Function**

序列化基准测试结果

### 签名

```typescript
serializeBenchmarkResult: string;
```

### 参数

| 参数   | 类型              | 描述 | 可选 | 默认值 |
| ------ | ----------------- | ---- | ---- | ------ |
| result | `BenchmarkResult` |      | 否   | -      |

### 返回值

**类型:** `string`

## serializeAllBenchmarkResults

**Function**

序列化所有基准测试结果

### 签名

```typescript
serializeAllBenchmarkResults: string;
```

### 返回值

**类型:** `string`

## compareBenchmarkResults

**Function**

比较两次基准测试

### 签名

```typescript
compareBenchmarkResults: {
  durationDiff: number;
  durationDiffPercent: number;
  opsDiff: number;
  opsDiffPercent: number;
  improved: boolean;
}
```

### 参数

| 参数      | 类型              | 描述 | 可选 | 默认值 |
| --------- | ----------------- | ---- | ---- | ------ |
| oldResult | `BenchmarkResult` |      | 否   | -      |
| newResult | `BenchmarkResult` |      | 否   | -      |

### 返回值

**类型:** `{ durationDiff: number; durationDiffPercent: number; opsDiff: number; opsDiffPercent: number; improved: boolean; }`

## createLargeScaleBenchmark

**Function**

生成大规模测试场景的基准测试

### 签名

```typescript
createLargeScaleBenchmark: BenchmarkConfig;
```

### 参数

| 参数     | 类型                                           | 描述 | 可选 | 默认值 |
| -------- | ---------------------------------------------- | ---- | ---- | ------ |
| scenario | `LargeScaleScenario`                           |      | 否   | -      |
| testFn   | `(nodeCount: number) => void \| Promise<void>` |      | 否   | -      |

### 返回值

**类型:** `BenchmarkConfig`

## MemoryUsage

**Interface**

内存使用情况

### 成员

| 名称            | 类型     | 描述 | 可选 |
| --------------- | -------- | ---- | ---- |
| usedJSHeapSize  | `number` |      | 否   |
| totalJSHeapSize | `number` |      | 否   |
| jsHeapSizeLimit | `number` |      | 否   |

## getMemoryUsage

**Function**

获取当前内存使用情况

### 签名

```typescript
getMemoryUsage: MemoryUsage | null;
```

### 返回值

**类型:** `MemoryUsage | null`

## serializeMemoryUsage

**Function**

序列化内存使用情况

### 签名

```typescript
serializeMemoryUsage: string;
```

### 参数

| 参数  | 类型          | 描述 | 可选 | 默认值 |
| ----- | ------------- | ---- | ---- | ------ |
| usage | `MemoryUsage` |      | 否   | -      |

### 返回值

**类型:** `string`

## createRegressionDetector

**Function**

创建性能回归检测

## generateComponentId

**Function**

生成组件 ID

### 签名

```typescript
generateComponentId: string;
```

### 返回值

**类型:** `string`

## extractComponentInfo

**Function**

提取组件信息

### 签名

```typescript
extractComponentInfo: ComponentTreeNode | null;
```

### 参数

| 参数      | 类型                                                                        | 描述 | 可选 | 默认值 |
| --------- | --------------------------------------------------------------------------- | ---- | ---- | ------ |
| component | `{ name?: string; displayName?: string; props?: Record<string, unknown>; }` |      | 否   | -      |

### 返回值

**类型:** `ComponentTreeNode | null`

## buildComponentTreeRecursive

**Function**

递归构建组件树

### 签名

```typescript
buildComponentTreeRecursive: ComponentTreeNode | null;
```

### 参数

| 参数      | 类型                                                                                              | 描述 | 可选 | 默认值 |
| --------- | ------------------------------------------------------------------------------------------------- | ---- | ---- | ------ |
| component | `{ name?: string; displayName?: string; props?: Record<string, unknown>; children?: unknown[]; }` |      | 否   | -      |
| parentId  | `string`                                                                                          |      | 是   | -      |

### 返回值

**类型:** `ComponentTreeNode | null`

## getComponentTree

**Function**

获取组件树

### 签名

```typescript
getComponentTree: ComponentTreeNode[]
```

### 参数

| 参数          | 类型                                                                                              | 描述 | 可选 | 默认值 |
| ------------- | ------------------------------------------------------------------------------------------------- | ---- | ---- | ------ |
| rootComponent | `{ name?: string; displayName?: string; props?: Record<string, unknown>; children?: unknown[]; }` |      | 是   | -      |

### 返回值

**类型:** `ComponentTreeNode[]`

## serializeComponentTree

**Function**

序列化组件树为字符串

### 签名

```typescript
serializeComponentTree: string;
```

### 参数

| 参数   | 类型                  | 描述 | 可选 | 默认值 |
| ------ | --------------------- | ---- | ---- | ------ |
| nodes  | `ComponentTreeNode[]` |      | 否   | -      |
| indent | `any`                 |      | 是   | `0`    |

### 返回值

**类型:** `string`

## registerRootComponent

**Function**

注册根组件（供开发时使用）

### 签名

```typescript
registerRootComponent: void
```

### 参数

| 参数      | 类型      | 描述 | 可选 | 默认值 |
| --------- | --------- | ---- | ---- | ------ |
| component | `unknown` |      | 否   | -      |

### 返回值

**类型:** `void`

## unregisterRootComponent

**Function**

清除注册的根组件

### 签名

```typescript
unregisterRootComponent: void
```

### 返回值

**类型:** `void`

## SimpleEventEmitter

**Class**

### 成员

| 名称               | 类型                                             | 描述 | 可选 |
| ------------------ | ------------------------------------------------ | ---- | ---- |
| listeners          | `Map<string, Set<(...args: unknown[]) => void>>` |      | 否   |
| onceListeners      | `Map<string, Set<(...args: unknown[]) => void>>` |      | 否   |
| on                 | -                                                |      | 否   |
| off                | -                                                |      | 否   |
| emit               | -                                                |      | 否   |
| once               | -                                                |      | 否   |
| removeAllListeners | -                                                |      | 否   |

## createEventEmitter

**Function**

## LogLevel

**Type**

Log levels

### 签名

```typescript
LogLevel: 'debug' | 'info' | 'warn' | 'error' | 'trace';
```

## LogEntry

**Interface**

Log entry

### 成员

| 名称      | 类型                      | 描述 | 可选 |
| --------- | ------------------------- | ---- | ---- |
| id        | `string`                  |      | 否   |
| timestamp | `number`                  |      | 否   |
| level     | `LogLevel`                |      | 否   |
| category  | `string`                  |      | 否   |
| message   | `string`                  |      | 否   |
| metadata  | `Record<string, unknown>` |      | 是   |
| stack     | `string`                  |      | 是   |

## DebugOptions

**Interface**

Debug options

### 成员

| 名称               | 类型         | 描述                            | 可选 |
| ------------------ | ------------ | ------------------------------- | ---- |
| enabledLevels      | `LogLevel[]` | Enabled log levels              | 是   |
| maxLogs            | `number`     | Maximum log records             | 是   |
| consoleOutput      | `boolean`    | Whether to output to console    | 是   |
| captureStackTraces | `boolean`    | Whether to capture stack traces | 是   |

## DebugEvents

**Type**

### 签名

```typescript
DebugEvents: {
  log: [entry: LogEntry];
  clear: [];
}
```

## initDebugEnhancer

**Function**

Initialize debug system

### 签名

```typescript
initDebugEnhancer: void
```

### 参数

| 参数    | 类型           | 描述 | 可选 | 默认值 |
| ------- | -------------- | ---- | ---- | ------ |
| options | `DebugOptions` |      | 是   | -      |

### 返回值

**类型:** `void`

## log

**Function**

Log a debug message

### 签名

```typescript
log: LogEntry;
```

### 参数

| 参数     | 类型                      | 描述 | 可选 | 默认值 |
| -------- | ------------------------- | ---- | ---- | ------ |
| level    | `LogLevel`                |      | 否   | -      |
| category | `string`                  |      | 否   | -      |
| message  | `string`                  |      | 否   | -      |
| metadata | `Record<string, unknown>` |      | 是   | -      |

### 返回值

**类型:** `LogEntry`

## debug

**Variable**

Convenience log methods

## info

**Variable**

## warn

**Variable**

## error

**Variable**

## trace

**Variable**

## outputToConsole

**Function**

Output to console

### 签名

```typescript
outputToConsole: void
```

### 参数

| 参数  | 类型       | 描述 | 可选 | 默认值 |
| ----- | ---------- | ---- | ---- | ------ |
| entry | `LogEntry` |      | 否   | -      |

### 返回值

**类型:** `void`

## getLogs

**Function**

Get logs

### 签名

```typescript
getLogs: LogEntry[]
```

### 参数

| 参数    | 类型                                                       | 描述 | 可选 | 默认值 |
| ------- | ---------------------------------------------------------- | ---- | ---- | ------ |
| options | `{ level?: LogLevel; category?: string; limit?: number; }` |      | 是   | -      |

### 返回值

**类型:** `LogEntry[]`

## clearLogs

**Function**

Clear logs

### 签名

```typescript
clearLogs: void
```

### 返回值

**类型:** `void`

## onLog

**Function**

Subscribe to log events

### 签名

```typescript
onLog: () => void
```

### 参数

| 参数     | 类型                        | 描述 | 可选 | 默认值 |
| -------- | --------------------------- | ---- | ---- | ------ |
| callback | `(entry: LogEntry) => void` |      | 否   | -      |

### 返回值

**类型:** `() => void`

## onClear

**Function**

Subscribe to clear events

### 签名

```typescript
onClear: () => void
```

### 参数

| 参数     | 类型         | 描述 | 可选 | 默认值 |
| -------- | ------------ | ---- | ---- | ------ |
| callback | `() => void` |      | 否   | -      |

### 返回值

**类型:** `() => void`

## createDebugger

**Function**

Create a debug breakpoint

### 签名

```typescript
createDebugger: () => void
```

### 参数

| 参数      | 类型            | 描述 | 可选 | 默认值 |
| --------- | --------------- | ---- | ---- | ------ |
| category  | `string`        |      | 否   | -      |
| condition | `() => boolean` |      | 是   | -      |

### 返回值

**类型:** `() => void`

## measurePerformance

**Function**

Performance measurement decorator

### 签名

```typescript
measurePerformance: <T extends (...args: unknown[]) => unknown>(fn: T) => T;
```

### 参数

| 参数     | 类型     | 描述 | 可选 | 默认值          |
| -------- | -------- | ---- | ---- | --------------- |
| name     | `string` |      | 否   | -               |
| category | `string` |      | 是   | `'performance'` |

### 返回值

**类型:** `<T extends (...args: unknown[]) => unknown>(fn: T) => T`

## measureAsyncPerformance

**Function**

Async performance measurement

### 签名

```typescript
measureAsyncPerformance: Promise<T>;
```

### 参数

| 参数     | 类型               | 描述 | 可选 | 默认值          |
| -------- | ------------------ | ---- | ---- | --------------- |
| name     | `string`           |      | 否   | -               |
| fn       | `() => Promise<T>` |      | 否   | -               |
| category | `string`           |      | 是   | `'performance'` |

### 返回值

**类型:** `Promise<T>`

## Checkpoint

**Interface**

### 成员

| 名称      | 类型                      | 描述 | 可选 |
| --------- | ------------------------- | ---- | ---- |
| id        | `string`                  |      | 否   |
| name      | `string`                  |      | 否   |
| timestamp | `number`                  |      | 否   |
| state     | `Record<string, unknown>` |      | 否   |

## createCheckpoint

**Function**

Create a checkpoint

### 签名

```typescript
createCheckpoint: string;
```

### 参数

| 参数  | 类型                      | 描述 | 可选 | 默认值 |
| ----- | ------------------------- | ---- | ---- | ------ |
| name  | `string`                  |      | 否   | -      |
| state | `Record<string, unknown>` |      | 否   | -      |

### 返回值

**类型:** `string`

## getCheckpoints

**Function**

Get checkpoints

### 签名

```typescript
getCheckpoints: Checkpoint[]
```

### 返回值

**类型:** `Checkpoint[]`

## compareCheckpoints

**Function**

Compare checkpoints

### 签名

```typescript
compareCheckpoints: {
  added: string[];
  removed: string[];
  changed: string[];
}
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| id1  | `string` |      | 否   | -      |
| id2  | `string` |      | 否   | -      |

### 返回值

**类型:** `{ added: string[]; removed: string[]; changed: string[]; }`

## clearCheckpoints

**Function**

Clear checkpoints

### 签名

```typescript
clearCheckpoints: void
```

### 返回值

**类型:** `void`

## installGlobalDebugTools

**Function**

Install to global object (browser environment)

### 签名

```typescript
installGlobalDebugTools: void
```

### 返回值

**类型:** `void`

## serializeDebugInfo

**Function**

Serialize debug info

### 签名

```typescript
serializeDebugInfo: string;
```

### 返回值

**类型:** `string`

## DevTools

**Class**

DevTools 类

### 成员

| 名称                 | 类型                        | 描述                    | 可选 |
| -------------------- | --------------------------- | ----------------------- | ---- |
| options              | `Required<DevToolsOptions>` |                         | 否   |
| isOpen               | -                           |                         | 否   |
| init                 | -                           | 初始化 DevTools         | 否   |
| createPanel          | -                           | 创建 DevTools 面板      | 否   |
| renderTab            | -                           | 渲染标签页内容          | 否   |
| renderComponentsTab  | -                           | 渲染组件标签页          | 否   |
| renderStoreTab       | -                           | 渲染 Store 标签页       | 否   |
| renderSignalsTab     | -                           | 渲染 Signals 标签页     | 否   |
| renderSignalsList    | -                           | 渲染信号列表            | 否   |
| renderVDOMTab        | -                           | 渲染 VDOM 标签页        | 否   |
| renderPerformanceTab | -                           | 渲染 Performance 标签页 | 否   |
| renderRouterTab      | -                           | 渲染 Router 标签页      | 否   |
| open                 | -                           | 打开面板                | 否   |
| close                | -                           | 关闭面板                | 否   |
| toggle               | -                           | 切换面板                | 否   |
| refresh              | -                           | 刷新内容                | 否   |
| getComponentTree     | -                           |                         | 否   |
| getStoreStates       | -                           |                         | 否   |
| getCurrentRoute      | -                           |                         | 否   |

## installDevTools

**Function**

安装 DevTools

### 签名

```typescript
installDevTools: DevToolsAPI;
```

### 参数

| 参数    | 类型              | 描述 | 可选 | 默认值 |
| ------- | ----------------- | ---- | ---- | ------ |
| options | `DevToolsOptions` |      | 是   | -      |

### 返回值

**类型:** `DevToolsAPI`

## getDevTools

**Function**

获取 DevTools 实例

### 签名

```typescript
getDevTools: DevToolsAPI | null;
```

### 返回值

**类型:** `DevToolsAPI | null`

## uninstallDevTools

**Function**

卸载 DevTools

### 签名

```typescript
uninstallDevTools: void
```

### 返回值

**类型:** `void`

## MetricType

**Type**

性能指标类型

### 签名

```typescript
MetricType: 'render' | 'update' | 'effect' | 'computed' | 'reaction' | 'custom';
```

## PerformanceMetric

**Interface**

性能指标

### 成员

| 名称      | 类型                      | 描述 | 可选 |
| --------- | ------------------------- | ---- | ---- |
| id        | `string`                  |      | 否   |
| name      | `string`                  |      | 否   |
| type      | `MetricType`              |      | 否   |
| duration  | `number`                  |      | 否   |
| timestamp | `number`                  |      | 否   |
| metadata  | `Record<string, unknown>` |      | 是   |

## AlertLevel

**Type**

告警级别

### 签名

```typescript
AlertLevel: 'info' | 'warning' | 'error' | 'critical';
```

## AlertRule

**Interface**

告警规则

### 成员

| 名称      | 类型                                                              | 描述 | 可选 |
| --------- | ----------------------------------------------------------------- | ---- | ---- |
| id        | `string`                                                          |      | 否   |
| name      | `string`                                                          |      | 否   |
| level     | `AlertLevel`                                                      |      | 否   |
| condition | `(metric: PerformanceMetric, stats: PerformanceStats) => boolean` |      | 否   |
| message   | `string`                                                          |      | 否   |
| enabled   | `boolean`                                                         |      | 否   |
| cooldown  | `number`                                                          |      | 否   |

## Alert

**Interface**

告警

### 成员

| 名称         | 类型                | 描述 | 可选 |
| ------------ | ------------------- | ---- | ---- |
| id           | `string`            |      | 否   |
| ruleId       | `string`            |      | 否   |
| ruleName     | `string`            |      | 否   |
| level        | `AlertLevel`        |      | 否   |
| message      | `string`            |      | 否   |
| metric       | `PerformanceMetric` |      | 是   |
| timestamp    | `number`            |      | 否   |
| acknowledged | `boolean`           |      | 否   |

## PerformanceStats

**Interface**

性能统计

### 成员

| 名称    | 类型     | 描述 | 可选 |
| ------- | -------- | ---- | ---- |
| count   | `number` |      | 否   |
| total   | `number` |      | 否   |
| average | `number` |      | 否   |
| min     | `number` |      | 否   |
| max     | `number` |      | 否   |
| p50     | `number` |      | 否   |
| p90     | `number` |      | 否   |
| p99     | `number` |      | 否   |

## MonitorOptions

**Interface**

监控配置

### 成员

| 名称                  | 类型      | 描述                 | 可选 |
| --------------------- | --------- | -------------------- | ---- |
| enabled               | `boolean` | 是否启用监控         | 是   |
| maxRecords            | `number`  | 最大记录数           | 是   |
| sampleRate            | `number`  | 默认采样率 (0-1)     | 是   |
| autoRecordPageMetrics | `boolean` | 是否自动记录页面指标 | 是   |
| autoRecordLongTasks   | `boolean` | 是否自动记录长任务   | 是   |
| longTaskThreshold     | `number`  | 长任务阈值 (ms)      | 是   |

## DEFAULT_OPTIONS

**Variable**

默认配置

## ObserverCallback

**Type**

### 签名

```typescript
ObserverCallback: (metric: PerformanceMetric) => void
```

## initPerformanceMonitor

**Function**

初始化性能监控

### 签名

```typescript
initPerformanceMonitor: void
```

### 参数

| 参数 | 类型             | 描述 | 可选 | 默认值 |
| ---- | ---------------- | ---- | ---- | ------ |
| opts | `MonitorOptions` |      | 是   | -      |

### 返回值

**类型:** `void`

## initPageMetrics

**Function**

初始化页面指标记录

### 签名

```typescript
initPageMetrics: void
```

### 返回值

**类型:** `void`

## initLongTaskObserver

**Function**

初始化长任务观察器

### 签名

```typescript
initLongTaskObserver: void
```

### 返回值

**类型:** `void`

## initDefaultAlertRules

**Function**

初始化默认告警规则

### 签名

```typescript
initDefaultAlertRules: void
```

### 返回值

**类型:** `void`

## recordMetric

**Function**

记录性能指标

### 签名

```typescript
recordMetric: PerformanceMetric;
```

### 参数

| 参数   | 类型                                           | 描述 | 可选 | 默认值 |
| ------ | ---------------------------------------------- | ---- | ---- | ------ |
| metric | `Omit<PerformanceMetric, 'id' \| 'timestamp'>` |      | 否   | -      |

### 返回值

**类型:** `PerformanceMetric`

## getMetrics

**Function**

获取所有性能指标

### 签名

```typescript
getMetrics: PerformanceMetric[]
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| limit | `number` |      | 是   | -      |

### 返回值

**类型:** `PerformanceMetric[]`

## getStats

**Function**

获取性能统计

### 签名

```typescript
getStats: PerformanceStats;
```

### 参数

| 参数 | 类型         | 描述 | 可选 | 默认值 |
| ---- | ------------ | ---- | ---- | ------ |
| type | `MetricType` |      | 是   | -      |

### 返回值

**类型:** `PerformanceStats`

## percentile

**Function**

计算百分位数

### 签名

```typescript
percentile: number;
```

### 参数

| 参数        | 类型       | 描述 | 可选 | 默认值 |
| ----------- | ---------- | ---- | ---- | ------ |
| sortedArray | `number[]` |      | 否   | -      |
| p           | `number`   |      | 否   | -      |

### 返回值

**类型:** `number`

## registerAlertRule

**Function**

注册告警规则

### 签名

```typescript
registerAlertRule: void
```

### 参数

| 参数 | 类型        | 描述 | 可选 | 默认值 |
| ---- | ----------- | ---- | ---- | ------ |
| rule | `AlertRule` |      | 否   | -      |

### 返回值

**类型:** `void`

## unregisterAlertRule

**Function**

注销告警规则

### 签名

```typescript
unregisterAlertRule: void
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| ruleId | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## setAlertRuleEnabled

**Function**

启用/禁用告警规则

### 签名

```typescript
setAlertRuleEnabled: void
```

### 参数

| 参数    | 类型      | 描述 | 可选 | 默认值 |
| ------- | --------- | ---- | ---- | ------ |
| ruleId  | `string`  |      | 否   | -      |
| enabled | `boolean` |      | 否   | -      |

### 返回值

**类型:** `void`

## getAlertRules

**Function**

获取所有告警规则

### 签名

```typescript
getAlertRules: AlertRule[]
```

### 返回值

**类型:** `AlertRule[]`

## getAlerts

**Function**

获取当前告警

### 签名

```typescript
getAlerts: Alert[]
```

### 参数

| 参数                | 类型      | 描述 | 可选 | 默认值 |
| ------------------- | --------- | ---- | ---- | ------ |
| includeAcknowledged | `boolean` |      | 是   | `true` |

### 返回值

**类型:** `Alert[]`

## acknowledgeAlert

**Function**

确认告警

### 签名

```typescript
acknowledgeAlert: void
```

### 参数

| 参数    | 类型     | 描述 | 可选 | 默认值 |
| ------- | -------- | ---- | ---- | ------ |
| alertId | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## acknowledgeAllAlerts

**Function**

确认所有告警

### 签名

```typescript
acknowledgeAllAlerts: void
```

### 返回值

**类型:** `void`

## clearAlerts

**Function**

清除告警记录

### 签名

```typescript
clearAlerts: void
```

### 返回值

**类型:** `void`

## checkAlertRules

**Function**

检查告警规则

### 签名

```typescript
checkAlertRules: void
```

### 参数

| 参数   | 类型                | 描述 | 可选 | 默认值 |
| ------ | ------------------- | ---- | ---- | ------ |
| metric | `PerformanceMetric` |      | 否   | -      |

### 返回值

**类型:** `void`

## interpolateMessage

**Function**

插值消息模板

### 签名

```typescript
interpolateMessage: string;
```

### 参数

| 参数    | 类型                | 描述 | 可选 | 默认值 |
| ------- | ------------------- | ---- | ---- | ------ |
| message | `string`            |      | 否   | -      |
| metric  | `PerformanceMetric` |      | 否   | -      |

### 返回值

**类型:** `string`

## outputAlert

**Function**

输出告警

### 签名

```typescript
outputAlert: void
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| alert | `Alert` |      | 否   | -      |

### 返回值

**类型:** `void`

## addObserver

**Function**

添加观察者

### 签名

```typescript
addObserver: void
```

### 参数

| 参数     | 类型               | 描述 | 可选 | 默认值 |
| -------- | ------------------ | ---- | ---- | ------ |
| callback | `ObserverCallback` |      | 否   | -      |

### 返回值

**类型:** `void`

## removeObserver

**Function**

移除观察者

### 签名

```typescript
removeObserver: void
```

### 参数

| 参数     | 类型               | 描述 | 可选 | 默认值 |
| -------- | ------------------ | ---- | ---- | ------ |
| callback | `ObserverCallback` |      | 否   | -      |

### 返回值

**类型:** `void`

## clearMetrics

**Function**

清除所有性能记录

### 签名

```typescript
clearMetrics: void
```

### 返回值

**类型:** `void`

## resetPerformanceMonitor

**Function**

重置性能监控

### 签名

```typescript
resetPerformanceMonitor: void
```

### 返回值

**类型:** `void`

## getPerformanceReport

**Function**

获取性能报告

### 签名

```typescript
getPerformanceReport: {
  metrics: PerformanceMetric[];
  stats: Record<MetricType, PerformanceStats>;
  alerts: Alert[];
  summary: {
    totalMetrics: number;
    totalAlerts: number;
    unacknowledgedAlerts: number;
    averageDuration: number;
  };
}
```

### 返回值

**类型:** `{ metrics: PerformanceMetric[]; stats: Record<MetricType, PerformanceStats>; alerts: Alert[]; summary: { totalMetrics: number; totalAlerts: number; unacknowledgedAlerts: number; averageDuration: number; }; }`

## serializePerformanceReport

**Function**

序列化性能报告（用于显示）

### 签名

```typescript
serializePerformanceReport: string;
```

### 返回值

**类型:** `string`

## startTimer

**Function**

创建计时器

### 签名

```typescript
startTimer: () => void
```

### 参数

| 参数 | 类型         | 描述 | 可选 | 默认值     |
| ---- | ------------ | ---- | ---- | ---------- |
| name | `string`     |      | 否   | -          |
| type | `MetricType` |      | 是   | `'custom'` |

### 返回值

**类型:** `() => void`

## TimelineEvent

**Interface**

时序事件

### 成员

| 名称      | 类型                               | 描述 | 可选 |
| --------- | ---------------------------------- | ---- | ---- |
| id        | `string`                           |      | 否   |
| name      | `string`                           |      | 否   |
| category  | `'render' \| 'effect' \| 'custom'` |      | 否   |
| startTime | `number`                           |      | 否   |
| duration  | `number`                           |      | 否   |
| depth     | `number`                           |      | 否   |
| metadata  | `Record<string, unknown>`          |      | 是   |

## FlameGraphNode

**Interface**

火焰图节点

### 成员

| 名称     | 类型                               | 描述 | 可选 |
| -------- | ---------------------------------- | ---- | ---- |
| name     | `string`                           |      | 否   |
| value    | `number`                           |      | 否   |
| children | `FlameGraphNode[]`                 |      | 是   |
| category | `'render' \| 'effect' \| 'custom'` |      | 是   |

## timelineEventStack

**Variable**

时序事件栈

## currentDepth

**Variable**

当前深度

## beginTimelineEvent

**Function**

开始时序事件

### 签名

```typescript
beginTimelineEvent: string;
```

### 参数

| 参数     | 类型                        | 描述 | 可选 | 默认值     |
| -------- | --------------------------- | ---- | ---- | ---------- |
| name     | `string`                    |      | 否   | -          |
| category | `TimelineEvent['category']` |      | 是   | `'custom'` |
| metadata | `Record<string, unknown>`   |      | 是   | -          |

### 返回值

**类型:** `string`

## endTimelineEvent

**Function**

结束指定时序事件

### 签名

```typescript
endTimelineEvent: TimelineEvent | null;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| id   | `string` |      | 否   | -      |

### 返回值

**类型:** `TimelineEvent | null`

## getTimelineEvents

**Function**

获取所有时序事件

### 签名

```typescript
getTimelineEvents: TimelineEvent[]
```

### 返回值

**类型:** `TimelineEvent[]`

## getTimelineEventsInRange

**Function**

获取指定时间范围内的时序事件

### 签名

```typescript
getTimelineEventsInRange: TimelineEvent[]
```

### 参数

| 参数      | 类型     | 描述 | 可选 | 默认值 |
| --------- | -------- | ---- | ---- | ------ |
| startTime | `number` |      | 否   | -      |
| endTime   | `number` |      | 否   | -      |

### 返回值

**类型:** `TimelineEvent[]`

## getSlowOperations

**Function**

获取慢操作

### 签名

```typescript
getSlowOperations: TimelineEvent[]
```

### 参数

| 参数      | 类型     | 描述 | 可选 | 默认值 |
| --------- | -------- | ---- | ---- | ------ |
| limit     | `number` |      | 是   | `10`   |
| threshold | `number` |      | 是   | -      |

### 返回值

**类型:** `TimelineEvent[]`

## getFlameGraphData

**Function**

获取火焰图数据

### 签名

```typescript
getFlameGraphData: FlameGraphNode;
```

### 返回值

**类型:** `FlameGraphNode`

## findParentNode

**Function**

### 签名

```typescript
findParentNode: FlameGraphNode | null;
```

### 参数

| 参数  | 类型             | 描述 | 可选 | 默认值 |
| ----- | ---------------- | ---- | ---- | ------ |
| node  | `FlameGraphNode` |      | 否   | -      |
| depth | `number`         |      | 否   | -      |

### 返回值

**类型:** `FlameGraphNode | null`

## aggregateFlameGraphValues

**Function**

### 签名

```typescript
aggregateFlameGraphValues: number;
```

### 参数

| 参数 | 类型             | 描述 | 可选 | 默认值 |
| ---- | ---------------- | ---- | ---- | ------ |
| node | `FlameGraphNode` |      | 否   | -      |

### 返回值

**类型:** `number`

## clearTimelineEvents

**Function**

清除时序事件

### 签名

```typescript
clearTimelineEvents: void
```

### 返回值

**类型:** `void`

## exportTimelineAsJSON

**Function**

导出时序事件为 JSON

### 签名

```typescript
exportTimelineAsJSON: string;
```

### 返回值

**类型:** `string`

## serializeTimelineEvents

**Function**

序列化为可读文本

### 签名

```typescript
serializeTimelineEvents: string;
```

### 返回值

**类型:** `string`

## RouterMatched

**Interface**

### 成员

| 名称 | 类型             | 描述 | 可选 |
| ---- | ---------------- | ---- | ---- |
| path | `string`         |      | 是   |
| name | `string \| null` |      | 是   |

## RouterLocation

**Interface**

### 成员

| 名称    | 类型                     | 描述 | 可选 |
| ------- | ------------------------ | ---- | ---- |
| path    | `string`                 |      | 是   |
| name    | `string \| null`         |      | 是   |
| params  | `Record<string, string>` |      | 是   |
| query   | `Record<string, string>` |      | 是   |
| matched | `RouterMatched[]`        |      | 是   |

## RouterInstance

**Interface**

### 成员

| 名称         | 类型                                         | 描述 | 可选 |
| ------------ | -------------------------------------------- | ---- | ---- |
| currentRoute | `() => RouterLocation`                       |      | 是   |
| afterEach    | `(cb: (to: RouterLocation) => void) => void` |      | 是   |
| getRoutes    | `() => RouterMatched[]`                      |      | 是   |
| push         | `(path: string) => Promise<void>`            |      | 是   |
| back         | `() => void`                                 |      | 是   |

## registerRouter

**Function**

注册路由器

### 签名

```typescript
registerRouter: void
```

### 参数

| 参数   | 类型             | 描述 | 可选 | 默认值 |
| ------ | ---------------- | ---- | ---- | ------ |
| router | `RouterInstance` |      | 否   | -      |

### 返回值

**类型:** `void`

## unregisterRouter

**Function**

注销路由器

### 签名

```typescript
unregisterRouter: void
```

### 返回值

**类型:** `void`

## getCurrentRoute

**Function**

获取当前路由信息

### 签名

```typescript
getCurrentRoute: RouteInfo | null;
```

### 返回值

**类型:** `RouteInfo | null`

## getRouteHistory

**Function**

获取路由历史

### 签名

```typescript
getRouteHistory: RouteInfo[]
```

### 返回值

**类型:** `RouteInfo[]`

路由变更历史数组

## watchRouteChanges

**Function**

监听路由变化

### 签名

```typescript
watchRouteChanges: boolean;
```

### 返回值

**类型:** `boolean`

是否成功开始监听

## unwatchRouteChanges

**Function**

停止监听路由变化

### 签名

```typescript
unwatchRouteChanges: void
```

### 返回值

**类型:** `void`

## navigateTo

**Function**

导航到指定路径

### 签名

```typescript
navigateTo: Promise<void>;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| path | `string` |      | 否   | -      |

### 返回值

**类型:** `Promise<void>`

## navigateToName

**Function**

导航到指定路由名称

### 签名

```typescript
navigateToName: Promise<void>;
```

### 参数

| 参数   | 类型                     | 描述 | 可选 | 默认值 |
| ------ | ------------------------ | ---- | ---- | ------ |
| name   | `string`                 |      | 否   | -      |
| params | `Record<string, string>` |      | 是   | -      |

### 返回值

**类型:** `Promise<void>`

## goBack

**Function**

返回上一页

### 签名

```typescript
goBack: Promise<void>;
```

### 返回值

**类型:** `Promise<void>`

## serializeRouteInfo

**Function**

序列化路由信息为字符串

### 签名

```typescript
serializeRouteInfo: string;
```

### 参数

| 参数  | 类型                | 描述 | 可选 | 默认值 |
| ----- | ------------------- | ---- | ---- | ------ |
| route | `RouteInfo \| null` |      | 否   | -      |

### 返回值

**类型:** `string`

## getRoutes

**Function**

获取所有路由配置

### 签名

```typescript
getRoutes: Array<{ path: string; name?: string | null }>;
```

### 返回值

**类型:** `Array<{ path: string; name?: string | null }>`

## isRouterRegistered

**Function**

检查路由器是否已注册

### 签名

```typescript
isRouterRegistered: boolean;
```

### 返回值

**类型:** `boolean`

## clearRouteHistory

**Function**

清空路由变更历史（用于测试）

### 签名

```typescript
clearRouteHistory: void
```

### 返回值

**类型:** `void`

## SignalNode

**Interface**

### 成员

| 名称              | 类型                                 | 描述 | 可选 |
| ----------------- | ------------------------------------ | ---- | ---- |
| id                | `string`                             |      | 否   |
| name              | `string`                             |      | 否   |
| type              | `'signal' \| 'computed' \| 'effect'` |      | 否   |
| value             | `unknown`                            |      | 是   |
| previousValue     | `unknown`                            |      | 是   |
| dependencies      | `string[]`                           |      | 否   |
| dependents        | `string[]`                           |      | 否   |
| updateCount       | `number`                             |      | 否   |
| lastUpdateTime    | `number`                             |      | 否   |
| averageUpdateTime | `number`                             |      | 否   |

## Snapshot

**Interface**

快照记录

### 成员

| 名称      | 类型                             | 描述 | 可选 |
| --------- | -------------------------------- | ---- | ---- |
| id        | `string`                         |      | 否   |
| timestamp | `number`                         |      | 否   |
| label     | `string`                         |      | 是   |
| signals   | `Record<string, SignalSnapshot>` |      | 否   |

## SignalSnapshot

**Interface**

单个信号的快照

### 成员

| 名称         | 类型       | 描述 | 可选 |
| ------------ | ---------- | ---- | ---- |
| value        | `unknown`  |      | 否   |
| dependencies | `string[]` |      | 否   |

## TimeTravelState

**Interface**

时间旅行状态

### 成员

| 名称         | 类型         | 描述 | 可选 |
| ------------ | ------------ | ---- | ---- |
| snapshots    | `Snapshot[]` |      | 否   |
| currentIndex | `number`     |      | 否   |
| canUndo      | `boolean`    |      | 否   |
| canRedo      | `boolean`    |      | 否   |

## PerformanceRecord

**Interface**

性能记录

### 成员

| 名称      | 类型                                 | 描述 | 可选 |
| --------- | ------------------------------------ | ---- | ---- |
| id        | `string`                             |      | 否   |
| name      | `string`                             |      | 否   |
| type      | `'signal' \| 'computed' \| 'effect'` |      | 否   |
| duration  | `number`                             |      | 否   |
| timestamp | `number`                             |      | 否   |
| metadata  | `Record<string, unknown>`            |      | 是   |

## DependencyGraphNode

**Interface**

依赖图节点

### 成员

| 名称 | 类型                                 | 描述 | 可选 |
| ---- | ------------------------------------ | ---- | ---- |
| id   | `string`                             |      | 否   |
| name | `string`                             |      | 否   |
| type | `'signal' \| 'computed' \| 'effect'` |      | 否   |
| x    | `number`                             |      | 是   |
| y    | `number`                             |      | 是   |

## DependencyGraphEdge

**Interface**

依赖图边

### 成员

| 名称   | 类型                          | 描述 | 可选 |
| ------ | ----------------------------- | ---- | ---- |
| source | `string`                      |      | 否   |
| target | `string`                      |      | 否   |
| type   | `'dependency' \| 'dependent'` |      | 否   |

## DependencyGraph

**Interface**

依赖图

### 成员

| 名称  | 类型                    | 描述 | 可选 |
| ----- | ----------------------- | ---- | ---- |
| nodes | `DependencyGraphNode[]` |      | 否   |
| edges | `DependencyGraphEdge[]` |      | 否   |

## VisualLayoutNode

**Interface**

可视化布局节点

### 成员

| 名称      | 类型                                 | 描述 | 可选 |
| --------- | ------------------------------------ | ---- | ---- |
| id        | `string`                             |      | 否   |
| name      | `string`                             |      | 否   |
| type      | `'signal' \| 'computed' \| 'effect'` |      | 否   |
| x         | `number`                             |      | 否   |
| y         | `number`                             |      | 否   |
| level     | `number`                             |      | 否   |
| width     | `number`                             |      | 否   |
| height    | `number`                             |      | 否   |
| inDegree  | `number`                             |      | 否   |
| outDegree | `number`                             |      | 否   |

## VisualLayoutEdge

**Interface**

可视化布局边

### 成员

| 名称    | 类型           | 描述 | 可选 |
| ------- | -------------- | ---- | ---- |
| source  | `string`       |      | 否   |
| target  | `string`       |      | 否   |
| sourceX | `number`       |      | 否   |
| sourceY | `number`       |      | 否   |
| targetX | `number`       |      | 否   |
| targetY | `number`       |      | 否   |
| type    | `'dependency'` |      | 否   |

## VisualLayoutGraph

**Interface**

可视化布局图

### 成员

| 名称   | 类型                 | 描述 | 可选 |
| ------ | -------------------- | ---- | ---- |
| nodes  | `VisualLayoutNode[]` |      | 否   |
| edges  | `VisualLayoutEdge[]` |      | 否   |
| width  | `number`             |      | 否   |
| height | `number`             |      | 否   |

## LayoutOptions

**Interface**

布局选项

### 成员

| 名称              | 类型     | 描述 | 可选 |
| ----------------- | -------- | ---- | ---- |
| nodeWidth         | `number` |      | 否   |
| nodeHeight        | `number` |      | 否   |
| horizontalSpacing | `number` |      | 否   |
| verticalSpacing   | `number` |      | 否   |
| centerX           | `number` |      | 否   |
| centerY           | `number` |      | 否   |

## DEFAULT_LAYOUT_OPTIONS

**Variable**

默认布局选项

## registerSignal

**Function**

注册一个信号

### 签名

```typescript
registerSignal: void
```

### 参数

| 参数         | 类型                                 | 描述 | 可选 | 默认值 |
| ------------ | ------------------------------------ | ---- | ---- | ------ |
| id           | `string`                             |      | 否   | -      |
| name         | `string`                             |      | 否   | -      |
| type         | `'signal' \| 'computed' \| 'effect'` |      | 否   | -      |
| initialValue | `unknown`                            |      | 是   | -      |

### 返回值

**类型:** `void`

## unregisterSignal

**Function**

注销一个信号

### 签名

```typescript
unregisterSignal: void
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| id   | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## recordSignalUpdate

**Function**

记录信号更新

### 签名

```typescript
recordSignalUpdate: void
```

### 参数

| 参数     | 类型      | 描述 | 可选 | 默认值 |
| -------- | --------- | ---- | ---- | ------ |
| id       | `string`  |      | 否   | -      |
| newValue | `unknown` |      | 否   | -      |
| duration | `number`  |      | 是   | -      |

### 返回值

**类型:** `void`

## recordDependency

**Function**

记录依赖关系

### 签名

```typescript
recordDependency: void
```

### 参数

| 参数     | 类型     | 描述 | 可选 | 默认值 |
| -------- | -------- | ---- | ---- | ------ |
| sourceId | `string` |      | 否   | -      |
| targetId | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## getSignalNodes

**Function**

获取所有信号节点

### 签名

```typescript
getSignalNodes: SignalNode[]
```

### 返回值

**类型:** `SignalNode[]`

## getSignalNode

**Function**

获取单个信号节点

### 签名

```typescript
getSignalNode: SignalNode | undefined;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| id   | `string` |      | 否   | -      |

### 返回值

**类型:** `SignalNode | undefined`

## getDependencyGraph

**Function**

获取依赖图

### 签名

```typescript
getDependencyGraph: DependencyGraph;
```

### 返回值

**类型:** `DependencyGraph`

## createSnapshot

**Function**

创建快照

### 签名

```typescript
createSnapshot: Snapshot;
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| label | `string` |      | 是   | -      |

### 返回值

**类型:** `Snapshot`

## getSnapshots

**Function**

获取所有快照

### 签名

```typescript
getSnapshots: Snapshot[]
```

### 返回值

**类型:** `Snapshot[]`

## getSnapshot

**Function**

获取快照

### 签名

```typescript
getSnapshot: Snapshot | undefined;
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| index | `number` |      | 否   | -      |

### 返回值

**类型:** `Snapshot | undefined`

## getTimeTravelState

**Function**

获取时间旅行状态

### 签名

```typescript
getTimeTravelState: TimeTravelState;
```

### 返回值

**类型:** `TimeTravelState`

## restoreSnapshot

**Function**

恢复到指定快照

### 签名

```typescript
restoreSnapshot: Snapshot | undefined;
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| index | `number` |      | 否   | -      |

### 返回值

**类型:** `Snapshot | undefined`

## clearSnapshots

**Function**

清除所有快照

### 签名

```typescript
clearSnapshots: void
```

### 返回值

**类型:** `void`

## recordPerformance

**Function**

记录性能数据

### 签名

```typescript
recordPerformance: void
```

### 参数

| 参数   | 类型                | 描述 | 可选 | 默认值 |
| ------ | ------------------- | ---- | ---- | ------ |
| record | `PerformanceRecord` |      | 否   | -      |

### 返回值

**类型:** `void`

## getPerformanceRecords

**Function**

获取性能记录

### 签名

```typescript
getPerformanceRecords: PerformanceRecord[]
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| limit | `number` |      | 是   | -      |

### 返回值

**类型:** `PerformanceRecord[]`

## getPerformanceStats

**Function**

获取性能统计

### 签名

```typescript
getPerformanceStats: {
  totalRecords: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  byType: Record<string, { count: number; average: number; max: number }>;
}
```

### 返回值

**类型:** `{ totalRecords: number; averageDuration: number; maxDuration: number; minDuration: number; byType: Record<string, { count: number; average: number; max: number }>; }`

## clearPerformanceRecords

**Function**

清除性能记录

### 签名

```typescript
clearPerformanceRecords: void
```

### 返回值

**类型:** `void`

## clearSignalRegistry

**Function**

清除所有注册信号

### 签名

```typescript
clearSignalRegistry: void
```

### 返回值

**类型:** `void`

## serializeSignalNode

**Function**

序列化信号节点用于显示

### 签名

```typescript
serializeSignalNode: string;
```

### 参数

| 参数 | 类型         | 描述 | 可选 | 默认值 |
| ---- | ------------ | ---- | ---- | ------ |
| node | `SignalNode` |      | 否   | -      |

### 返回值

**类型:** `string`

## serializeDependencyGraph

**Function**

序列化依赖图用于显示

### 签名

```typescript
serializeDependencyGraph: string;
```

### 返回值

**类型:** `string`

## serializePerformanceStats

**Function**

序列化性能统计

### 签名

```typescript
serializePerformanceStats: string;
```

### 返回值

**类型:** `string`

## calculateNodeLevels

**Function**

计算节点的层级（用于分层布局）

### 签名

```typescript
calculateNodeLevels: Map<string, number>;
```

### 返回值

**类型:** `Map<string, number>`

## calculateNodeDegrees

**Function**

计算每个节点的入度和出度

### 签名

```typescript
calculateNodeDegrees: Map<string, { inDegree: number; outDegree: number }>;
```

### 返回值

**类型:** `Map<string, { inDegree: number; outDegree: number }>`

## getVisualLayoutGraph

**Function**

获取可视化布局图

### 签名

```typescript
getVisualLayoutGraph: VisualLayoutGraph;
```

### 参数

| 参数    | 类型                     | 描述 | 可选 | 默认值 |
| ------- | ------------------------ | ---- | ---- | ------ |
| options | `Partial<LayoutOptions>` |      | 是   | -      |

### 返回值

**类型:** `VisualLayoutGraph`

## getSubgraph

**Function**

获取以指定节点为中心的子图

### 签名

```typescript
getSubgraph: VisualLayoutGraph;
```

### 参数

| 参数     | 类型     | 描述 | 可选 | 默认值 |
| -------- | -------- | ---- | ---- | ------ |
| centerId | `string` |      | 否   | -      |
| depth    | `number` |      | 是   | `2`    |

### 返回值

**类型:** `VisualLayoutGraph`

## searchSignals

**Function**

搜索信号节点

### 签名

```typescript
searchSignals: SignalNode[]
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| query | `string` |      | 否   | -      |

### 返回值

**类型:** `SignalNode[]`

## filterSignals

**Function**

过滤信号节点

### 签名

```typescript
filterSignals: SignalNode[]
```

### 参数

| 参数    | 类型                                                                                                                                  | 描述 | 可选 | 默认值 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ------ |
| options | `{ types?: Array<'signal' \| 'computed' \| 'effect'>; minUpdateCount?: number; hasDependencies?: boolean; hasDependents?: boolean; }` |      | 否   | -      |

### 返回值

**类型:** `SignalNode[]`

## SnapshotDiff

**Interface**

快照差异

### 成员

| 名称    | 类型                                                           | 描述 | 可选 |
| ------- | -------------------------------------------------------------- | ---- | ---- |
| added   | `Array<{ id: string; value: unknown }>`                        |      | 否   |
| removed | `Array<{ id: string; value: unknown }>`                        |      | 否   |
| changed | `Array<{ id: string; oldValue: unknown; newValue: unknown; }>` |      | 否   |

## compareSnapshots

**Function**

比较两个快照的差异

### 签名

```typescript
compareSnapshots: SnapshotDiff;
```

### 参数

| 参数      | 类型       | 描述 | 可选 | 默认值 |
| --------- | ---------- | ---- | ---- | ------ |
| snapshot1 | `Snapshot` |      | 否   | -      |
| snapshot2 | `Snapshot` |      | 否   | -      |

### 返回值

**类型:** `SnapshotDiff`

## serializeSnapshotDiff

**Function**

序列化快照差异

### 签名

```typescript
serializeSnapshotDiff: string;
```

### 参数

| 参数 | 类型           | 描述 | 可选 | 默认值 |
| ---- | -------------- | ---- | ---- | ------ |
| diff | `SnapshotDiff` |      | 否   | -      |

### 返回值

**类型:** `string`

## getDiffBetweenSnapshots

**Function**

获取相邻快照的差异

### 签名

```typescript
getDiffBetweenSnapshots: SnapshotDiff | null;
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| index1 | `number` |      | 否   | -      |
| index2 | `number` |      | 否   | -      |

### 返回值

**类型:** `SnapshotDiff | null`

## TimeTravelNavigator

**Interface**

时间旅行导航

### 成员

| 名称             | 类型                   | 描述 | 可选 |
| ---------------- | ---------------------- | ---- | ---- |
| currentIndex     | `number`               |      | 否   |
| total            | `number`               |      | 否   |
| canGoBack        | `boolean`              |      | 否   |
| canGoForward     | `boolean`              |      | 否   |
| currentSnapshot  | `Snapshot \| null`     |      | 否   |
| previousSnapshot | `Snapshot \| null`     |      | 否   |
| nextSnapshot     | `Snapshot \| null`     |      | 否   |
| diff             | `SnapshotDiff \| null` |      | 否   |

## getTimeTravelNavigator

**Function**

获取时间旅行导航状态

### 签名

```typescript
getTimeTravelNavigator: TimeTravelNavigator;
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| index | `number` |      | 是   | -      |

### 返回值

**类型:** `TimeTravelNavigator`

## timeTravelBack

**Function**

恢复到上一个快照

### 签名

```typescript
timeTravelBack: Snapshot | null;
```

### 返回值

**类型:** `Snapshot | null`

## timeTravelForward

**Function**

前进到下一个快照

### 签名

```typescript
timeTravelForward: Snapshot | null;
```

### 返回值

**类型:** `Snapshot | null`

## StoreInstance

**Interface**

### 成员

| 名称       | 类型                                                                              | 描述 | 可选 |
| ---------- | --------------------------------------------------------------------------------- | ---- | ---- |
| $state     | `Record<string, unknown>`                                                         |      | 是   |
| $id        | `string`                                                                          |      | 是   |
| $subscribe | `(cb: (mutation: unknown, state: Record<string, unknown>) => void) => () => void` |      | 是   |

## StoreChangeCallback

**Type**

Store 变更回调类型

### 签名

```typescript
StoreChangeCallback: (storeId: string, state: Record<string, unknown>) => void
```

## registerStore

**Function**

注册 Store

### 签名

```typescript
registerStore: void
```

### 参数

| 参数  | 类型            | 描述 | 可选 | 默认值 |
| ----- | --------------- | ---- | ---- | ------ |
| id    | `string`        |      | 否   | -      |
| store | `StoreInstance` |      | 否   | -      |

### 返回值

**类型:** `void`

## unregisterStore

**Function**

注销 Store

### 签名

```typescript
unregisterStore: void
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| id   | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## getStoreStates

**Function**

获取所有 Store 状态

### 签名

```typescript
getStoreStates: StoreStateInfo[]
```

### 返回值

**类型:** `StoreStateInfo[]`

## getStoreState

**Function**

获取特定 Store 的状态

### 签名

```typescript
getStoreState: StoreStateInfo | null;
```

### 参数

| 参数    | 类型     | 描述 | 可选 | 默认值 |
| ------- | -------- | ---- | ---- | ------ |
| storeId | `string` |      | 否   | -      |

### 返回值

**类型:** `StoreStateInfo | null`

## setStoreState

**Function**

修改 Store 状态（用于开发时调试）

### 签名

```typescript
setStoreState: boolean;
```

### 参数

| 参数    | 类型      | 描述 | 可选 | 默认值 |
| ------- | --------- | ---- | ---- | ------ |
| storeId | `string`  |      | 否   | -      |
| path    | `string`  |      | 否   | -      |
| value   | `unknown` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## dispatchStoreAction

**Function**

触发 Store Action

### 签名

```typescript
dispatchStoreAction: unknown;
```

### 参数

| 参数       | 类型        | 描述 | 可选 | 默认值 |
| ---------- | ----------- | ---- | ---- | ------ |
| storeId    | `string`    |      | 否   | -      |
| actionName | `string`    |      | 否   | -      |
| args       | `unknown[]` |      | 否   | -      |

### 返回值

**类型:** `unknown`

## serializeStoreStates

**Function**

序列化 Store 状态为字符串

### 签名

```typescript
serializeStoreStates: string;
```

### 参数

| 参数   | 类型               | 描述 | 可选 | 默认值 |
| ------ | ------------------ | ---- | ---- | ------ |
| states | `StoreStateInfo[]` |      | 否   | -      |

### 返回值

**类型:** `string`

## deepClone

**Function**

深度克隆（简化版）

### 签名

```typescript
deepClone: T;
```

### 参数

| 参数 | 类型 | 描述 | 可选 | 默认值 |
| ---- | ---- | ---- | ---- | ------ |
| obj  | `T`  |      | 否   | -      |

### 返回值

**类型:** `T`

## subscribeStore

**Function**

订阅 Store 变更

### 签名

```typescript
subscribeStore: boolean;
```

### 参数

| 参数    | 类型     | 描述 | 可选 | 默认值 |
| ------- | -------- | ---- | ---- | ------ |
| storeId | `string` |      | 否   | -      |

### 返回值

**类型:** `boolean`

是否订阅成功

## unsubscribeStore

**Function**

取消订阅 Store 变更

### 签名

```typescript
unsubscribeStore: void
```

### 参数

| 参数    | 类型     | 描述 | 可选 | 默认值 |
| ------- | -------- | ---- | ---- | ------ |
| storeId | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## onStoreChange

**Function**

注册全局 Store 变更回调

### 签名

```typescript
onStoreChange: () => void
```

### 参数

| 参数     | 类型                  | 描述 | 可选 | 默认值 |
| -------- | --------------------- | ---- | ---- | ------ |
| callback | `StoreChangeCallback` |      | 否   | -      |

### 返回值

**类型:** `() => void`

取消注册的函数

## clearStoreRegistry

**Function**

清空所有注册的 Store（用于测试）

### 签名

```typescript
clearStoreRegistry: void
```

### 返回值

**类型:** `void`

## getRegisteredStoreIds

**Function**

获取已注册的 Store ID 列表

### 签名

```typescript
getRegisteredStoreIds: string[]
```

### 返回值

**类型:** `string[]`

## DevToolsOptions

**Interface**

DevTools 配置选项

### 成员

| 名称     | 类型                            | 描述          | 可选 |
| -------- | ------------------------------- | ------------- | ---- |
| enabled  | `boolean`                       | 是否启用      | 是   |
| position | `'right' \| 'bottom' \| 'left'` | 面板位置      | 是   |
| size     | `number`                        | 面板宽度/高度 | 是   |

## ComponentTreeNode

**Interface**

组件树节点

### 成员

| 名称     | 类型                      | 描述 | 可选 |
| -------- | ------------------------- | ---- | ---- |
| id       | `string`                  |      | 否   |
| name     | `string`                  |      | 否   |
| props    | `Record<string, unknown>` |      | 是   |
| children | `ComponentTreeNode[]`     |      | 是   |
| parent   | `string`                  |      | 是   |

## StoreStateInfo

**Interface**

Store 状态信息

### 成员

| 名称    | 类型                      | 描述 | 可选 |
| ------- | ------------------------- | ---- | ---- |
| id      | `string`                  |      | 否   |
| state   | `Record<string, unknown>` |      | 否   |
| getters | `Record<string, unknown>` |      | 是   |

## RouteInfo

**Interface**

路由信息

### 成员

| 名称    | 类型                                              | 描述 | 可选 |
| ------- | ------------------------------------------------- | ---- | ---- |
| path    | `string`                                          |      | 否   |
| name    | `string \| null`                                  |      | 是   |
| params  | `Record<string, string>`                          |      | 是   |
| query   | `Record<string, string>`                          |      | 是   |
| matched | `Array<{ path: string; name?: string \| null; }>` |      | 否   |

## SignalNode

**Interface**

信号节点信息

### 成员

| 名称              | 类型                                 | 描述 | 可选 |
| ----------------- | ------------------------------------ | ---- | ---- |
| id                | `string`                             |      | 否   |
| name              | `string`                             |      | 否   |
| type              | `'signal' \| 'computed' \| 'effect'` |      | 否   |
| value             | `unknown`                            |      | 是   |
| previousValue     | `unknown`                            |      | 是   |
| dependencies      | `string[]`                           |      | 否   |
| dependents        | `string[]`                           |      | 否   |
| updateCount       | `number`                             |      | 否   |
| lastUpdateTime    | `number`                             |      | 否   |
| averageUpdateTime | `number`                             |      | 否   |

## Snapshot

**Interface**

快照记录

### 成员

| 名称      | 类型                             | 描述 | 可选 |
| --------- | -------------------------------- | ---- | ---- |
| id        | `string`                         |      | 否   |
| timestamp | `number`                         |      | 否   |
| label     | `string`                         |      | 是   |
| signals   | `Record<string, SignalSnapshot>` |      | 否   |

## SignalSnapshot

**Interface**

单个信号的快照

### 成员

| 名称         | 类型       | 描述 | 可选 |
| ------------ | ---------- | ---- | ---- |
| value        | `unknown`  |      | 否   |
| dependencies | `string[]` |      | 否   |

## TimeTravelState

**Interface**

时间旅行状态

### 成员

| 名称         | 类型         | 描述 | 可选 |
| ------------ | ------------ | ---- | ---- |
| snapshots    | `Snapshot[]` |      | 否   |
| currentIndex | `number`     |      | 否   |
| canUndo      | `boolean`    |      | 否   |
| canRedo      | `boolean`    |      | 否   |

## PerformanceRecord

**Interface**

性能记录

### 成员

| 名称      | 类型                                 | 描述 | 可选 |
| --------- | ------------------------------------ | ---- | ---- |
| id        | `string`                             |      | 否   |
| name      | `string`                             |      | 否   |
| type      | `'signal' \| 'computed' \| 'effect'` |      | 否   |
| duration  | `number`                             |      | 否   |
| timestamp | `number`                             |      | 否   |
| metadata  | `Record<string, unknown>`            |      | 是   |

## DependencyGraphNode

**Interface**

依赖图节点

### 成员

| 名称 | 类型                                 | 描述 | 可选 |
| ---- | ------------------------------------ | ---- | ---- |
| id   | `string`                             |      | 否   |
| name | `string`                             |      | 否   |
| type | `'signal' \| 'computed' \| 'effect'` |      | 否   |
| x    | `number`                             |      | 是   |
| y    | `number`                             |      | 是   |

## DependencyGraphEdge

**Interface**

依赖图边

### 成员

| 名称   | 类型                          | 描述 | 可选 |
| ------ | ----------------------------- | ---- | ---- |
| source | `string`                      |      | 否   |
| target | `string`                      |      | 否   |
| type   | `'dependency' \| 'dependent'` |      | 否   |

## DependencyGraph

**Interface**

依赖图

### 成员

| 名称  | 类型                    | 描述 | 可选 |
| ----- | ----------------------- | ---- | ---- |
| nodes | `DependencyGraphNode[]` |      | 否   |
| edges | `DependencyGraphEdge[]` |      | 否   |

## PerformanceStats

**Interface**

性能统计

### 成员

| 名称            | 类型                                                              | 描述 | 可选 |
| --------------- | ----------------------------------------------------------------- | ---- | ---- |
| totalRecords    | `number`                                                          |      | 否   |
| averageDuration | `number`                                                          |      | 否   |
| maxDuration     | `number`                                                          |      | 否   |
| minDuration     | `number`                                                          |      | 否   |
| byType          | `Record<string, { count: number; average: number; max: number }>` |      | 否   |

## DevToolsAPI

**Interface**

DevTools API

### 成员

| 名称             | 类型 | 描述            | 可选 |
| ---------------- | ---- | --------------- | ---- |
| getComponentTree | -    | 获取组件树      | 否   |
| getStoreStates   | -    | 获取 Store 状态 | 否   |
| getCurrentRoute  | -    | 获取当前路由    | 否   |
| refresh          | -    | 刷新            | 否   |

## VDOMNodeInfo

**Interface**

### 成员

| 名称        | 类型                      | 描述 | 可选 |
| ----------- | ------------------------- | ---- | ---- |
| id          | `string`                  |      | 否   |
| type        | `string`                  |      | 否   |
| tagName     | `string`                  |      | 是   |
| text        | `string`                  |      | 是   |
| props       | `Record<string, unknown>` |      | 是   |
| children    | `VDOMNodeInfo[]`          |      | 否   |
| parentId    | `string`                  |      | 是   |
| depth       | `number`                  |      | 否   |
| componentId | `string`                  |      | 是   |
| isComponent | `boolean`                 |      | 否   |
| key         | `string \| number`        |      | 是   |
| ref         | `string`                  |      | 是   |
| domElement  | `HTMLElement \| null`     |      | 是   |

## VDOMRegistry

**Interface**

### 成员

| 名称      | 类型                        | 描述 | 可选 |
| --------- | --------------------------- | ---- | ---- |
| roots     | `Map<string, VDOMNodeInfo>` |      | 否   |
| nodes     | `Map<string, VDOMNodeInfo>` |      | 否   |
| idCounter | `number`                    |      | 否   |

## generateId

**Function**

### 签名

```typescript
generateId: string;
```

### 返回值

**类型:** `string`

## getVNodeType

**Function**

### 签名

```typescript
getVNodeType: { type: string; tagName?: string; isComponent: boolean }
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `{ type: string; tagName?: string; isComponent: boolean }`

## extractTextContent

**Function**

### 签名

```typescript
extractTextContent: string | undefined;
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `string | undefined`

## extractProps

**Function**

### 签名

```typescript
extractProps: Record<string, unknown> | undefined;
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `Record<string, unknown> | undefined`

## registerVDOMRoot

**Function**

### 签名

```typescript
registerVDOMRoot: string;
```

### 参数

| 参数        | 类型     | 描述 | 可选 | 默认值 |
| ----------- | -------- | ---- | ---- | ------ |
| vnode       | `VNode`  |      | 否   | -      |
| componentId | `string` |      | 是   | -      |

### 返回值

**类型:** `string`

## processVNode

**Function**

### 签名

```typescript
processVNode: VDOMNodeInfo | null;
```

### 参数

| 参数        | 类型                                             | 描述 | 可选 | 默认值 |
| ----------- | ------------------------------------------------ | ---- | ---- | ------ |
| vnode       | `VNode \| string \| number \| null \| undefined` |      | 否   | -      |
| parentId    | `string \| undefined`                            |      | 否   | -      |
| \_parentDom | `HTMLElement \| null`                            |      | 否   | -      |
| depth       | `number`                                         |      | 否   | -      |
| componentId | `string`                                         |      | 是   | -      |

### 返回值

**类型:** `VDOMNodeInfo | null`

## unregisterVDOMRoot

**Function**

### 签名

```typescript
unregisterVDOMRoot: void
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| id   | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## cleanupNode

**Function**

### 签名

```typescript
cleanupNode: void
```

### 参数

| 参数 | 类型           | 描述 | 可选 | 默认值 |
| ---- | -------------- | ---- | ---- | ------ |
| node | `VDOMNodeInfo` |      | 否   | -      |

### 返回值

**类型:** `void`

## getVDOMRoots

**Function**

### 签名

```typescript
getVDOMRoots: VDOMNodeInfo[]
```

### 返回值

**类型:** `VDOMNodeInfo[]`

## getVDOMNodeById

**Function**

### 签名

```typescript
getVDOMNodeById: VDOMNodeInfo | undefined;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| id   | `string` |      | 否   | -      |

### 返回值

**类型:** `VDOMNodeInfo | undefined`

## getVDOMTree

**Function**

### 签名

```typescript
getVDOMTree: VDOMNodeInfo[]
```

### 返回值

**类型:** `VDOMNodeInfo[]`

## findVDOMNodesByTag

**Function**

### 签名

```typescript
findVDOMNodesByTag: VDOMNodeInfo[]
```

### 参数

| 参数    | 类型     | 描述 | 可选 | 默认值 |
| ------- | -------- | ---- | ---- | ------ |
| tagName | `string` |      | 否   | -      |

### 返回值

**类型:** `VDOMNodeInfo[]`

## findVDOMNodesByProp

**Function**

### 签名

```typescript
findVDOMNodesByProp: VDOMNodeInfo[]
```

### 参数

| 参数     | 类型      | 描述 | 可选 | 默认值 |
| -------- | --------- | ---- | ---- | ------ |
| propName | `string`  |      | 否   | -      |
| value    | `unknown` |      | 是   | -      |

### 返回值

**类型:** `VDOMNodeInfo[]`

## getVDOMStats

**Function**

### 签名

```typescript
getVDOMStats: {
  totalNodes: number;
  rootCount: number;
  maxDepth: number;
  componentCount: number;
  elementCount: number;
  textCount: number;
}
```

### 返回值

**类型:** `{ totalNodes: number; rootCount: number; maxDepth: number; componentCount: number; elementCount: number; textCount: number; }`

## clearVDOMRegistry

**Function**

### 签名

```typescript
clearVDOMRegistry: void
```

### 返回值

**类型:** `void`

## serializeVDOMNode

**Function**

### 签名

```typescript
serializeVDOMNode: string;
```

### 参数

| 参数   | 类型           | 描述 | 可选 | 默认值 |
| ------ | -------------- | ---- | ---- | ------ |
| node   | `VDOMNodeInfo` |      | 否   | -      |
| indent | `any`          |      | 是   | `0`    |

### 返回值

**类型:** `string`

## serializeVDOMTree

**Function**

### 签名

```typescript
serializeVDOMTree: string;
```

### 返回值

**类型:** `string`

## getVDOMPath

**Function**

### 签名

```typescript
getVDOMPath: VDOMNodeInfo[]
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| nodeId | `string` |      | 否   | -      |

### 返回值

**类型:** `VDOMNodeInfo[]`

## highlightVDOMNode

**Function**

### 签名

```typescript
highlightVDOMNode: void
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| nodeId | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## inspectVDOMNode

**Function**

### 签名

```typescript
inspectVDOMNode: {
  node: VDOMNodeInfo;
  path: VDOMNodeInfo[];
  domElement?: HTMLElement | null;
} | null
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| nodeId | `string` |      | 否   | -      |

### 返回值

**类型:** `{ node: VDOMNodeInfo; path: VDOMNodeInfo[]; domElement?: HTMLElement | null; } | null`
