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
  clearStateSubscribers,
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
  buildComponentTree,
  getAllComponents,
  getRootComponents,
  clearComponents,
  autoRegisterFromInstance,
} from './component-tree';
export type { ComponentInstance } from './component-tree';

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
  getSignalsByComponent,
  clearSignals,
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
  getEventsByComponent,
  getEventsByType,
  getEventStats,
  setMaxEvents,
} from './events';

// Snapshots
export {
  takeSnapshot,
  getSnapshots,
  getSnapshotById,
  restoreSnapshot,
  deleteSnapshot,
  clearSnapshots,
  createSnapshot,
  getSnapshot,
  getAllSnapshots,
  exportSnapshots,
  importSnapshots,
} from './snapshots';

// Bridge
export {
  isBridgeActive,
  activateBridge,
  deactivateBridge,
  sendToPanel,
  onPanelMessage,
  broadcastToPanel,
  clearHandlers,
} from './bridge';

// API
export { createDevToolsAPI } from './api';

// Store Integration
export {
  trackStoreMutation,
  registerStoreSignals,
  unregisterStoreSignals,
} from './store-integration';

// Router Integration
export { trackRouterNavigation } from './router-integration';

// Panel
export {
  initDevToolsPanel,
  cleanupDevToolsPanel,
  getPanelState,
  isPanelInitialized,
  setActiveTab,
  getActiveTab,
} from './panel';

// State Editor (from panel)
export {
  initStateEditor,
  applyStateEdit,
  extractComponentState,
  getEditHistory,
  clearEditHistory,
  undoLastEdit,
  parseValue,
  formatValue,
  setNestedValue,
  getNestedValue,
} from './panel/state-editor';

// Time Travel (from panel)
export {
  initTimeTravel,
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
  exportHistory,
  importHistory,
  downloadHistory,
  compareSnapshots,
  getStateDiffForEntry,
} from './panel/time-travel';

// Performance (from panel)
export {
  initPerformancePanel,
  recordComponentRender,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  isPerformanceMonitoring,
  getComponentPerformance,
  getAllComponentPerformance,
  getRenderHeatmap,
  getPerformanceTimeline,
  getMemoryTrend,
  clearComponentPerformance,
  clearPerformanceTimeline,
  updatePerformanceConfig,
  getPerformanceConfig,
  suggestGarbageCollection,
} from './panel/performance';

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
