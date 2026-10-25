/**
 * @lytjs/devtools - 性能监控系统
 *
 * 提供性能埋点、性能指标收集、性能告警等功能
 */

/** 性能指标类型 */
export type MetricType = 'render' | 'update' | 'effect' | 'computed' | 'reaction' | 'custom';

/** 性能指标 */
export interface PerformanceMetric {
  id: string;
  name: string;
  type: MetricType;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/** 告警级别 */
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

/** 告警规则 */
export interface AlertRule {
  id: string;
  name: string;
  level: AlertLevel;
  condition: (metric: PerformanceMetric, stats: PerformanceStats) => boolean;
  message: string;
  enabled: boolean;
  cooldown: number;
}

/** 告警 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  level: AlertLevel;
  message: string;
  metric?: PerformanceMetric;
  timestamp: number;
  acknowledged: boolean;
}

/** 性能统计 */
export interface PerformanceStats {
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p99: number;
}

/** 监控配置 */
export interface MonitorOptions {
  /** 是否启用监控 */
  enabled?: boolean;
  /** 最大记录数 */
  maxRecords?: number;
  /** 默认采样率 (0-1) */
  sampleRate?: number;
  /** 是否自动记录页面指标 */
  autoRecordPageMetrics?: boolean;
  /** 是否自动记录长任务 */
  autoRecordLongTasks?: boolean;
  /** 长任务阈值 (ms) */
  longTaskThreshold?: number;
}

/** 默认配置 */
const DEFAULT_OPTIONS: Required<MonitorOptions> = {
  enabled: true,
  maxRecords: 1000,
  sampleRate: 1,
  autoRecordPageMetrics: true,
  autoRecordLongTasks: true,
  longTaskThreshold: 50,
};

// 性能记录
const metrics: PerformanceMetric[] = [];

// 告警规则
const alertRules: Map<string, AlertRule> = new Map();

// 告警记录
const alerts: Alert[] = [];

// 告警冷却时间记录
const alertCooldowns: Map<string, number> = new Map();

// 配置
let options: Required<MonitorOptions> = { ...DEFAULT_OPTIONS };

/**
 * 已注册的 `PerformanceObserver`。
 *
 * ★ 2026-10-25 修复：此前 `initPageMetrics()` / `initLongTaskObserver()` 每次都 `new`
 *   `PerformanceObserver` 却**不保留引用** ⇒ ① 重复 `initPerformanceMonitor()`（改配置、
 *   HMR、多次挂载 devtools）会叠加 N 份观察器，同一个长任务被记录 N 次，统计与告警全部翻倍；
 *   ② `resetPerformanceMonitor()` 关不掉它们，模块"重置"后仍在后台采集并往已清空的
 *   `metrics` 里写。这里统一登记，重入前先断开。
 */
let activeObservers: PerformanceObserver[] = [];

/** 断开全部自动采集观察器（幂等） */
function disconnectObservers(): void {
  for (const observer of activeObservers) {
    try {
      observer.disconnect();
    } catch {
      // 环境已回收 / 观察器已失效：忽略即可，不影响后续重建
    }
  }
  activeObservers = [];
}

// 观察者回调
type ObserverCallback = (metric: PerformanceMetric) => void;
const observers: Set<ObserverCallback> = new Set();

/**
 * 初始化性能监控
 */
export function initPerformanceMonitor(opts?: MonitorOptions): void {
  // 重入即重建：先断开上一轮注册的观察器，否则每调一次就多一份采集（见 activeObservers）
  disconnectObservers();

  options = { ...DEFAULT_OPTIONS, ...opts };

  if (options.enabled) {
    if (options.autoRecordPageMetrics) {
      initPageMetrics();
    }
    if (options.autoRecordLongTasks) {
      initLongTaskObserver();
    }
    initDefaultAlertRules();
  }
}

/**
 * 初始化页面指标记录
 */
function initPageMetrics(): void {
  if (typeof window === 'undefined') return;

  // 记录首次内容绘制
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            recordMetric({
              name: entry.name,
              type: 'custom',
              duration: entry.startTime,
              metadata: { entryType: entry.entryType },
            });
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });
      activeObservers.push(paintObserver);
    } catch (e) {
      console.warn('[LytJS Performance] Failed to observe paint metrics:', e);
    }

    // 记录首次输入延迟
    try {
      const inputObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const firstInputEntry = entry as PerformanceEventTiming;
          if (firstInputEntry.processingStart !== undefined) {
            recordMetric({
              name: 'First Input Delay',
              type: 'custom',
              duration: firstInputEntry.processingStart - firstInputEntry.startTime,
              metadata: { entryType: entry.entryType },
            });
          }
        }
      });
      inputObserver.observe({ type: 'first-input', buffered: true });
      activeObservers.push(inputObserver);
    } catch (e) {
      console.warn('[LytJS Performance] Failed to observe first-input:', e);
    }
  }
}

