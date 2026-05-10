/**
 * @lytjs/devtools - DevTools Panel Integration
 *
 * Integrates all DevTools panel modules:
 * - State Editor: Edit reactive state directly in DevTools
 * - Time Travel: Record and replay state changes
 * - Performance: Monitor component render performance
 */

import type { DevToolsAPI, DevToolsState, ComponentTreeNode, SignalInfo, StateSnapshot, DevToolsEvent } from '../types';
import { initStateEditor, type StateEditMessage, type StateEditResult, type ComponentState } from './state-editor';
import { initTimeTravel, type HistoryEntry, type StateDiff, type ExportData } from './time-travel';
import {
  initPerformancePanel,
  recordComponentRender,
  type ComponentPerformance,
  type PerformanceMetrics,
  type RenderHeatmapData,
  type PerformanceConfig,
} from './performance';
import { sendToPanel, onPanelMessage } from '../bridge';
import { getState, enable, disable, setConnected } from '../state';
import { getComponentTree, getComponentById } from '../component-tree';
import { getSignals, getSignalById } from '../signals';
import { takeSnapshot, getSnapshots, restoreSnapshot } from '../snapshots';
import { startRecording, stopRecording, getEvents, clearEvents } from '../events';

// ===== Panel State =====

interface PanelState {
  isInitialized: boolean;
  activeTab: 'components' | 'state' | 'time-travel' | 'performance' | 'events';
  selectedComponentId: string | null;
  isRecording: boolean;
}

const panelState: PanelState = {
  isInitialized: false,
  activeTab: 'components',
  selectedComponentId: null,
  isRecording: false,
};

// Cleanup functions for panel modules
const cleanupFunctions: Array<() => void> = [];

// ===== Initialization =====

/**
 * Initialize the DevTools panel
 * This should be called when the DevTools panel is opened
 */
export function initDevToolsPanel(): void {
  if (panelState.isInitialized) {
    console.log('[LytJS DevTools] Panel already initialized');
    return;
  }

  console.log('[LytJS DevTools] Initializing panel...');

  // Enable DevTools
  enable();
  setConnected(true);

  // Initialize panel modules
  cleanupFunctions.push(initStateEditor());
  cleanupFunctions.push(initTimeTravel());
  cleanupFunctions.push(initPerformancePanel());
  cleanupFunctions.push(initPanelMessageHandler());

  panelState.isInitialized = true;

  // Send initial data to panel
  sendInitialData();

  console.log('[LytJS DevTools] Panel initialized');
}

/**
 * Cleanup the DevTools panel
 * This should be called when the DevTools panel is closed
 */
export function cleanupDevToolsPanel(): void {
  if (!panelState.isInitialized) return;

  console.log('[LytJS DevTools] Cleaning up panel...');

  // Run all cleanup functions
  cleanupFunctions.forEach(cleanup => cleanup());
  cleanupFunctions.length = 0;

  // Disable DevTools
  setConnected(false);

  panelState.isInitialized = false;

  console.log('[LytJS DevTools] Panel cleaned up');
}

/**
 * Initialize panel message handler
 */
function initPanelMessageHandler(): () => void {
  return onPanelMessage((message: unknown) => {
    const msg = message as { type: string; data?: unknown };

    switch (msg.type) {
      // Tab switching
      case 'SWITCH_TAB':
        handleSwitchTab(msg.data as { tab: PanelState['activeTab'] });
        break;

      // Component selection
      case 'SELECT_COMPONENT':
        handleSelectComponent(msg.data as { componentId: string });
        break;

      // Recording control
      case 'START_RECORDING':
        handleStartRecording();
        break;

      case 'STOP_RECORDING':
        handleStopRecording();
        break;

      // Refresh data
      case 'REFRESH_DATA':
        sendInitialData();
        break;

      // Get all data
      case 'GET_ALL_DATA':
        sendAllData();
        break;
    }
  });
}

// ===== Message Handlers =====

