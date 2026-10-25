// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/devtools` 的**公开门面**（`src/api.ts`，80 行、0% 覆盖）
 *
 * ## 为什么要有这条
 *
 * `createDevToolsAPI()` 是面板/插件真正拿到的那个对象，覆盖率 **0%** —— 底层
 * state / component-tree / signals / events / snapshots / bridge 各有测试，但**把它们接起来
 * 的那层从没被执行过**。接错线的典型症状是「方法在、调用不报错、结果永远空」，比崩更难查。
 *
 * 空档里还藏着两处**重复实现**（ADR 0011）：
 * - `getSignalValue` 自己写了 `getSignalById(id)?.value`，没转发 `signals.getSignalValue`；
 * - `getEvents(filter)` 先全量取出再自己 filter，绕过了 `events.getEvents(types)` 的
 *   类型白名单（而那段注释正写着「此前只支持全量返回，调用方只能自己再 filter 一遍」）。
 *   两处都已改为转发，本电池守住「门面 == 底层」。
 *
 * ⚠️ 已知待办（**本电池只记录当前语义，不修**）：`startRecording()` / `stopRecording()`
 *    只改标志位，`recordEvent()` 并**不检查**它 —— 面板上的「录制」开关是装饰性的。
 *    是否改成「默认不录、点录制才开始」是产品行为决定（影响所有调用方），需 owner 拍板。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDevToolsAPI } from '../src/api';
import type { DevToolsAPI } from '../src/types';
import { resetState, getState } from '../src/state';
import { registerComponent, clearComponents } from '../src/component-tree';
import { registerSignal, clearSignals } from '../src/signals';
import { recordEvent, clearEvents } from '../src/events';
import { clearSnapshots } from '../src/snapshots';
import { clearHandlers } from '../src/bridge';

const EXPECTED_METHODS: Array<keyof DevToolsAPI> = [
  'getState',
  'enable',
  'disable',
  'getComponentTree',
  'getComponentById',
  'getSignals',
  'getSignalValue',
  'startRecording',
  'stopRecording',
  'getEvents',
  'clearEvents',
  'takeSnapshot',
  'restoreSnapshot',
  'getSnapshots',
  'sendToPanel',
  'onPanelMessage',
];

let api: DevToolsAPI;

beforeEach(() => {
  resetState();
  clearComponents();
  clearSignals();
  clearEvents();
  clearSnapshots();
  clearHandlers();
  api = createDevToolsAPI();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ==================== 门面完整性 ====================

describe('门面完整性', () => {
  it('★ 接口声明的每个方法都必须真的实现（且都是函数）', () => {
    for (const name of EXPECTED_METHODS) {
      expect(typeof api[name], `缺少 ${String(name)}`).toBe('function');
    }
  });

  it('不额外暴露接口之外的方法（避免"文档没有、实现有"的暗门）', () => {
    const actual = Object.keys(api).sort();
    expect(actual).toEqual([...EXPECTED_METHODS].sort());
  });
});

// ==================== 状态 ====================

describe('状态', () => {
  it('getState 反映 enable / disable', () => {
    expect(api.getState().enabled).toBe(false);

    api.enable();
    expect(api.getState().enabled).toBe(true);
    expect(getState().enabled).toBe(true);

    api.disable();
    expect(api.getState().enabled).toBe(false);
  });
});

// ==================== 组件树 ====================

describe('组件树', () => {
  it('getComponentTree 反映已注册的组件', () => {
    registerComponent({ id: 'c1', name: 'App', children: [] });

    const tree = api.getComponentTree();

    expect(tree).toHaveLength(1);
    expect(tree[0]!.name).toBe('App');
  });

  it('getComponentById 命中 / 未命中', () => {
    registerComponent({ id: 'c2', name: 'Child', children: [] });

    expect(api.getComponentById('c2')?.name).toBe('Child');
    expect(api.getComponentById('ghost')).toBeUndefined();
  });
});

// ==================== 信号 ====================

describe('信号', () => {
  it('getSignals 返回注册过的信号', () => {
    registerSignal({ id: 's1', name: 'count', type: 'ref', value: 1 });

    const signals = api.getSignals();

    expect(signals).toHaveLength(1);
    expect(signals[0]!.name).toBe('count');
  });

  it('★ getSignalValue 与底层 signals.getSignalValue 结果一致（门面不得自己再写一遍）', () => {
    registerSignal({ id: 's2', name: 'flag', type: 'ref', value: true });

    expect(api.getSignalValue('s2')).toBe(true);
    expect(api.getSignalValue('missing')).toBeUndefined();
  });
});

// ==================== 事件 ====================

describe('事件', () => {
  it('getEvents 返回全部；传类型白名单时只返回该类型', () => {
    recordEvent('component:created', { name: 'A' });
    recordEvent('signal:changed', { id: 's' });
    recordEvent('component:created', { name: 'B' });

    expect(api.getEvents()).toHaveLength(3);

    const created = api.getEvents(['component:created']);
    expect(created).toHaveLength(2);
    expect(created.every((e) => e.type === 'component:created')).toBe(true);
  });

  it('空数组等同于不传（不返回空列表）', () => {
    recordEvent('component:created');

    expect(api.getEvents([])).toHaveLength(1);
  });

  it('clearEvents 清空', () => {
    recordEvent('component:created');
    api.clearEvents();

    expect(api.getEvents()).toHaveLength(0);
  });

  it('★ 当前语义：录制开关只是标志位，不影响采集（已登记待 owner 拍板）', () => {
    api.startRecording();
    recordEvent('component:created');
    api.stopRecording();
    recordEvent('component:updated');

    // 停止录制后仍在采集 —— 说明开关是装饰性的；改成真门控会影响所有调用方
    expect(api.getEvents()).toHaveLength(2);
  });
});

// ==================== 时间旅行 ====================

describe('时间旅行', () => {
  it('takeSnapshot 进快照列表，restoreSnapshot 接受它', () => {
    const snap = api.takeSnapshot();

    expect(api.getSnapshots().map((s) => s.id)).toContain(snap.id);
    expect(() => api.restoreSnapshot(snap)).not.toThrow();
  });

  it('多次快照按顺序累积', () => {
    const a = api.takeSnapshot();
    const b = api.takeSnapshot();

    const ids = api.getSnapshots().map((s) => s.id);
    expect(ids).toEqual([a.id, b.id]);
  });
});

// ==================== 面板通信 ====================

describe('面板通信', () => {
  it('sendToPanel 能把消息送到 onPanelMessage 注册的处理器', () => {
    const received: unknown[] = [];
    api.onPanelMessage((m) => received.push(m));

    api.sendToPanel({ type: 'init' });

    expect(received).toHaveLength(1);
    expect((received[0] as { type: string }).type).toBe('init');
  });

  it('取消注册后不再收到', () => {
    const received: unknown[] = [];
    const off = api.onPanelMessage((m) => received.push(m));

    api.sendToPanel({ type: 'init' });
    off();
    api.sendToPanel({ type: 'init' });

    expect(received).toHaveLength(1);
  });

  it('处理器抛错不影响其它处理器，也不向外冒泡', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = vi.fn();

    api.onPanelMessage(() => {
      throw new Error('boom');
    });
    api.onPanelMessage(ok);

    expect(() => api.sendToPanel({ type: 'init' })).not.toThrow();
    expect(ok).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
  });
});
