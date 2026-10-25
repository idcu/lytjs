/**
 * @lytjs/devtools - Public API implementation
 */

import type {
  DevToolsAPI,
  DevToolsState,
  EventType,
  StateSnapshot,
  ComponentTreeNode,
  SignalInfo,
  DevToolsEvent,
} from './types';
import { getState, enable, disable } from './state';
import { getComponentTree, getComponentById } from './component-tree';
import { getSignals, getSignalValue as readSignalValue } from './signals';
import {
  startRecording as startEventRecording,
  stopRecording as stopEventRecording,
  getEvents,
  clearEvents,
} from './events';
import { takeSnapshot, restoreSnapshot, getSnapshots } from './snapshots';
import { sendToPanel, onPanelMessage } from './bridge';

export function createDevToolsAPI(): DevToolsAPI {
  return {
    getState(): DevToolsState {
      return getState();
    },
    enable(): void {
      enable();
    },
    disable(): void {
      disable();
    },
    getComponentTree(): ComponentTreeNode[] {
      return getComponentTree() as unknown as ComponentTreeNode[];
    },
    getComponentById(id: string): ComponentTreeNode | undefined {
      return getComponentById(id) as unknown as ComponentTreeNode | undefined;
    },
    getSignals(): SignalInfo[] {
      return getSignals() as unknown as SignalInfo[];
    },
    getSignalValue(id: string): unknown {
      // ★ 2026-10-25：改为一律转发 `signals.getSignalValue`。此前在门面上**又写了一遍**
      //   `getSignalById(id)?.value`（ADR 0011：同一能力只留一处实现）——一旦底层改成
      //   解包 ref / 处理 computed，门面这条就会悄悄与它分叉。
      return readSignalValue(id);
    },
    startRecording(): void {
      startEventRecording();
    },
    stopRecording(): void {
      stopEventRecording();
    },
    getEvents(filter?: EventType[]): DevToolsEvent[] {
      // ★ 2026-10-25：转发底层已有的类型白名单。此前是「先全量取出、再自己 filter」——
      //   而 `events.getEvents(types)` 的注释正写着「此前只支持全量返回，调用方只能自己
      //   再 filter 一遍」，等于把刚补上的能力又绕过了一次。
      return getEvents(filter) as unknown as DevToolsEvent[];
    },
    clearEvents(): void {
      clearEvents();
    },
    takeSnapshot(): StateSnapshot {
      return takeSnapshot();
    },
    restoreSnapshot(snapshot: StateSnapshot): void {
      restoreSnapshot(snapshot);
    },
    getSnapshots(): StateSnapshot[] {
      return getSnapshots();
    },
    sendToPanel(message: object): void {
      sendToPanel(message as Parameters<typeof sendToPanel>[0]);
    },
    onPanelMessage(handler: (message: object) => void): () => void {
      return onPanelMessage(handler as Parameters<typeof onPanelMessage>[0]);
    },
  };
}
