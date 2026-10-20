/**
 * 行为级判据：`@lytjs/devtools-extension` 的**时间旅行面板**（`src/panel/time-travel.ts`，611 行）
 *
 * ## 为什么要有这条
 *
 * 该文件此前**一条判据都没有**（实测 0% 覆盖、373 条语句）。它是 DevTools 扩展的核心功能：
 * 录制事件历史、前后跳转、导出/导入、快照对比。这类"录制—回放"逻辑出错时**极难察觉**：
 * 面板照样显示、按钮照样能点，只是**回放不生效**。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  startHistoryRecording,
  stopHistoryRecording,
  jumpToHistory,
  goBack,
  goForward,
  goToStart,
  goToEnd,
  getHistory,
  getCurrentIndex,
  clearHistory,
  getHistoryEntry,
  exportHistory,
  importHistory,
  compareSnapshots,
  getStateDiffForEntry,
  timeTravelState,
} from '../src/panel/time-travel';
import { recordEvent, clearEvents } from '../src/events';
import { registerSignal, clearSignalRegistry, getSignalValue } from '../src/signals';

beforeEach(() => {
  stopHistoryRecording();
  clearHistory();
  clearEvents();
  clearSignalRegistry();
  timeTravelState.maxHistorySize = 1000;
});

/** 开始录制并写入 n 个事件（entry 0 是初始快照） */
const recordEvents = (n: number, type = 'component:mounted'): void => {
  startHistoryRecording();
  for (let i = 0; i < n; i++) {
    recordEvent(type, { name: `Comp${i}` });
  }
};

// ==================== 录制 ====================

describe('录制开关', () => {
  it('开始录制 ⇒ 写入一条「初始快照」并置 isRecording', () => {
    startHistoryRecording();

    expect(timeTravelState.isRecording).toBe(true);
    expect(getHistory()).toHaveLength(1);
    expect(getHistory()[0]!.type).toBe('snapshot');
    expect(getHistory()[0]!.description).toContain('Initial state');
  });

  it('★ 重复开始录制是幂等的（不会重复写初始快照）', () => {
    startHistoryRecording();
    startHistoryRecording();

    expect(getHistory()).toHaveLength(1);
  });

  it('停止录制后不再追加事件', () => {
    recordEvents(1);
    stopHistoryRecording();
    const before = getHistory().length;

    recordEvent('component:updated', { name: 'X' });

    expect(getHistory()).toHaveLength(before);
    expect(timeTravelState.isRecording).toBe(false);
  });

  it('停止未开始的录制不抛错', () => {
    expect(() => stopHistoryRecording()).not.toThrow();
  });

  it('★ 事件描述要带出真实负载（不能恒为 Unknown）', () => {
    recordEvents(1);

    // `subscribeEvents` 给的是 `EventRecord`（负载在 `data`），而 `DevToolsEvent` 用 `payload`。
    // 原实现直接强转 ⇒ `payload` 恒 undefined ⇒ 描述永远是 "Component mounted: Unknown"。
    expect(getHistory()[1]!.description).toBe('Component mounted: Comp0');
  });
});

// ==================== 历史管理 ====================

describe('历史管理', () => {
  it('clearHistory 清空并重置索引', () => {
    recordEvents(2);

    clearHistory();

    expect(getHistory()).toEqual([]);
    expect(getCurrentIndex()).toBe(-1);
  });

  it('getHistory 返回**副本**', () => {
    recordEvents(1);

    const h = getHistory() as unknown as unknown[];
    h.push('injected');

    expect(getHistory()).toHaveLength(2);
  });

  it('getHistoryEntry 按下标取', () => {
    recordEvents(1);

    expect(getHistoryEntry(0)!.type).toBe('snapshot');
    expect(getHistoryEntry(999)).toBeUndefined();
  });

  it('超过 maxHistorySize 时丢弃最旧的并重排 index', () => {
    timeTravelState.maxHistorySize = 3;
    recordEvents(5);

    const h = getHistory();
    expect(h).toHaveLength(3);
    expect(h.map((e) => e.index)).toEqual([0, 1, 2]);
  });
});

// ==================== 导航 ====================

