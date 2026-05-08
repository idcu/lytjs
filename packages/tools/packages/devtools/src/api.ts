/**
 * @lytjs/devtools - Public API implementation
 *
 * Provides the main DevToolsAPI for consumers.
 */

import type { DevToolsAPI, DevToolsState, EventType, StateSnapshot, ComponentTreeNode, SignalInfo } from './types';
import { getState, enable, disable, subscribeState } from './state';
import {
  getComponentTree,
  getComponentById,
} from './component-tree';
import {
  getSignals,
  getSignalById,
} from './signals';
import {
  startRecording as startEventRecording,
  stopRecording as stopEventRecording,
  getEvents,
  clearEvents,
} from './events';
import {
  takeSnapshot,
  restoreSnapshot,
  getSnapshots,
} from './snapshots';
import {
  sendToPanel,
  onPanelMessage,
} from './bridge';

/**
 * Create the DevTools API
 */
export function createDevToolsAPI(): DevToolsAPI {
  return {
    // State
    getState(): DevToolsState {
      return getState();
    },
    enable(): void {
      enable();
    },
    disable(): void {
      disable();
    },

    // Component Tree
    getComponentTree(): ComponentTreeNode[] {
      return getComponentTree();
    },
    getComponentById(id: string): ComponentTreeNode | undefined {
      return getComponentById(id);
    },

    // Signal Inspection
    getSignals(): SignalInfo[] {
      return getSignals();
    },
    getSignalValue(id: string): unknown {
      const signalInfo = getSignalById(id);
      return signalInfo?.value;
    },

    // Event Recording
    startRecording(): void {
      startEventRecording();
    },
    stopRecording(): void {
      stopEventRecording();
    },
    getEvents(filter?: EventType[]) {
      const allEvents = getEvents();
      if (!filter) return allEvents;
      return allEvents.filter((e) => filter.includes(e.type));
    },
    clearEvents(): void {
      clearEvents();
    },

    // Time Travel
    takeSnapshot(): StateSnapshot {
      return takeSnapshot();
    },
    restoreSnapshot(snapshot: StateSnapshot): void {
      restoreSnapshot(snapshot);
    },
    getSnapshots(): StateSnapshot[] {
      return getSnapshots();
    },

    // Communication
    sendToPanel(message: unknown): void {
      sendToPanel(message);
    },
    onPanelMessage(handler: (message: unknown) => void): () => void {
      return onPanelMessage(handler);
    },
  };
}