/**
 * 初始化长任务观察器
 */
function initLongTaskObserver(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          recordMetric({
            name: 'Long Task',
            type: 'custom',
            duration: entry.duration,
            metadata: { attribution: (entry as { attribution?: unknown }).attribution },
          });
        }
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
    activeObservers.push(longTaskObserver);
  } catch (e) {
    console.warn('[LytJS Performance] Failed to observe long tasks:', e);
  }
}

/**
 * 初始化默认告警规则
 */
function initDefaultAlertRules(): void {
  // 长任务告警
  registerAlertRule({
    id: 'long_task_warning',
    name: '长任务警告',
    level: 'warning',
    condition: (metric) => metric.duration > options.longTaskThreshold,
    message: '检测到长任务: {{name}}, 耗时 {{duration}}ms',
    enabled: true,
    cooldown: 5000,
  });

  // 渲染性能告警
  registerAlertRule({
    id: 'slow_render_error',
    name: '渲染过慢',
    level: 'error',
    condition: (metric, stats) => metric.duration > stats.p99 * 1.5 && stats.count > 10,
    message: '渲染性能异常: {{name}}, 耗时 {{duration}}ms',
    enabled: true,
    cooldown: 10000,
  });

  // 严重性能问题告警
  registerAlertRule({
    id: 'critical_render',
    name: '严重渲染问题',
    level: 'critical',
    condition: (metric) => metric.duration > 500,
    message: '严重性能问题: {{name}} 耗时超过 500ms!',
    enabled: true,
    cooldown: 30000,
  });
}

/**
 * 记录性能指标
 *
 * @returns 实际入库的指标；**未入库时返回 `null`**（监控被禁用，或被 `sampleRate` 抽样丢弃）。
 *
 * ★ 2026-10-25 修复：此前未入库时返回 `{ id: '', timestamp: 0, ...metric }` —— 一个
 *   **长得像真记录的空壳**。后果：① 调用方用 `if (result)` 判断"是否记录了"永远为真；
 *   ② `result.timestamp` 是 `0`（1970），任何"从记录时刻算起"的耗时/延迟都会算成天文数字；
 *   ③ `result.id` 是空串，无法回查。三处内部调用点都不读返回值，故改为 `null` 无回归。
 */
export function recordMetric(
  metric: Omit<PerformanceMetric, 'id' | 'timestamp'>,
): PerformanceMetric | null {
  if (!options.enabled) {
    return null;
  }

  // 采样
  if (Math.random() > options.sampleRate) {
    return null;
  }

  const fullMetric: PerformanceMetric = {
    id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    ...metric,
  };

  // 添加到记录
  metrics.push(fullMetric);

  // 限制记录数量
  if (metrics.length > options.maxRecords) {
    metrics.shift();
  }

  // 通知观察者
  observers.forEach((cb) => cb(fullMetric));

  // 检查告警规则
  checkAlertRules(fullMetric);

  return fullMetric;
}

/**
 * 获取所有性能指标
 */
