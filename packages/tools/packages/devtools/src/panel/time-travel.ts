/**
 * @lytjs/devtools - Time Travel Debugging Panel
 *
 * Records all state changes and supports forward/backward/jump to any point in time.
 */

import type { DevToolsEvent, StateSnapshot } from '../types';
import { getEvents, subscribeEvents, clearEvents, recordEvent } from '../events';
import { getSignals, setSignalValue } from '../signals';
import { getComponentTree } from '../component-tree';
import { sendToPanel, onPanelMessage } from '../bridge';
import { takeSnapshot, restoreSnapshot, getSnapshots, deleteSnapshot } from '../snapshots';

// ===== Types =====

export interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'state-change' | 'event' | 'snapshot';
  description: string;
  data: {
    event?: DevToolsEvent;
    snapshot?: StateSnapshot;
    stateDiff?: StateDiff[];
  };
  index: number;
}

export interface StateDiff {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface TimeTravelState {
  isRecording: boolean;
  currentIndex: number;
  history: HistoryEntry[];
  maxHistorySize: number;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  history: HistoryEntry[];
  snapshots: StateSnapshot[];
  metadata: {
    totalEvents: number;
    recordingDuration: number;
    appVersion?: string;
  };
}

// ===== State =====

const timeTravelState: TimeTravelState = {
  isRecording: false,
  currentIndex: -1,
  history: [],
  maxHistorySize: 1000,
};

let recordingStartTime = 0;
let unsubscribeEvents: (() => void) | null = null;

// ===== History Recording =====

/**
 * Start recording state changes
 */
export function startHistoryRecording(): void {
  if (timeTravelState.isRecording) return;

  timeTravelState.isRecording = true;
  recordingStartTime = Date.now();

  // Subscribe to events
  unsubscribeEvents = subscribeEvents((event) => {
    const eventWithPayload = event as DevToolsEvent;
    addHistoryEntry({
      type: 'event',
      description: formatEventDescription(eventWithPayload),
      data: { event: eventWithPayload },
    });
  });

  // Record initial snapshot
  const snapshot = takeSnapshot();
  addHistoryEntry({
    type: 'snapshot',
    description: 'Initial state',
    data: { snapshot },
  });

  sendToPanel({
    type: 'TIME_TRAVEL_STATUS',
    payload: { isRecording: true, currentIndex: timeTravelState.currentIndex },
  });
}

/**
 * Stop recording state changes
 */
export function stopHistoryRecording(): void {
  if (!timeTravelState.isRecording) return;

  timeTravelState.isRecording = false;

  if (unsubscribeEvents) {
    unsubscribeEvents();
    unsubscribeEvents = null;
  }

  sendToPanel({
    type: 'TIME_TRAVEL_STATUS',
    payload: { isRecording: false, currentIndex: timeTravelState.currentIndex },
  });
}

/**
 * Add a history entry
 */
function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'index'>): void {
  const historyEntry: HistoryEntry = {
    ...entry,
    id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    index: timeTravelState.history.length,
  };

  timeTravelState.history.push(historyEntry);

  // Limit history size
  if (timeTravelState.history.length > timeTravelState.maxHistorySize) {
    timeTravelState.history.shift();
    // Re-index
    timeTravelState.history.forEach((h, i) => {
      h.index = i;
    });
  }

  // Update current index to latest
  timeTravelState.currentIndex = timeTravelState.history.length - 1;

  // Notify panel
  sendToPanel({
    type: 'HISTORY_UPDATED',
    payload: {
      entry: historyEntry,
      totalEntries: timeTravelState.history.length,
      currentIndex: timeTravelState.currentIndex,
    },
  });
}

// 定义 payload 类型接口
interface ComponentPayload {
  name?: string;
}

interface SignalPayload {
  path?: string;
}

interface StorePayload {
  type?: string;
}

interface RouterPayload {
  to?: string;
}

interface ErrorPayload {
  message?: string;
}

/**
 * Format event description
 */
function formatEventDescription(event: DevToolsEvent): string {
  switch (event.type) {
    case 'component:created':
      return `Component created: ${(event.payload as ComponentPayload)?.name || 'Unknown'}`;
    case 'component:mounted':
      return `Component mounted: ${(event.payload as ComponentPayload)?.name || 'Unknown'}`;
    case 'component:updated':
      return `Component updated: ${(event.payload as ComponentPayload)?.name || 'Unknown'}`;
    case 'component:unmounted':
      return `Component unmounted: ${(event.payload as ComponentPayload)?.name || 'Unknown'}`;
    case 'signal:changed':
      return `State changed: ${(event.payload as SignalPayload)?.path || 'Unknown'}`;
    case 'store:mutation':
      return `Store mutation: ${(event.payload as StorePayload)?.type || 'Unknown'}`;
    case 'router:navigation':
      return `Navigation: ${(event.payload as RouterPayload)?.to || 'Unknown'}`;
    case 'error:captured':
      return `Error: ${(event.payload as ErrorPayload)?.message || 'Unknown'}`;
    default:
      return `Event: ${event.type}`;
  }
}

