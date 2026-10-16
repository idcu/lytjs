/**
 * 行为级判据：`@lytjs/devtools` 的**性能监控**模块（`src/performance.ts`，812 行）
 *
 * ## 为什么要有这条
 *
 * 该模块是 `@lytjs/devtools` 的**公开导出面**（`index.ts` 转出），含 20+ 个公开函数
 * （指标记录 / 统计 / 告警规则 / 观察者 / 时序事件 / 火焰图 / 报告），但 `tests/index.test.ts`
 * **一个符号都没引用** ⇒ 覆盖率实测 ~429 条语句未覆盖。
 *
 * ## 手法
 *
 * 模块持有**模块级状态**（`metrics` / `alerts` / `alertRules` / `observers` / timeline 栈）
 * ⇒ 每个用例前 `resetPerformanceMonitor()` 再 `initPerformanceMonitor({...})` 重建默认规则，
 * 并关掉环境相关的自动采集（`autoRecordPageMetrics` / `autoRecordLongTasks`）。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
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
  beginTimelineEvent,
  endTimelineEvent,
  getTimelineEvents,
  getTimelineEventsInRange,
  getSlowOperations,
  getFlameGraphData,
  clearTimelineEvents,
  exportTimelineAsJSON,
  serializeTimelineEvents,
} from '../src/performance';
import type { PerformanceMetric, AlertRule } from '../src/performance';

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  resetPerformanceMonitor();
  clearTimelineEvents();
  initPerformanceMonitor({ autoRecordPageMetrics: false, autoRecordLongTasks: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const rec = (name: string, duration: number, type: PerformanceMetric['type'] = 'render') =>
  recordMetric({ name, type, duration });

/**
 * ⚠️ 必须**按 ruleId 过滤**：`initPerformanceMonitor` 会注册三条**内置**默认规则
 * （`long_task_warning` / `slow_render_error` / `critical_render`），其中 `long_task_warning`
 * 的条件是 `duration > 50` ⇒ 与下面自定义规则（`> 100`）**重叠**，直接数 `getAlerts()`
 * 会把内置规则的告警一并数进来。
 */
const alertsOf = (ruleId: string) => getAlerts().filter((a) => a.ruleId === ruleId);

const rule = (over: Partial<AlertRule> = {}): AlertRule => ({
  id: 'test_rule',
  name: '测试规则',
  level: 'warning',
  condition: (m) => m.duration > 100,
  message: '慢: {{name}} {{duration}}ms ({{type}})',
  enabled: true,
  cooldown: 0,
  ...over,
});

// ==================== 指标记录与读取 ====================

describe('recordMetric / getMetrics', () => {
  it('记录后可按顺序读回，且 id / timestamp 已填充', () => {
    const m = rec('a', 10);
    rec('b', 20);

    expect(m.id).toMatch(/^metric_/);
    expect(m.timestamp).toBeGreaterThan(0);
    expect(getMetrics().map((x) => x.name)).toEqual(['a', 'b']);
  });

  it('getMetrics(limit) 返回**最后** limit 条', () => {
    rec('a', 1);
    rec('b', 2);
    rec('c', 3);

    expect(getMetrics(2).map((x) => x.name)).toEqual(['b', 'c']);
  });

  it('maxRecords 生效：超出后丢弃最旧的', () => {
    resetPerformanceMonitor();
    initPerformanceMonitor({
      maxRecords: 3,
      autoRecordPageMetrics: false,
      autoRecordLongTasks: false,
    });

    for (let i = 1; i <= 5; i++) rec(`m${i}`, i);

    expect(getMetrics().length).toBe(3);
    expect(getMetrics().map((x) => x.name)).toEqual(['m3', 'm4', 'm5']);
  });

  it('enabled:false 时不记录', () => {
    resetPerformanceMonitor();
    initPerformanceMonitor({ enabled: false });

    rec('a', 10);

    expect(getMetrics()).toHaveLength(0);
  });

  it('clearMetrics 只清指标，不动告警规则', () => {
    rec('a', 10);
    clearMetrics();

    expect(getMetrics()).toHaveLength(0);
    expect(getAlertRules().length).toBeGreaterThan(0);
  });

  // ===== 公开开关的产物级断言（硬约束 9：翻转 ⇒ 变红）=====

  it('★ 开关 sampleRate：0 ⇒ 全部丢弃，1 ⇒ 全部记录', () => {
    resetPerformanceMonitor();
    initPerformanceMonitor({
      sampleRate: 0,
      autoRecordPageMetrics: false,
      autoRecordLongTasks: false,
    });
    for (let i = 0; i < 20; i++) rec(`s${i}`, 1);
    expect(getMetrics()).toHaveLength(0);

    resetPerformanceMonitor();
    initPerformanceMonitor({
      sampleRate: 1,
      autoRecordPageMetrics: false,
      autoRecordLongTasks: false,
    });
    for (let i = 0; i < 20; i++) rec(`t${i}`, 1);
    expect(getMetrics()).toHaveLength(20);
  });

  it('★ 开关 longTaskThreshold：翻转后内置长任务规则的判定随之改变', () => {
    resetPerformanceMonitor();
    initPerformanceMonitor({
      longTaskThreshold: 10_000,
      autoRecordPageMetrics: false,
      autoRecordLongTasks: false,
    });
    rec('x', 200);
    expect(alertsOf('long_task_warning')).toHaveLength(0);

    resetPerformanceMonitor();
    initPerformanceMonitor({
      longTaskThreshold: 10,
      autoRecordPageMetrics: false,
      autoRecordLongTasks: false,
    });
    rec('y', 200);
    expect(alertsOf('long_task_warning')).toHaveLength(1);
  });
});

