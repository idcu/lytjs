/**
 * @lytjs/devtools
 *
 * LytJS browser DevTools extension backend for debugging LytJS applications.
 *
 * @packageDocumentation
 */

// State
export { 
  getState, 
  enable, 
  disable, 
  setConnected,
  startRecording as startStateRecording,
  stopRecording as stopStateRecording,
  subscribeState,
} from './state';

// Component Tree
export {
  generateComponentId,
  registerComponent,
  unregisterComponent,
  getComponentTree,
  getComponentById,
  getComponentCount,
  clearComponentRegistry,
} from './component-tree';

// Signals
export {
  generateSignalId,
  registerSignal,
  unregisterSignal,
  getSignals,
  getSignalValue,
  getSignalById,
  setSignalValue,
  clearSignalRegistry,
} from './signals';

// Events
export {
  startRecording as startEventRecording,
  stopRecording as stopEventRecording,
  isEventRecording,
  recordEvent,
  getEvents,
  clearEvents,
  subscribeEvents,
  getEventCount,
} from './events';

// Snapshots
export {
  takeSnapshot,
  getSnapshots,
  getSnapshotById,
  restoreSnapshot,
  deleteSnapshot,
  clearSnapshots,
} from './snapshots';

// Bridge
export {
  isBridgeActive,
  activateBridge,
  deactivateBridge,
  sendToPanel,
  onPanelMessage,
} from './bridge';

// Types
export type {
  DevToolsState,
  ComponentTreeNode,
  SignalInfo,
  StoreInspection,
  EventType,
  DevToolsEvent,
  StateSnapshot,
  DevToolsHook,
  DevToolsPlugin,
  DevToolsAPI,
} from './types';
