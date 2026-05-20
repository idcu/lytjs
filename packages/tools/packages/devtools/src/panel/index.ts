/**
 * @lytjs/devtools - DevTools Panel Integration
 */

import { initStateEditor } from './state-editor';
import {
  initTimeTravel,
  startHistoryRecording,
  stopHistoryRecording,
  getHistory,
  getCurrentIndex,
} from './time-travel';
import {
  initPerformancePanel,
  recordComponentRender,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
} from './performance';
import { sendToPanel, onPanelMessage } from '../bridge';
import { getState, enable, setConnected } from '../state';
import { getComponentTree } from '../component-tree';
import { getSignals } from '../signals';
import { getSnapshots } from '../snapshots';
import { startRecording, stopRecording, getEvents } from '../events';

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

const cleanupFunctions: Array<() => void> = [];

export function initDevToolsPanel(): void {
  if (panelState.isInitialized) return;

  enable();
  setConnected(true);

  cleanupFunctions.push(initStateEditor());
  cleanupFunctions.push(initTimeTravel());
  cleanupFunctions.push(initPerformancePanel());
  cleanupFunctions.push(initPanelMessageHandler());

  panelState.isInitialized = true;
  sendInitialData();
}

export function cleanupDevToolsPanel(): void {
  if (!panelState.isInitialized) return;

  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions.length = 0;
  setConnected(false);
  panelState.isInitialized = false;
}

function initPanelMessageHandler(): () => void {
  return onPanelMessage((message: unknown) => {
    const msg = message as { type: string; data?: unknown };
    switch (msg.type) {
      case 'SWITCH_TAB':
        if (msg.data && typeof msg.data === 'object') {
          panelState.activeTab = (msg.data as { tab: PanelState['activeTab'] }).tab;
        }
        break;
      case 'SELECT_COMPONENT':
        if (msg.data && typeof msg.data === 'object') {
          panelState.selectedComponentId = (msg.data as { componentId: string }).componentId;
        }
        break;
      case 'START_RECORDING':
        panelState.isRecording = true;
        startRecording();
        break;
      case 'STOP_RECORDING':
        panelState.isRecording = false;
        stopRecording();
        break;
      case 'REFRESH_DATA':
      case 'GET_ALL_DATA':
        sendInitialData();
        break;
    }
  });
}

function sendInitialData(): void {
  sendToPanel({
    type: 'INITIAL_DATA',
    payload: {
      state: getState(),
      componentTree: getComponentTree(),
      signals: getSignals(),
      snapshots: getSnapshots(),
      events: getEvents(),
    },
  } as unknown as Parameters<typeof sendToPanel>[0]);
}

export function getPanelState(): Readonly<PanelState> {
  return { ...panelState };
}

export function isPanelInitialized(): boolean {
  return panelState.isInitialized;
}

export function setActiveTab(tab: PanelState['activeTab']): void {
  panelState.activeTab = tab;
}

export function getActiveTab(): PanelState['activeTab'] {
  return panelState.activeTab;
}

export {
  initStateEditor,
  initTimeTravel,
  initPerformancePanel,
  recordComponentRender,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  startHistoryRecording,
  stopHistoryRecording,
  getHistory,
  getCurrentIndex,
};