// ==================== 统计 ====================

describe('getStats', () => {
  it('无数据时全 0', () => {
    expect(getStats()).toEqual({
      count: 0,
      total: 0,
      average: 0,
      min: 0,
      max: 0,
      p50: 0,
      p90: 0,
      p99: 0,
    });
  });

  it('单条：count/total/average/min/max 正确', () => {
    rec('a', 42);

    const s = getStats();
    expect(s.count).toBe(1);
    expect(s.total).toBe(42);
    expect(s.average).toBe(42);
    expect(s.min).toBe(42);
    expect(s.max).toBe(42);
  });

  it('多条：min/max/average 正确', () => {
    rec('a', 10);
    rec('b', 30);
    rec('c', 20);

    const s = getStats();
    expect(s.min).toBe(10);
    expect(s.max).toBe(30);
    expect(s.average).toBeCloseTo(20);
  });

  it('按 type 过滤', () => {
    rec('r1', 10, 'render');
    rec('e1', 99, 'effect');

    expect(getStats('render').count).toBe(1);
    expect(getStats('render').max).toBe(10);
    expect(getStats('effect').max).toBe(99);
    expect(getStats('computed').count).toBe(0);
  });

  it('百分位（1..10 ⇒ p50=5, p90=9, p99=10）', () => {
    for (let i = 1; i <= 10; i++) rec(`m${i}`, i);

    const s = getStats();
    expect(s.p50).toBe(5);
    expect(s.p90).toBe(9);
    expect(s.p99).toBe(10);
  });
});

// ==================== 观察者 ====================

describe('addObserver / removeObserver', () => {
  it('观察者收到每次记录的指标', () => {
    const seen: string[] = [];
    addObserver((m) => seen.push(m.name));

    rec('a', 1);
    rec('b', 2);

    expect(seen).toEqual(['a', 'b']);
  });

  it('移除后不再收到', () => {
    const seen: string[] = [];
    const cb = (m: PerformanceMetric): void => void seen.push(m.name);

    addObserver(cb);
    rec('a', 1);
    removeObserver(cb);
    rec('b', 2);

    expect(seen).toEqual(['a']);
  });

  it('resetPerformanceMonitor 会清空观察者', () => {
    const seen: string[] = [];
    addObserver((m) => seen.push(m.name));
    resetPerformanceMonitor();

    rec('a', 1);

    expect(seen).toEqual([]);
  });
});

// ==================== 告警规则与告警 ====================