function handleSwitchTab(data: { tab: PanelState['activeTab'] } | undefined): void {
  if (data?.tab) {
    panelState.activeTab = data.tab;
    sendToPanel({
      type: 'TAB_SWITCHED',
      data: { tab: data.tab },
    });
  }
}

function handleSelectComponent(data: { componentId: string } | undefined): void {
  if (data?.componentId) {
    panelState.selectedComponentId = data.componentId;

    // Get component details
    const component = getComponentById(data.componentId);
    const componentState = extractComponentStateForPanel(data.componentId);

    sendToPanel({
      type: 'COMPONENT_SELECTED',
      data: {
        component,
        state: componentState,
      },
    });
  }
}

function handleStartRecording(): void {
  panelState.isRecording = true;
  startRecording();
  sendToPanel({
    type: 'RECORDING_STATUS',
    data: { isRecording: true },
  });
}

function handleStopRecording(): void {
  panelState.isRecording = false;
  stopRecording();
  sendToPanel({
    type: 'RECORDING_STATUS',
    data: { isRecording: false },
  });
}

// ===== Data Extraction =====

/**
 * Extract component state for panel display
 */
function extractComponentStateForPanel(componentId: string): {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  signals: SignalInfo[];
} | null {
  const component = getComponentById(componentId);
  if (!component) return null;

  // Get all signals and filter by component
  const allSignals = getSignals();
  const componentSignals = allSignals.filter(signal => {
    // Match by component name prefix or metadata
    return signal.name.startsWith(`${component.name}_`) ||
           (signal as any).componentId === componentId;
  });

  return {
    props: component.props || {},
    state: {}, // Would be populated from component internals
    signals: componentSignals,
  };
}

// ===== Data Sending =====

/**
 * Send initial data to panel
 */
function sendInitialData(): void {
  sendToPanel({
    type: 'INITIAL_DATA',
    data: {
      state: getState(),
      componentTree: getComponentTree(),
      signals: getSignals(),
      snapshots: getSnapshots(),
      events: getEvents(),
    },
  });
}

/**
 * Send all data to panel
 */
function sendAllData(): void {
  sendToPanel({
    type: 'ALL_DATA',
    data: {
      state: getState(),
      componentTree: getComponentTree(),
      signals: getSignals(),
      snapshots: getSnapshots(),
      events: getEvents(),
      selectedComponentId: panelState.selectedComponentId,
      isRecording: panelState.isRecording,
    },
  });
}

// ===== Public API for Panel Integration =====

/**
 * Get panel state
 */
export function getPanelState(): Readonly<PanelState> {
  return { ...panelState };
}

/**
 * Check if panel is initialized
 */
export function isPanelInitialized(): boolean {
  return panelState.isInitialized;
}

/**
 * Set active tab
 */
export function setActiveTab(tab: PanelState['activeTab']): void {
  panelState.activeTab = tab;
  sendToPanel({
    type: 'TAB_SWITCHED',
    data: { tab },
  });
}

/**
 * Get active tab
 */
export function getActiveTab(): PanelState['activeTab'] {
  return panelState.activeTab;
}

// ===== Re-exports from panel modules =====

// State Editor
export {
  initStateEditor,
  applyStateEdit,
  extractComponentState,
  getEditHistory,
  clearEditHistory,
  undoLastEdit,
  parseValue,
  formatValue,
  type StateEditMessage,
  type StateEditResult,
  type ComponentState,
} from './state-editor';

// Time Travel
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
  type HistoryEntry,
  type StateDiff,
  type ExportData,
} from './time-travel';

// Performance
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
  type ComponentPerformance,
  type PerformanceMetrics,
  type RenderHeatmapData,
  type PerformanceConfig,
} from './performance';

// ===== Default Export =====

export default {
  init: initDevToolsPanel,
  cleanup: cleanupDevToolsPanel,
  getState: getPanelState,
  isInitialized: isPanelInitialized,
  setActiveTab,
  getActiveTab,
};
