/**
 * @lytjs/devtools - Public API implementation
 */

import type { DevToolsAPI, DevToolsState, EventType, StateSnapshot, ComponentTreeNode, SignalInfo, DevToolsEvent } from './types';
import { getState, enable, disable } from './state';
import { getComponentTree, getComponentById } from './component-tree';
import { getSignals, getSignalById } from './signals';
import { startRecording as startEventRecording, stopRecording as stopEventRecording, getEvents, clearEvents } from './events';
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
      const signalInfo = getSignalById(id);
      return signalInfo?.value;
    },
    startRecording(): void {
      startEventRecording();
    },
    stopRecording(): void {
      stopEventRecording();
    },
    getEvents(filter?: EventType[]): DevToolsEvent[] {
      const allEvents = getEvents() as unknown as DevToolsEvent[];
      if (!filter) return allEvents;
      return allEvents.filter((e) => filter.includes(e.type as EventType));
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