describe('告警规则', () => {
  it('满足条件时产生告警，且消息模板被插值', () => {
    registerAlertRule(rule());
    rec('slow', 200);

    const list = alertsOf('test_rule');
    expect(list).toHaveLength(1);
    expect(list[0]!.ruleId).toBe('test_rule');
    expect(list[0]!.level).toBe('warning');
    expect(list[0]!.message).toBe('慢: slow 200.00ms (render)');
    expect(list[0]!.acknowledged).toBe(false);
  });

  it('不满足条件时不产生告警', () => {
    registerAlertRule(rule());
    rec('fast', 10);

    expect(alertsOf('test_rule')).toHaveLength(0);
  });

  it('cooldown 生效：冷却期内不重复告警', () => {
    registerAlertRule(rule({ cooldown: 60_000 }));
    rec('s1', 200);
    rec('s2', 200);

    expect(alertsOf('test_rule')).toHaveLength(1);
  });

  it('setAlertRuleEnabled(false) 后不再告警', () => {
    registerAlertRule(rule());
    setAlertRuleEnabled('test_rule', false);
    rec('slow', 200);

    expect(alertsOf('test_rule')).toHaveLength(0);
    expect(getAlertRules().find((r) => r.id === 'test_rule')!.enabled).toBe(false);
  });

  it('unregisterAlertRule 后不再告警', () => {
    registerAlertRule(rule());
    unregisterAlertRule('test_rule');
    rec('slow', 200);

    expect(alertsOf('test_rule')).toHaveLength(0);
    expect(getAlertRules().find((r) => r.id === 'test_rule')).toBeUndefined();
  });

  it('内置默认规则：duration > 500 ⇒ critical', () => {
    rec('very slow', 600);

    const list = getAlerts();
    expect(list.some((a) => a.level === 'critical')).toBe(true);
  });

  it('确认与读取：acknowledgeAlert / getAlerts(false) / acknowledgeAllAlerts', () => {
    registerAlertRule(rule({ cooldown: 0 }));
    rec('s1', 200);
    rec('s2', 200);
    expect(alertsOf('test_rule')).toHaveLength(2);

    acknowledgeAlert(alertsOf('test_rule')[0]!.id);
    expect(getAlerts().filter((a) => a.ruleId === 'test_rule')).toHaveLength(2);
    expect(alertsOf('test_rule').filter((a) => !a.acknowledged)).toHaveLength(1);

    acknowledgeAllAlerts();
    expect(getAlerts(false)).toHaveLength(0);
  });

  it('clearAlerts 清空告警记录', () => {
    registerAlertRule(rule());
    rec('slow', 200);
    expect(alertsOf('test_rule')).toHaveLength(1);

    clearAlerts();

    expect(getAlerts()).toHaveLength(0);
  });
});

// ==================== 报告 ====================

describe('getPerformanceReport / serializePerformanceReport', () => {
  it('summary 数字与记录一致', () => {
    rec('a', 10);
    rec('b', 30);
    registerAlertRule(rule({ cooldown: 0 }));
    rec('slow', 200);

    const r = getPerformanceReport();
    expect(r.summary.totalMetrics).toBe(3);
    // `totalAlerts` 是**全部**告警数（含内置 `long_task_warning` 等规则产生的）
    expect(r.summary.totalAlerts).toBe(getAlerts().length);
    expect(r.summary.unacknowledgedAlerts).toBe(getAlerts(false).length);
    expect(alertsOf('test_rule')).toHaveLength(1);
    expect(r.summary.averageDuration).toBeCloseTo((10 + 30 + 200) / 3);
    expect(r.stats.render.count).toBe(3);
    expect(r.stats.effect.count).toBe(0);
  });

  it('序列化文本含摘要与分类型统计', () => {
    rec('a', 10);
    rec('b', 30);

    const text = serializePerformanceReport();
    expect(text).toContain('性能报告');
    expect(text).toContain('总记录数: 2');
    expect(text).toContain('render: 2 次');
  });
});

// ==================== 计时器 ====================

describe('startTimer', () => {
  it('停止函数会记录一条同名的指标', async () => {
    const stop = startTimer('op', 'effect');
    await new Promise((r) => setTimeout(r, 5));
    stop();

    const list = getMetrics();
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe('op');
    expect(list[0]!.type).toBe('effect');
    expect(list[0]!.duration).toBeGreaterThanOrEqual(0);
  });
});

// ==================== 时序事件 ====================

