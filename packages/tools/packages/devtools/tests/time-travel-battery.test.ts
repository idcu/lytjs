/**
 * 行为级判据：`@lytjs/devtools-extension` 的**时间旅行面板**（`src/panel/time-travel.ts`，611 行）
 *
 * ## 为什么要有这条
 *
 * 该文件此前**一条判据都没有**（实测 0% 覆盖、373 条语句）。它是 DevTools 扩展的核心功能：
 * 录制事件历史、前后跳转、导出/导入、快照对比。这类"录制—回放"逻辑出错时**极难察觉**：
 * 面板照样显示、按钮照样能点，只是**回放不生效**。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  downloadHistory,
  initTimeTravel,
  timeTravelState,
} from '../src/panel/time-travel';
import { sendToPanel, onPanelMessage } from '../src/bridge';
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

// ==================== 事件描述：全部分支 ====================

describe('formatEventDescription 的全部分支', () => {
  it('9 种事件类型都能带出真实负载（不只是 component:mounted）', () => {
    recordEvents(0);

    const cases: [string, unknown, string][] = [
      ['component:created', { name: 'A' }, 'Component created: A'],
      ['component:updated', { name: 'C' }, 'Component updated: C'],
      ['component:unmounted', { name: 'D' }, 'Component unmounted: D'],
      ['signal:changed', { path: 'count' }, 'State changed: count'],
      ['store:mutation', { type: 'set' }, 'Store mutation: set'],
      ['router:navigation', { to: '/home' }, 'Navigation: /home'],
      ['error:captured', { message: 'boom' }, 'Error: boom'],
      [
        'performance:slow-render',
        { componentName: 'Slow', renderTime: 12 },
        'Slow render: Slow (12ms)',
      ],
    ];

    for (const [type, data] of cases) recordEvent(type, data);

    const descriptions = getHistory()
      .filter((h) => h.type === 'event')
      .map((h) => h.description);

    for (const [, , expected] of cases) expect(descriptions).toContain(expected);
  });

  it('未知类型退化为 `Event: <type>`', () => {
    recordEvents(0);
    recordEvent('weird:thing');

    expect(getHistory().some((h) => h.description === 'Event: weird:thing')).toBe(true);
  });

  it('slow-render 缺 renderTime 时显示 `?`', () => {
    recordEvents(0);
    recordEvent('performance:slow-render', { componentName: 'S' });

    expect(getHistory().some((h) => h.description === 'Slow render: S (?ms)')).toBe(true);
  });
});

// ==================== 跳转：新值为 undefined ====================

describe('跳转到「值被置为 undefined」的记录', () => {
  it('★ 新值为 undefined 时也必须写回（不能因 `!== undefined` 判断而静默跳过）', () => {
    registerSignal({ id: 'sig-u', name: 'x', value: 'has-value' } as never);
    recordEvents(0);
    recordEvent('signal:changed', { signalId: 'sig-u', path: 'x', newValue: undefined });

    const idx = getHistory().findIndex((h) => h.data.event?.type === 'signal:changed');
    expect(idx).toBeGreaterThanOrEqual(0);

    expect(jumpToHistory(idx)).toBe(true);
    expect(getSignalValue('sig-u')).toBeUndefined();
  });
});

// ==================== 导出：录制时长 ====================

describe('导出元数据', () => {
  it('★ 停止录制后 recordingDuration 不再随真实时间增长', async () => {
    startHistoryRecording();
    await new Promise((r) => setTimeout(r, 20));
    stopHistoryRecording();

    const first = JSON.parse(exportHistory()).metadata.recordingDuration as number;
    await new Promise((r) => setTimeout(r, 30));
    const second = JSON.parse(exportHistory()).metadata.recordingDuration as number;

    // 修复前用的是 `Date.now() - recordingStartTime` ⇒ 停止后仍一直涨
    expect(second).toBe(first);
  });
});

// ==================== 导入：脏数据 ====================

describe('导入时的脏数据', () => {
  it('★ 非对象条目被过滤（否则后续跳转会读到 undefined.data 崩掉）', () => {
    const payload = JSON.stringify({
      version: '1.0.0',
      history: [null, 42, { type: 'snapshot', description: 'ok', data: {}, id: 'h', timestamp: 1 }],
    });

    expect(importHistory(payload)).toBe(true);
    expect(getHistory()).toHaveLength(1);
    expect(getHistory()[0]!.description).toBe('ok');
  });
});

// ==================== 快照对比：不可 JSON 化的值 ====================

describe('compareSnapshots 对不可 JSON 化的值', () => {
  const snap = (signals: unknown[]) => ({ signals }) as never;

  it('★ BigInt 值不得抛 TypeError', () => {
    const a = snap([{ id: '1', name: 'big', value: 1n }]);
    const b = snap([{ id: '1', name: 'big', value: 2n }]);

    expect(() => compareSnapshots(a, b)).not.toThrow();
    expect(compareSnapshots(a, b)).toHaveLength(1);
  });

  it('★ 循环引用值不得抛 TypeError', () => {
    const cyc: Record<string, unknown> = {};
    cyc.self = cyc;
    const a = snap([{ id: '1', name: 'c', value: cyc }]);
    const b = snap([{ id: '1', name: 'c', value: { ...cyc } }]);

    expect(() => compareSnapshots(a, b)).not.toThrow();
  });
});

// ==================== 面板消息分发 ====================

describe('initTimeTravel 的面板命令', () => {
  let captured: { type: string; payload?: unknown }[] = [];
  let offCapture: (() => void) | null = null;

  beforeEach(() => {
    captured = [];
    offCapture = onPanelMessage((m) => captured.push(m as { type: string; payload?: unknown }));
  });

  afterEach(() => {
    offCapture?.();
    offCapture = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const typesOf = () => captured.map((m) => m.type);

  it('GET_HISTORY ⇒ HISTORY_LIST', () => {
    recordEvents(1);
    const off = initTimeTravel();

    sendToPanel({ type: 'GET_HISTORY' } as never);
    off();

    expect(typesOf()).toContain('HISTORY_LIST');
  });

  it('★ JUMP_TO_HISTORY 必须读到 payload.index（此前读 msg.data ⇒ 恒 undefined）', () => {
    recordEvents(1);
    const off = initTimeTravel();

    sendToPanel({ type: 'JUMP_TO_HISTORY', payload: { index: 0 } } as never);
    off();

    const result = captured.find((m) => m.type === 'JUMP_RESULT');
    // 修复前 `handleJumpToHistory(undefined)` ⇒ 连 JUMP_RESULT 都不会发出
    expect(result).toBeDefined();
    expect(result!.payload).toEqual({ success: true, index: 0 });
    expect(getCurrentIndex()).toBe(0);
  });

  it('四个导航命令都回 NAVIGATION_RESULT 且方向正确', () => {
    recordEvents(2);
    const off = initTimeTravel();

    for (const type of ['GO_BACK', 'GO_FORWARD', 'GO_TO_START', 'GO_TO_END']) {
      sendToPanel({ type } as never);
    }
    off();

    const dirs = captured
      .filter((m) => m.type === 'NAVIGATION_RESULT')
      .map((m) => (m.payload as { direction: string }).direction);

    expect(dirs).toEqual(['back', 'forward', 'start', 'end']);
  });

  it('CLEAR_HISTORY / EXPORT_HISTORY 生效', () => {
    recordEvents(1);
    const off = initTimeTravel();

    sendToPanel({ type: 'EXPORT_HISTORY' } as never);
    sendToPanel({ type: 'CLEAR_HISTORY' } as never);
    off();

    expect(typesOf()).toContain('HISTORY_EXPORTED');
    expect(typesOf()).toContain('HISTORY_CLEARED');
    expect(getHistory()).toHaveLength(0);
  });

  it('★ IMPORT_HISTORY 必须读到 payload.json', () => {
    const off = initTimeTravel();
    const json = JSON.stringify({ version: '1.0.0', history: [] });

    sendToPanel({ type: 'IMPORT_HISTORY', payload: { json } } as never);
    off();

    expect(typesOf()).toContain('HISTORY_IMPORT_RESULT');
  });

  it('★ GET_STATE_DIFF 必须读到 payload.index', () => {
    recordEvents(1);
    const off = initTimeTravel();

    sendToPanel({ type: 'GET_STATE_DIFF', payload: { index: 1 } } as never);
    off();

    expect(typesOf()).toContain('STATE_DIFF');
  });

  it('START / STOP 录制命令生效', () => {
    const off = initTimeTravel();

    sendToPanel({ type: 'START_TIME_TRAVEL_RECORDING' } as never);
    expect(timeTravelState.isRecording).toBe(true);
    sendToPanel({ type: 'STOP_TIME_TRAVEL_RECORDING' } as never);
    expect(timeTravelState.isRecording).toBe(false);
    off();
  });

  it('未知消息类型被忽略（不抛错）', () => {
    const off = initTimeTravel();

    expect(() => sendToPanel({ type: 'NOT_A_COMMAND' } as never)).not.toThrow();
    off();
  });

  it('返回的取消函数能解除订阅', () => {
    const off = initTimeTravel();
    off();
    captured.length = 0;

    sendToPanel({ type: 'GET_HISTORY' } as never);

    // 不能用「总条数不变」断言：我自己的 capture 处理器也会收到发出去的那条消息。
    // 该看的是「处理器**产出**的消息」有没有再出现。
    expect(typesOf()).not.toContain('HISTORY_LIST');
  });
});

// ==================== 下载 ====================

describe('downloadHistory', () => {
  it('浏览器路径：创建 blob URL、点击、回收', () => {
    recordEvents(0);
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const anchor = { href: '', download: '', click };
    const appendChild = vi.fn();
    const removeChild = vi.fn();

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('Blob', class {});
    vi.stubGlobal('document', {
      createElement: () => anchor,
      body: { appendChild, removeChild },
    });

    expect(() => downloadHistory('x.json')).not.toThrow();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe('x.json');
    expect(click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('非浏览器路径：只警告不抛错', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('document', undefined);

    expect(() => downloadHistory()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('only available in browser'));
  });
});