// ===== Time Navigation =====

/**
 * Jump to a specific point in history
 */
export function jumpToHistory(index: number): boolean {
  if (index < 0 || index >= timeTravelState.history.length) {
    return false;
  }

  const entry = timeTravelState.history[index]!;
  timeTravelState.currentIndex = index;

  if (entry.data.snapshot) {
    restoreSnapshot(entry.data.snapshot);
  } else if (entry.data.event?.type === 'signal:changed') {
    interface SignalChangePayload {
      signalId?: string;
      newValue?: unknown;
    }
    const payload = entry.data.event.payload as SignalChangePayload;
    if (payload?.signalId && payload?.newValue !== undefined) {
      setSignalValue(payload.signalId, payload.newValue);
    }
  }

  sendToPanel({
    type: 'TIME_TRAVEL_JUMP',
    payload: {
      index,
      entry,
      canGoBack: index > 0,
      canGoForward: index < timeTravelState.history.length - 1,
    },
  });

  return true;
}

/**
 * Go back one step in history
 */
export function goBack(): boolean {
  if (timeTravelState.currentIndex <= 0) {
    return false;
  }
  return jumpToHistory(timeTravelState.currentIndex - 1);
}

/**
 * Go forward one step in history
 */
export function goForward(): boolean {
  if (timeTravelState.currentIndex >= timeTravelState.history.length - 1) {
    return false;
  }
  return jumpToHistory(timeTravelState.currentIndex + 1);
}

/**
 * Go to the beginning of history
 */
export function goToStart(): boolean {
  if (timeTravelState.history.length === 0) {
    return false;
  }
  return jumpToHistory(0);
}

/**
 * Go to the end of history (latest state)
 */
export function goToEnd(): boolean {
  if (timeTravelState.history.length === 0) {
    return false;
  }
  return jumpToHistory(timeTravelState.history.length - 1);
}

// ===== History Management =====

/**
 * Get all history entries
 */
export function getHistory(): HistoryEntry[] {
  return [...timeTravelState.history];
}

/**
 * Get current history index
 */
export function getCurrentIndex(): number {
  return timeTravelState.currentIndex;
}

/**
 * Clear history
 */
export function clearHistory(): void {
  timeTravelState.history = [];
  timeTravelState.currentIndex = -1;
  clearEvents();

  sendToPanel({
    type: 'HISTORY_CLEARED',
    payload: {},
  });
}

/**
 * Get history entry at index
 */
export function getHistoryEntry(index: number): HistoryEntry | undefined {
  return timeTravelState.history[index];
}

// ===== Export/Import =====

/**
 * Export history and snapshots to JSON
 */