describe('时序事件：begin / end', () => {
  it('begin 返回 id；end 返回事件并进入列表', () => {
    const id = beginTimelineEvent('A', 'render');
    const ev = endTimelineEvent(id);

    expect(ev).not.toBeNull();
    expect(ev!.name).toBe('A');
    expect(ev!.category).toBe('render');
    expect(ev!.duration).toBeGreaterThanOrEqual(0);
    expect(getTimelineEvents().map((e) => e.name)).toEqual(['A']);
  });

  it('嵌套：内层先结束 ⇒ 两者都在，depth 为 0 / 1', () => {
    const a = beginTimelineEvent('A');
    const b = beginTimelineEvent('B');
    endTimelineEvent(b);
    endTimelineEvent(a);

    const events = getTimelineEvents();
    expect(events.map((e) => e.name).sort()).toEqual(['A', 'B']);
    expect(events.find((e) => e.name === 'B')!.depth).toBe(1);
    expect(events.find((e) => e.name === 'A')!.depth).toBe(0);
  });

  it('end 未知 id ⇒ 返回 null 并告警（不抛）', () => {
    expect(endTimelineEvent('nope')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('★ 外层先结束、内层尚未结束 ⇒ 内层应被**隐式收口并记录**（不得静默丢弃）', () => {
    // 契约：`beginTimelineEvent` 返回的 id 都应在 `getTimelineEvents()` 里出现。
    // 若外层结束时把内层从栈里 `splice` 掉，内层**永远无法被记录**（数据静默丢失）。
    const a = beginTimelineEvent('A');
    const b = beginTimelineEvent('B');

    endTimelineEvent(a);

    const recordedB = getTimelineEvents().find((e) => e.name === 'B');
    expect(recordedB, '内层事件 B 被丢弃了（end 外层时 splice 掉了它）').toBeDefined();
    expect(recordedB!.duration).toBeGreaterThanOrEqual(0);
    expect(recordedB!.depth).toBe(1);
    // 已被隐式收口 ⇒ 再次 end 应为「栈中找不到」（返回 null），而不是重复记录
    expect(endTimelineEvent(b)).toBeNull();
    expect(getTimelineEvents().filter((e) => e.name === 'B')).toHaveLength(1);
  });

  it('★ 外层隐式收口内层后，depth 记账应复位（后续事件深度不漂移）', () => {
    const a = beginTimelineEvent('A');
    beginTimelineEvent('B');
    endTimelineEvent(a);

    const c = beginTimelineEvent('C');
    const evC = endTimelineEvent(c);

    expect(evC!.depth).toBe(0);
  });

  it('外层 duration 应覆盖已结束的内层耗时', async () => {
    const a = beginTimelineEvent('A');
    const b = beginTimelineEvent('B');
    await new Promise((r) => setTimeout(r, 20));
    endTimelineEvent(b);
    endTimelineEvent(a);

    const evA = getTimelineEvents().find((e) => e.name === 'A')!;
    const evB = getTimelineEvents().find((e) => e.name === 'B')!;
    expect(evA.duration).toBeGreaterThanOrEqual(evB.duration);
  });
});

describe('时序事件：查询与导出', () => {
  it('getSlowOperations 按 duration 降序并支持阈值', async () => {
    const a = beginTimelineEvent('fast');
    endTimelineEvent(a);
    const b = beginTimelineEvent('slow');
    await new Promise((r) => setTimeout(r, 15));
    endTimelineEvent(b);

    const top = getSlowOperations(10);
    expect(top[0]!.name).toBe('slow');

    const filtered = getSlowOperations(10, 10);
    expect(filtered.map((e) => e.name)).toEqual(['slow']);
  });

  it('getTimelineEventsInRange 按 startTime 过滤', () => {
    const before = performance.now() - 1000;
    const a = beginTimelineEvent('A');
    endTimelineEvent(a);
    const after = performance.now() + 1000;

    expect(getTimelineEventsInRange(before, after)).toHaveLength(1);
    expect(getTimelineEventsInRange(after, after + 100)).toHaveLength(0);
  });

  it('getFlameGraphData：depth 0 的事件挂在 root 下，且 value 聚合', () => {
    const a = beginTimelineEvent('A');
    const b = beginTimelineEvent('B');
    endTimelineEvent(b);
    endTimelineEvent(a);

    const root = getFlameGraphData();
    expect(root.name).toBe('root');
    expect(root.children!.map((c) => c.name)).toContain('A');
    expect(root.value).toBeGreaterThanOrEqual(0);
  });

  it('clearTimelineEvents 清空事件与栈', () => {
    const a = beginTimelineEvent('A');
    endTimelineEvent(a);
    clearTimelineEvents();

    expect(getTimelineEvents()).toHaveLength(0);
    // 栈也被清空 ⇒ 之前未结束的事件不再可收口
    const dangling = beginTimelineEvent('C');
    clearTimelineEvents();
    expect(endTimelineEvent(dangling)).toBeNull();
  });

  it('exportTimelineAsJSON / serializeTimelineEvents', () => {
    const a = beginTimelineEvent('A', 'effect');
    endTimelineEvent(a);

    const parsed = JSON.parse(exportTimelineAsJSON()) as {
      events: Array<{ name: string }>;
      exportedAt: number;
    };
    expect(parsed.events.map((e) => e.name)).toEqual(['A']);
    expect(parsed.exportedAt).toBeGreaterThan(0);

    const text = serializeTimelineEvents();
    expect(text).toContain('A');
    expect(text).toContain('[effect]');
  });

  it('无事件时 serializeTimelineEvents 给出占位文案', () => {
    expect(serializeTimelineEvents()).toBe('暂无时序事件数据');
  });
});

// ==================== 重置 ====================

describe('resetPerformanceMonitor', () => {
  it('清空指标 / 告警 / 规则 / 观察者 / 冷却', () => {
    registerAlertRule(rule());
    addObserver(() => {});
    rec('slow', 200);

    resetPerformanceMonitor();

    expect(getMetrics()).toHaveLength(0);
    expect(getAlerts()).toHaveLength(0);
    expect(getAlertRules()).toHaveLength(0);
  });
});
