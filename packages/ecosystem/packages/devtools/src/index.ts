/**
 * @lytjs/devtools - 入口文件
 *
 * LytJS 开发者工具
 */

// 主入口
export {
  // DevTools 安装
  installDevTools,
  getDevTools,
  uninstallDevTools,

  // 组件树
  getComponentTree,
  serializeComponentTree,
  registerRootComponent,
  unregisterRootComponent,

  // Store 检查器
  getStoreStates,
  getStoreState,
  setStoreState,
  dispatchStoreAction,
  serializeStoreStates,
  registerStore,
  unregisterStore,
  getRegisteredStoreIds,
  clearStoreRegistry,
  subscribeStore,
  unsubscribeStore,
  onStoreChange,

  // 路由检查器
  getCurrentRoute,
  navigateTo,
  navigateToName,
  goBack,
  serializeRouteInfo,
  getRoutes,
  registerRouter,
  unregisterRouter,
  isRouterRegistered,
  watchRouteChanges,
  unwatchRouteChanges,
  getRouteHistory,
  clearRouteHistory,

  // 性能监控
  initPerformanceMonitor,
  recordMetric,
  getMetrics,
  getStats,
  registerAlertRule,
  unregisterAlertRule,
  setAlertRuleEnabled,
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
  serializePerformanceReport,
  startTimer,
} from './devtools';

// v6.8.0 调试增强
export {
  // 调试日志
  initDebugEnhancer,
  log,
  debug,
  info,
  warn,
  error,
  trace,
  getLogs,
  clearLogs,
  onLog,
  onClear,

  // 调试工具
  createDebugger,
  measurePerformance,
  measureAsyncPerformance,

  // 状态检查点
  createCheckpoint,
  getCheckpoints,
  compareCheckpoints,
  clearCheckpoints,

  // 全局工具
  installGlobalDebugTools,
  serializeDebugInfo,
} from './debugEnhancer';

// 信号检查器
export {
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
  clearPerformanceRecords,
  serializeSignalNode,
  serializeDependencyGraph,
  serializePerformanceStats,
  registerSignal,
  unregisterSignal,
  recordSignalUpdate,
  recordDependency,
  clearSignalRegistry,
  getVisualLayoutGraph,
  getSubgraph,
  searchSignals,
  filterSignals,
  compareSnapshots,
  serializeSnapshotDiff,
  getDiffBetweenSnapshots,
  getTimeTravelNavigator,
  timeTravelBack,
  timeTravelForward,
} from './signalsInspector';

// 时序事件
export {
  beginTimelineEvent,
  endTimelineEvent,
  getTimelineEvents,
  getTimelineEventsInRange,
  getSlowOperations,
  getFlameGraphData,
  clearTimelineEvents,
  exportTimelineAsJSON,
  serializeTimelineEvents,
} from './performance';

// 基准测试
export {
  runBenchmark,
  runAsyncBenchmark,
  getBenchmarkResults,
  getLatestBenchmarkResult,
  clearBenchmarkResults,
  serializeBenchmarkResult,
  serializeAllBenchmarkResults,
  compareBenchmarkResults,
  createLargeScaleBenchmark,
  getMemoryUsage,
  serializeMemoryUsage,
  createRegressionDetector,
  LARGE_SCALE_SCENARIOS,
} from './devtools';

// 类型导出
export type {
  DevToolsOptions,
  DevToolsAPI,
  ComponentTreeNode,
  StoreStateInfo,
  RouteInfo,
} from './types';

export type {
  SignalNode,
  Snapshot,
  PerformanceRecord,
  DependencyGraph,
  TimeTravelState,
  VisualLayoutNode,
  VisualLayoutEdge,
  VisualLayoutGraph,
  SnapshotDiff,
  TimeTravelNavigator,
} from './signalsInspector';

export type {
  MetricType,
  PerformanceMetric,
  AlertLevel,
  AlertRule,
  Alert,
  MonitorOptions,
  PerformanceStats,
  TimelineEvent,
  FlameGraphNode,
} from './performance';

// v6.8.0 调试增强类型
export type { LogLevel, LogEntry, DebugOptions } from './debugEnhancer';

export type {
  BenchmarkResult,
  BenchmarkConfig,
  LargeScaleScenario,
  MemoryUsage,
} from './benchmark';

export type { VDOMNodeInfo } from './vdomInspector';

// ★ 2026-10-17 修复：VDOM 检查器的**函数**此前一个都没转出（只转出了类型）——
//   而 `DevTools` 的 VDOM 标签页文案明确写着「Use registerVDOMRoot() to register your
//   VDOM roots.」⇒ 用户照着做会 `import` 失败（`package.json` 只暴露 `.`，无深路径入口，
//   且 `treeshake` 会把这些函数从产物里摇掉）。`registerSignal` / `registerStore` 都转出了，
//   唯独 VDOM 这一套漏了 —— 补齐后三个检查器的入口面才一致。
export {
  registerVDOMRoot,
  unregisterVDOMRoot,
  getVDOMRoots,
  getVDOMNodeById,
  getVDOMTree,
  findVDOMNodesByTag,
  findVDOMNodesByProp,
  getVDOMStats,
  clearVDOMRegistry,
  serializeVDOMNode,
  serializeVDOMTree,
  getVDOMPath,
  highlightVDOMNode,
  inspectVDOMNode,
} from './vdomInspector';

// ★ 2026-10-17：`signalsInspector` 里这两个也漏转了（其余 29 个都在）。
export { getSnapshot, recordPerformance } from './signalsInspector';

// 默认导出
export { installDevTools as default } from './devtools';