export function exportHistory(): string {
  const exportData: ExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    history: timeTravelState.history,
    snapshots: getSnapshots(),
    metadata: {
      totalEvents: timeTravelState.history.filter(h => h.type === 'event').length,
      recordingDuration: recordingStartTime ? Date.now() - recordingStartTime : 0,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import history from JSON
 */
export function importHistory(json: string): boolean {
  try {
    const data: ExportData = JSON.parse(json);

    // Validate version
    if (!data.version || !data.history) {
      throw new Error('Invalid export format');
    }

    // Clear existing history
    clearHistory();

    // Import history
    timeTravelState.history = data.history.map((h, i) => ({
      ...h,
      index: i,
    }));
    timeTravelState.currentIndex = timeTravelState.history.length - 1;

    // Notify panel
    sendToPanel({
      type: 'HISTORY_IMPORTED',
      payload: {
        totalEntries: timeTravelState.history.length,
        currentIndex: timeTravelState.currentIndex,
      },
    });

    return true;
  } catch (error) {
    sendToPanel({
      type: 'HISTORY_IMPORT_ERROR',
      payload: { error: error instanceof Error ? error.message : String(error) },
    });
    return false;
  }
}

/**
 * Download history as file
 */
export function downloadHistory(filename?: string): void {
  // 浏览器环境检测
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
    console.warn('[DevTools TimeTravel] downloadHistory is only available in browser environment');
    return;
  }

  const data = exportHistory();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `lytjs-history-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// ===== State Comparison =====

/**
 * Compare two snapshots and return differences
 */
export function compareSnapshots(snapshot1: StateSnapshot, snapshot2: StateSnapshot): StateDiff[] {
  const diffs: StateDiff[] = [];

  // Compare signals
  const signals1 = new Map(snapshot1.signals.map(s => [s.id, s]));
  const signals2 = new Map(snapshot2.signals.map(s => [s.id, s]));

  // Find changed and added signals
  for (const [id, signal2] of signals2) {
    const signal1 = signals1.get(id);
    if (!signal1) {
      diffs.push({
        path: `signals.${signal2.name}`,
        oldValue: undefined,
        newValue: signal2.value,
      });
    } else if (JSON.stringify(signal1.value) !== JSON.stringify(signal2.value)) {
      diffs.push({
        path: `signals.${signal2.name}`,
        oldValue: signal1.value,
        newValue: signal2.value,
      });
    }
  }

  // Find removed signals
  for (const [id, signal1] of signals1) {
    if (!signals2.has(id)) {
      diffs.push({
        path: `signals.${signal1.name}`,
        oldValue: signal1.value,
        newValue: undefined,
      });
    }
  }

  return diffs;
}

/**
 * Get state diff for a history entry
 */
export function getStateDiffForEntry(index: number): StateDiff[] {
  if (index <= 0 || index >= timeTravelState.history.length) {
    return [];
  }

  const currentEntry = timeTravelState.history[index]!;
  const previousEntry = timeTravelState.history[index - 1]!;

  if (currentEntry.data.snapshot && previousEntry.data.snapshot) {
    return compareSnapshots(previousEntry.data.snapshot, currentEntry.data.snapshot);
  }

  return currentEntry.data.stateDiff || [];
}

// ===== Panel Integration =====

/**
 * Initialize time travel panel
 */
export function initTimeTravel(): () => void {
  const unsubscribe = onPanelMessage((message: unknown) => {
    const msg = message as { type: string; data?: unknown };

    switch (msg.type) {
      case 'START_TIME_TRAVEL_RECORDING':
        startHistoryRecording();
        break;

      case 'STOP_TIME_TRAVEL_RECORDING':
        stopHistoryRecording();
        break;

      case 'JUMP_TO_HISTORY':
        handleJumpToHistory(msg.data as { index: number });
        break;

      case 'GO_BACK':
        handleGoBack();
        break;

      case 'GO_FORWARD':
        handleGoForward();
        break;

      case 'GO_TO_START':
        handleGoToStart();
        break;

      case 'GO_TO_END':
        handleGoToEnd();
        break;

      case 'GET_HISTORY':
        sendToPanel({
          type: 'HISTORY_LIST',
          payload: {
            history: getHistory(),
            currentIndex: getCurrentIndex(),
            isRecording: timeTravelState.isRecording,
          },
        });
        break;

      case 'CLEAR_HISTORY':
        clearHistory();
        break;

      case 'EXPORT_HISTORY':
        handleExportHistory();
        break;

      case 'IMPORT_HISTORY':
        handleImportHistory(msg.data as { json: string });
        break;

      case 'GET_STATE_DIFF':
        handleGetStateDiff(msg.data as { index: number });
        break;
    }
  });

  return unsubscribe;
}

function handleJumpToHistory(data: { index: number } | undefined): void {
  if (data) {
    const success = jumpToHistory(data.index);
    sendToPanel({
      type: 'JUMP_RESULT',
      payload: { success, index: data.index },
    });
  }
}

function handleGoBack(): void {
  const success = goBack();
  sendToPanel({
    type: 'NAVIGATION_RESULT',
    payload: { direction: 'back', success, currentIndex: getCurrentIndex() },
  });
}

function handleGoForward(): void {
  const success = goForward();
  sendToPanel({
    type: 'NAVIGATION_RESULT',
    payload: { direction: 'forward', success, currentIndex: getCurrentIndex() },
  });
}

function handleGoToStart(): void {
  const success = goToStart();
  sendToPanel({
    type: 'NAVIGATION_RESULT',
    payload: { direction: 'start', success, currentIndex: getCurrentIndex() },
  });
}

function handleGoToEnd(): void {
  const success = goToEnd();
  sendToPanel({
    type: 'NAVIGATION_RESULT',
    payload: { direction: 'end', success, currentIndex: getCurrentIndex() },
  });
}

function handleExportHistory(): void {
  const data = exportHistory();
  sendToPanel({
    type: 'HISTORY_EXPORTED',
    payload: { json: data },
  });
}

function handleImportHistory(data: { json: string } | undefined): void {
  if (data?.json) {
    const success = importHistory(data.json);
    sendToPanel({
      type: 'HISTORY_IMPORT_RESULT',
      payload: { success },
    });
  }
}

function handleGetStateDiff(data: { index: number } | undefined): void {
  if (data) {
    const diffs = getStateDiffForEntry(data.index);
    sendToPanel({
      type: 'STATE_DIFF',
      payload: { index: data.index, diffs },
    });
  }
}

// ===== Exports =====

export {
  timeTravelState,
};