export function getMetrics(limit?: number): PerformanceMetric[] {
  const result = [...metrics];
  if (limit !== undefined) {
    return result.slice(-limit);
  }
  return result;
}

/**
 * 获取性能统计
 */
export function getStats(type?: MetricType): PerformanceStats {
  const filteredMetrics = type ? metrics.filter((m) => m.type === type) : [...metrics];

  if (filteredMetrics.length === 0) {
    return {
      count: 0,
      total: 0,
      average: 0,
      min: 0,
      max: 0,
      p50: 0,
      p90: 0,
      p99: 0,
    };
  }

  const durations = filteredMetrics.map((m) => m.duration).sort((a, b) => a - b);
  const total = durations.reduce((a, b) => a + b, 0);

  return {
    count: durations.length,
    total,
    average: total / durations.length,
    min: durations[0] ?? 0,
    max: durations[durations.length - 1] ?? 0,
    p50: percentile(durations, 50),
    p90: percentile(durations, 90),
    p99: percentile(durations, 99),
  };
}

/**
 * 计算百分位数
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((sortedArray.length * p) / 100) - 1;
  return sortedArray[Math.max(0, index)] ?? 0;
}

/**
 * 注册告警规则
 */
export function registerAlertRule(rule: AlertRule): void {
  alertRules.set(rule.id, rule);
}

/**
 * 注销告警规则
 */
export function unregisterAlertRule(ruleId: string): void {
  alertRules.delete(ruleId);
}

/**
 * 启用/禁用告警规则
 */
export function setAlertRuleEnabled(ruleId: string, enabled: boolean): void {
  const rule = alertRules.get(ruleId);
  if (rule) {
    rule.enabled = enabled;
  }
}

/**
 * 获取所有告警规则
 */
export function getAlertRules(): AlertRule[] {
  return Array.from(alertRules.values());
}

/**
 * 获取当前告警
 */
export function getAlerts(includeAcknowledged: boolean = true): Alert[] {
  if (includeAcknowledged) {
    return [...alerts];
  }
  return alerts.filter((a) => !a.acknowledged);
}

/**
 * 确认告警
 */
export function acknowledgeAlert(alertId: string): void {
  const alert = alerts.find((a) => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
  }
}

/**
 * 确认所有告警
 */
export function acknowledgeAllAlerts(): void {
  alerts.forEach((alert) => {
    alert.acknowledged = true;
  });
}

/**
 * 清除告警记录
 *
 * ⚠️ **不**清 `alertCooldowns`：冷却时间是**限流器**（"同一规则多久内只报一次"），
 *    不是告警记录。清空列表后立刻又能收到同一规则的新告警，等于把限流器一起关掉。
 *    要彻底恢复出厂状态请用 `resetPerformanceMonitor()`（它清冷却）。
 */
export function clearAlerts(): void {
  alerts.length = 0;
}

/**
 * 检查告警规则
 */
function checkAlertRules(metric: PerformanceMetric): void {
  const stats = getStats(metric.type);

  alertRules.forEach((rule) => {
    if (!rule.enabled) return;

    // 检查冷却时间
    const lastTriggered = alertCooldowns.get(rule.id) || 0;
    if (Date.now() - lastTriggered < rule.cooldown) return;

    // 检查条件
    if (rule.condition(metric, stats)) {
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        level: rule.level,
        message: interpolateMessage(rule.message, metric),
        metric,
        timestamp: Date.now(),
        acknowledged: false,
      };

      alerts.push(alert);

      // 记录冷却时间
      alertCooldowns.set(rule.id, Date.now());

      // 限制告警记录数量
      if (alerts.length > 100) {
        alerts.shift();
      }

      // 输出告警到控制台
      outputAlert(alert);
    }
  });
}

/**
 * 插值消息模板
 */
function interpolateMessage(message: string, metric: PerformanceMetric): string {
  return message
    .replace(/\{\{name\}\}/g, metric.name)
    .replace(/\{\{duration\}\}/g, metric.duration.toFixed(2))
    .replace(/\{\{type\}\}/g, metric.type);
}

