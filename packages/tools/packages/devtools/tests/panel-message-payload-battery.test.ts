/**
 * 面板消息的**负载字段**：`payload` vs `data`。
 *
 * `BridgeMessage` 的定义是 `{ type, payload?, timestamp? }`（见 `src/bridge.ts`），
 * 但三个面板的处理器都曾按 `msg.data` 取参数 ⇒ **所有带参数的命令静默失效**：
 * - `time-travel`：跳转/导入/取 diff（2026-10-24 已修）
 * - `performance`：取组件指标 / 更新配置（2026-10-25 修）
 * - `state-editor`：取组件状态 / 编辑状态（2026-10-25 修）
 * - `panel/index`：切页签 / 选组件（2026-10-25 修）
 *
 * 本文件守最后两处（前两处各自的电池已覆盖），并统一验证**旧 `data` 写法仍兼容**。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { onPanelMessage, sendToPanel } from '../src/bridge';
import { initStateEditor, clearEditHistory } from '../src/panel/state-editor';
import {
  initDevToolsPanel,
  cleanupDevToolsPanel,
  getPanelState,
  setActiveTab,
} from '../src/panel/index';

function capturePanel(): { messages: Array<{ type: string; payload?: unknown }>; off: () => void } {
  const messages: Array<{ type: string; payload?: unknown }> = [];
  const off = onPanelMessage((m) => messages.push(m as { type: string; payload?: unknown }));
  return { messages, off };
}

let offs: Array<() => void> = [];

beforeEach(() => {
  offs = [];
  clearEditHistory();
});

afterEach(() => {
  for (const off of offs) off();
  offs = [];
  cleanupDevToolsPanel();
  vi.restoreAllMocks();
});

describe('state-editor 面板命令', () => {
  it('★ GET_COMPONENT_STATE 必须读到 payload.componentId（此前读 msg.data ⇒ 连回包都没有）', () => {
    const off = initStateEditor();
    offs.push(off);
    const cap = capturePanel();
    offs.push(cap.off);

    sendToPanel({ type: 'GET_COMPONENT_STATE', payload: { componentId: 'ghost' } });

    const msg = cap.messages.find((m) => m.type === 'COMPONENT_STATE');
    expect(msg).toBeDefined();
    // 组件不存在 ⇒ payload 为 null，但**回包必须发出**（证明处理器真的执行了）
    expect(msg!.payload).toBeNull();
  });

  it('★ EDIT_STATE 必须读到 payload（此前读 msg.data ⇒ 直接 return）', () => {
    const off = initStateEditor();
    offs.push(off);
    const cap = capturePanel();
    offs.push(cap.off);

    sendToPanel({
      type: 'EDIT_STATE',
      payload: { componentId: 'ghost', path: 'count', value: 1 },
    });

    const msg = cap.messages.find((m) => m.type === 'STATE_EDIT_RESULT');
    expect(msg).toBeDefined();
    expect(msg!.payload).toMatchObject({ componentId: 'ghost', path: 'count' });
  });

  it('旧的 data 字段仍被接受（向后兼容）', () => {
    const off = initStateEditor();
    offs.push(off);
    const cap = capturePanel();
    offs.push(cap.off);

    sendToPanel({ type: 'GET_COMPONENT_STATE', data: { componentId: 'legacy' } } as never);

    expect(cap.messages.some((m) => m.type === 'COMPONENT_STATE')).toBe(true);
  });
});

describe('panel/index 的命令', () => {
  it('★ SWITCH_TAB 必须读到 payload.tab（此前读 msg.data ⇒ 页签纹丝不动）', () => {
    initDevToolsPanel();
    setActiveTab('components');

    sendToPanel({ type: 'SWITCH_TAB', payload: { tab: 'performance' } });

    expect(getPanelState().activeTab).toBe('performance');
  });

  it('★ SELECT_COMPONENT 必须读到 payload.componentId', () => {
    initDevToolsPanel();

    sendToPanel({ type: 'SELECT_COMPONENT', payload: { componentId: 'comp-42' } });

    expect(getPanelState().selectedComponentId).toBe('comp-42');
  });

  it('旧的 data 字段仍被接受（向后兼容）', () => {
    initDevToolsPanel();

    sendToPanel({ type: 'SWITCH_TAB', data: { tab: 'timeline' } } as never);

    expect(getPanelState().activeTab).toBe('timeline');
  });

  it('payload 不是对象时忽略，不抛错', () => {
    initDevToolsPanel();
    setActiveTab('components');

    expect(() => sendToPanel({ type: 'SWITCH_TAB', payload: 'nope' })).not.toThrow();
    expect(getPanelState().activeTab).toBe('components');
  });
});