describe('导航', () => {
  it('越界跳转返回 false', () => {
    recordEvents(2);

    expect(jumpToHistory(-1)).toBe(false);
    expect(jumpToHistory(99)).toBe(false);
    expect(jumpToHistory(1.5)).toBe(false); // 非整数下标
  });

  it('goBack / goForward / goToStart / goToEnd 的边界', () => {
    recordEvents(2);
    const last = getHistory().length - 1;

    // 当前在末尾
    expect(goForward()).toBe(false);

    expect(goBack()).toBe(true);
    expect(getCurrentIndex()).toBe(last - 1);

    expect(goForward()).toBe(true);
    expect(goToStart()).toBe(true);
    expect(getCurrentIndex()).toBe(0);
    expect(goBack()).toBe(false); // 已在起点

    expect(goToEnd()).toBe(true);
    expect(getCurrentIndex()).toBe(last);
  });

  it('空历史时导航返回 false', () => {
    expect(goBack()).toBe(false);
    expect(goForward()).toBe(false);
    expect(goToStart()).toBe(false);
    expect(goToEnd()).toBe(false);
  });

  it('★ 跳到状态变更记录时，信号的当前值要被恢复', () => {
    registerSignal({
      id: 'sig1',
      name: 'count',
      value: 0,
      type: 'ref',
      dependencies: [],
      dependents: [],
    } as never);

    startHistoryRecording();
    recordEvent('signal:changed', { signalId: 'sig1', path: 'count', newValue: 42 });

    const idx = getHistory().length - 1;
    const ok = jumpToHistory(idx);

    expect(ok).toBe(true);
    // 原实现读 `entry.data.event.payload.signalId`，但事件负载在 `data` 上 ⇒ 恒 undefined ⇒ 恢复不了
    expect(getSignalValue('sig1')).toBe(42);
  });
});

// ==================== 导出 / 导入 ====================

describe('导出与导入', () => {
  it('exportHistory 产出可解析的 JSON，含版本与条目数', () => {
    recordEvents(2);

    const parsed = JSON.parse(exportHistory()) as {
      version: string;
      history: unknown[];
      metadata: { totalEvents: number };
    };

    expect(parsed.version).toBe('1.0.0');
    expect(parsed.history).toHaveLength(3);
    expect(parsed.metadata.totalEvents).toBe(2);
  });

  it('importHistory 能还原条目并重排 index', () => {
    recordEvents(2);
    const json = exportHistory();
    clearHistory();

    expect(importHistory(json)).toBe(true);
    expect(getHistory()).toHaveLength(3);
    expect(getHistory().map((e) => e.index)).toEqual([0, 1, 2]);
    expect(getCurrentIndex()).toBe(2);
  });

  it('非法 JSON / 缺 version ⇒ 返回 false', () => {
    expect(importHistory('not json')).toBe(false);
    expect(importHistory('{"history":[]}')).toBe(false);
  });

  it('★ 导入失败不得**清空**用户原有历史（数据丢失）', () => {
    recordEvents(2);
    const before = getHistory().length;

    // `history` 存在但不是数组 ⇒ 校验能过、`clearHistory()` 已执行、`.map` 才抛错
    const ok = importHistory('{"version":"1.0.0","history":{}}');

    expect(ok).toBe(false);
    // 修复前：历史已被清空 ⇒ 用户白丢一次录制
    expect(getHistory()).toHaveLength(before);
  });
});

// ==================== 快照对比 ====================

describe('compareSnapshots / getStateDiffForEntry', () => {
  const snap = (signals: Array<{ id: string; name: string; value: unknown }>) =>
    ({ id: 's', timestamp: 0, signals, components: [] }) as never;

  it('新增 / 修改 / 删除三类差异', () => {
    const a = snap([
      { id: '1', name: 'kept', value: 1 },
      { id: '2', name: 'changed', value: 'old' },
      { id: '3', name: 'removed', value: true },
    ]);
    const b = snap([
      { id: '1', name: 'kept', value: 1 },
      { id: '2', name: 'changed', value: 'new' },
      { id: '4', name: 'added', value: 9 },
    ]);

    const diffs = compareSnapshots(a, b);

    expect(diffs).toHaveLength(3);
    expect(diffs.find((d) => d.path === 'signals.added')!.oldValue).toBeUndefined();
    expect(diffs.find((d) => d.path === 'signals.changed')!.newValue).toBe('new');
    expect(diffs.find((d) => d.path === 'signals.removed')!.newValue).toBeUndefined();
  });

  it('完全相同 ⇒ 无差异', () => {
    const a = snap([{ id: '1', name: 'x', value: 1 }]);

    expect(compareSnapshots(a, snap([{ id: '1', name: 'x', value: 1 }]))).toEqual([]);
  });

  it('getStateDiffForEntry：首条与越界返回空', () => {
    recordEvents(1);

    expect(getStateDiffForEntry(0)).toEqual([]);
    expect(getStateDiffForEntry(99)).toEqual([]);
  });
});