/**
 * 输出告警
 */
function outputAlert(alert: Alert): void {
  const levelStyles: Record<AlertLevel, string> = {
    info: 'color: #1890ff;',
    warning: 'color: #faad14;',
    error: 'color: #ff4d4f;',
    critical: 'color: #722ed1; background: #ff4d4f; padding: 2px 5px;',
  };

  console.warn(
    `%c[LytJS Alert] ${alert.ruleName}%c ${alert.message}`,
    levelStyles[alert.level],
    'color: inherit;',
  );
}

/**
 * 添加观察者
 */
export function addObserver(callback: ObserverCallback): void {
  observers.add(callback);
}

/**
 * 移除观察者
 */
export function removeObserver(callback: ObserverCallback): void {
  observers.delete(callback);
}

/**
 * 清除所有性能记录
 */
export function clearMetrics(): void {
  metrics.length = 0;
}

/**
 * 重置性能监控
 *
 * 恢复到**模块刚加载**的状态：清数据、清规则、断开自动采集，并把配置还原为默认值。
 *
 * ★ 2026-10-25 修复：此前不清 `options` ⇒ `initPerformanceMonitor({ maxRecords: 2 })`
 *   之后调用 `reset()`，`maxRecords` 仍是 2（`sampleRate` / `longTaskThreshold` 同理），
 *   所谓"重置"只重置了一半，后续记录仍被上一轮的配置约束。同时补上观察器断开，
 *   否则重置后仍在后台采集并往清空后的 `metrics` 写入。
 */
export function resetPerformanceMonitor(): void {
  disconnectObservers();
  metrics.length = 0;
  alerts.length = 0;
  observers.clear();
  alertCooldowns.clear();
  alertRules.clear();
  options = { ...DEFAULT_OPTIONS };
}

/**
 * 获取性能报告
 */
export function getPerformanceReport(): {
  metrics: PerformanceMetric[];
  stats: Record<MetricType, PerformanceStats>;
  alerts: Alert[];
  summary: {
    totalMetrics: number;
    totalAlerts: number;
    unacknowledgedAlerts: number;
    averageDuration: number;
  };
} {
  const stats: Record<MetricType, PerformanceStats> = {
    render: getStats('render'),
    update: getStats('update'),
    effect: getStats('effect'),
    computed: getStats('computed'),
    reaction: getStats('reaction'),
    custom: getStats('custom'),
  };

  const allStats = getStats();

  return {
    metrics: [...metrics],
    stats,
    alerts: [...alerts],
    summary: {
      totalMetrics: metrics.length,
      totalAlerts: alerts.length,
      unacknowledgedAlerts: alerts.filter((a) => !a.acknowledged).length,
      averageDuration: allStats.average,
    },
  };
}

/**
 * 序列化性能报告（用于显示）
 */
export function serializePerformanceReport(): string {
  const report = getPerformanceReport();
  let result = `⚡ 性能报告\n\n`;
  result += `📊 统计摘要:\n`;
  result += `  总记录数: ${report.summary.totalMetrics}\n`;
  result += `  平均耗时: ${report.summary.averageDuration.toFixed(2)}ms\n`;
  result += `  总告警数: ${report.summary.totalAlerts}\n`;
  result += `  未确认告警: ${report.summary.unacknowledgedAlerts}\n\n`;

  result += `📈 分类型统计:\n`;
  Object.entries(report.stats).forEach(([type, stats]) => {
    if (stats.count > 0) {
      result += `  ${type}: ${stats.count} 次, 平均 ${stats.average.toFixed(2)}ms, 最大 ${stats.max.toFixed(2)}ms\n`;
    }
  });

  if (report.alerts.length > 0) {
    result += `\n🚨 最近告警:\n`;
    report.alerts.slice(-5).forEach((alert) => {
      const levelIcon =
        alert.level === 'critical'
          ? '🔴'
          : alert.level === 'error'
            ? '❌'
            : alert.level === 'warning'
              ? '⚠️'
              : 'ℹ️';
      result += `  ${levelIcon} [${alert.level}] ${alert.ruleName}: ${alert.message}\n`;
    });
  }

  return result;
}

/**
 * 创建计时器
 */
export function startTimer(name: string, type: MetricType = 'custom'): () => void {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    recordMetric({ name, type, duration });
  };
}

// ===== 时序事件功能 =====

/** 时序事件 */
export interface TimelineEvent {
  id: string;
  name: string;
  category: 'render' | 'effect' | 'custom';
  startTime: number;
  duration: number;
  depth: number;
  metadata?: Record<string, unknown>;
}

/** 火焰图节点 */
export interface FlameGraphNode {
  name: string;
  value: number;
  children?: FlameGraphNode[];
  category?: 'render' | 'effect' | 'custom';
}

/** 时序事件栈 */
const timelineEventStack: Array<{
  event: TimelineEvent;
  startTime: number;
}> = [];

const timelineEvents: TimelineEvent[] = [];
const maxTimelineEvents = 1000;

/** 当前深度 */
let currentDepth = 0;

/**
 * 开始时序事件
 */
export function beginTimelineEvent(
  name: string,
  category: TimelineEvent['category'] = 'custom',
  metadata?: Record<string, unknown>,
): string {
  const id = `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const event: TimelineEvent = {
    id,
    name,
    category,
    startTime: performance.now(),
    duration: 0,
    depth: currentDepth,
    metadata,
  };

  timelineEventStack.push({
    event,
    startTime: performance.now(),
  });

  currentDepth++;

  return id;
}

/**
 * 记录一个**已结束**的时序事件，并维持 `maxTimelineEvents` 上限
 */
function pushTimelineEvent(event: TimelineEvent): void {
  timelineEvents.push(event);
  if (timelineEvents.length > maxTimelineEvents) {
    timelineEvents.shift();
  }
}

/**
 * 结束指定时序事件
 *
 * ⚠️ **隐式收口**：若栈里在它之上还有**尚未结束**的嵌套事件，则这些事件以同一时刻
 * （`endTime`）结束、**并一并记录**（外层先入、内层按开始顺序随后）。
 * 即「结束外层 ⇒ 内层随之结束」——与火焰图的嵌套语义一致。
 */
export function endTimelineEvent(id: string): TimelineEvent | null {
  const stackIndex = timelineEventStack.findIndex((item) => item.event.id === id);

  if (stackIndex === -1) {
    console.warn(`[DevTools] Timeline event ${id} not found in stack`);
    return null;
  }

  const endTime = performance.now();

  // ★ 2026-10-17 修复：此前是 `timelineEventStack.splice(stackIndex)` —— 它会把**嵌套未结束**
  //   的事件一并从栈里移除，却**只记录外层** ⇒ 内层既不出现在 `getTimelineEvents()` 里、
  //   也再也无法收口（`endTimelineEvent(内层id)` 只会报「栈中找不到」）⇒ **数据静默丢失**。
  //   而原先紧随其后的 duration 延长循环又**依赖这些嵌套项**（说明「外层结束 ⇒ 内层结束」
  //   本就是既定语义），只是漏了「记录下来」这一步。
  //
  //   同时修 `currentDepth`：原先固定 `-1`，而实际可能移除多帧 ⇒ 深度记账漂移（后续事件
  //   depth 偏大）。现按**实际移除帧数**回退。
  const removed = timelineEventStack.splice(stackIndex);
  const outer = removed[0]!;

  // 先统一收口各帧时长（内层以 endTime 为结束时刻）
  outer.event.duration = endTime - outer.event.startTime;
  for (let i = 1; i < removed.length; i++) {
    const frame = removed[i]!;
    frame.event.duration = Math.max(frame.event.duration, endTime - frame.event.startTime);
  }

  // 记录顺序：外层先入、内层按开始顺序随后（`getFlameGraphData` 的挂树启发式依赖「父先于子」）
  pushTimelineEvent(outer.event);
  for (let i = 1; i < removed.length; i++) {
    pushTimelineEvent(removed[i]!.event);
  }

  currentDepth = Math.max(0, currentDepth - removed.length);

  return outer.event;
}

/**
 * 获取所有时序事件
 */
export function getTimelineEvents(): TimelineEvent[] {
  return [...timelineEvents];
}

/**
 * 获取指定时间范围内的时序事件
 */
export function getTimelineEventsInRange(startTime: number, endTime: number): TimelineEvent[] {
  return timelineEvents.filter(
    (event) => event.startTime >= startTime && event.startTime <= endTime,
  );
}

/**
 * 获取慢操作
 */
export function getSlowOperations(limit: number = 10, threshold?: number): TimelineEvent[] {
  const sorted = [...timelineEvents].sort((a, b) => b.duration - a.duration);
  const result = threshold !== undefined ? sorted.filter((e) => e.duration >= threshold) : sorted;
  return result.slice(0, limit);
}

/**
 * 获取火焰图数据
 */
export function getFlameGraphData(): FlameGraphNode {
  const root: FlameGraphNode = {
    name: 'root',
    value: 0,
    children: [],
    category: 'custom',
  };

  // ★ 2026-10-17：删除 `nodeMap` —— 它此前只被 `set`（3 处）而**从未被读**，
  //   是纯死代码（父节点查找实际由下方 `findParentNode` 的「最后一个子节点」启发式完成）。
  timelineEvents.forEach((event) => {
    const node: FlameGraphNode = {
      name: event.name,
      value: event.duration,
      category: event.category,
      children: [],
    };

    const parentNode = event.depth === 0 ? root : findParentNode(root, event.depth);

    if (parentNode) {
      if (!parentNode.children) {
        parentNode.children = [];
      }
      parentNode.children.push(node);
    }
  });

  aggregateFlameGraphValues(root);

  return root;
}

function findParentNode(node: FlameGraphNode, depth: number): FlameGraphNode | null {
  if (!node.children || node.children.length === 0) {
    return depth === 1 ? node : null;
  }

  let targetDepth = depth - 1;
  let currentNode: FlameGraphNode | null = node;

  while (targetDepth > 0 && currentNode) {
    const children: FlameGraphNode[] = currentNode.children || [];
    if (children.length === 0) {
      return currentNode;
    }
    const lastChild: FlameGraphNode = children[children.length - 1]!;
    currentNode = lastChild;
    targetDepth--;
  }

  return currentNode;
}

function aggregateFlameGraphValues(node: FlameGraphNode): number {
  if (!node.children || node.children.length === 0) {
    return node.value;
  }

  let totalValue = node.value;
  node.children.forEach((child) => {
    totalValue += aggregateFlameGraphValues(child);
  });

  node.value = totalValue;
  return totalValue;
}

/**
 * 清除时序事件
 */
export function clearTimelineEvents(): void {
  timelineEvents.length = 0;
  timelineEventStack.length = 0;
  currentDepth = 0;
}

/**
 * 导出时序事件为 JSON
 */
export function exportTimelineAsJSON(): string {
  return JSON.stringify(
    {
      events: timelineEvents,
      exportedAt: Date.now(),
    },
    null,
    2,
  );
}

/**
 * 序列化为可读文本
 */
export function serializeTimelineEvents(): string {
  if (timelineEvents.length === 0) {
    return '暂无时序事件数据';
  }

  let result = `📊 时序事件 (${timelineEvents.length} 个)\n\n`;

  timelineEvents.slice(-20).forEach((event) => {
    const indent = '  '.repeat(event.depth);
    const duration = event.duration.toFixed(2);
    result += `${indent}├─ ${event.name} [${event.category}] ${duration}ms\n`;
  });

  return result;
}
