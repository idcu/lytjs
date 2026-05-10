/**
 * @lytjs/devtools - State Editor Panel
 *
 * Provides in-panel editing of reactive state (ref/reactive/signal).
 * Changes are immediately reflected in the view.
 */

import type { SignalInfo } from '../types';
import { getSignalById, setSignalValue, getSignals } from '../signals';
import { getComponentById } from '../component-tree';
import { sendToPanel, onPanelMessage } from '../bridge';
import { recordEvent } from '../events';

// ===== Types =====

export interface StateEditMessage {
  type: 'edit-state';
  componentId: string;
  path: string;
  value: unknown;
}

export interface StateEditResult {
  success: boolean;
  error?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface ComponentState {
  componentId: string;
  componentName: string;
  state: Record<string, StateValue>;
  props: Record<string, StateValue>;
}

export interface StateValue {
  type: 'ref' | 'reactive' | 'computed' | 'signal' | 'primitive';
  value: unknown;
  editable: boolean;
  path: string;
}

// ===== State Editor State =====

interface EditorState {
  selectedComponentId: string | null;
  expandedPaths: Set<string>;
  editHistory: StateEditRecord[];
}

interface StateEditRecord {
  id: string;
  timestamp: number;
  componentId: string;
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

const editorState: EditorState = {
  selectedComponentId: null,
  expandedPaths: new Set(),
  editHistory: [],
};

// ===== Component State Extraction =====

/**
 * Extract state from a component instance
 */
export function extractComponentState(componentId: string): ComponentState | null {
  const component = getComponentById(componentId);
  if (!component) return null;

  const state: Record<string, StateValue> = {};
  const props: Record<string, StateValue> = {};

  // Extract props
  for (const [key, value] of Object.entries(component.props || {})) {
    props[key] = {
      type: 'primitive',
      value,
      editable: true,
      path: `props.${key}`,
    };
  }

  // Extract signals associated with this component
  const signals = getSignals();
  for (const signal of signals) {
    // Check if signal belongs to this component (by naming convention or metadata)
    if (isSignalBelongsToComponent(signal, componentId)) {
      state[signal.name] = {
        type: signal.type,
        value: signal.value,
        editable: signal.type !== 'computed',
        path: signal.name,
      };
    }
  }

  return {
    componentId,
    componentName: component.name,
    state,
    props,
  };
}

/**
 * Check if a signal belongs to a component
 * This uses heuristics: signal name prefix or metadata
 */
function isSignalBelongsToComponent(signal: SignalInfo, componentId: string): boolean {
  // Check for component metadata in signal
  if ((signal as any).componentId === componentId) {
    return true;
  }

  // Check naming convention: componentName_stateName
  const component = getComponentById(componentId);
  if (component && signal.name.startsWith(`${component.name}_`)) {
    return true;
  }

  return false;
}

// ===== State Editing =====

/**
 * Apply a state edit to a component
 */
export function applyStateEdit(
  componentId: string,
  path: string,
  value: unknown,
): StateEditResult {
  try {
    // Get current value for history
    const oldValue = getStateValue(componentId, path);

    // Find the signal to update
    const signalId = findSignalIdForPath(componentId, path);
    if (!signalId) {
      return {
        success: false,
        error: `Signal not found for path: ${path}`,
      };
    }

    // Update the signal value
    const success = setSignalValue(signalId, value);
    if (!success) {
      return {
        success: false,
        error: 'Failed to set signal value',
      };
    }

    // Record in history
    const record: StateEditRecord = {
      id: `edit-${Date.now()}`,
      timestamp: Date.now(),
      componentId,
      path,
      oldValue,
      newValue: value,
    };
    editorState.editHistory.push(record);

    // Record event for time travel
    recordEvent('signal:changed', {
      signalId,
      path,
      oldValue,
      newValue: value,
      componentId,
    });

    // Notify panel of the change
    sendToPanel({
      type: 'STATE_EDITED',
      data: {
        componentId,
        path,
        oldValue,
        newValue: value,
        timestamp: record.timestamp,
      },
    });

    return {
      success: true,
      oldValue,
      newValue: value,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get current value at a path
 */
function getStateValue(componentId: string, path: string): unknown {
  const componentState = extractComponentState(componentId);
  if (!componentState) return undefined;

  const parts = path.split('.');
  let current: unknown = componentState.state;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Find signal ID for a given path
 */
function findSignalIdForPath(componentId: string, path: string): string | null {
  const signals = getSignals();
  const component = getComponentById(componentId);

  for (const signal of signals) {
    // Match by component association and path
    if (isSignalBelongsToComponent(signal, componentId)) {
      const stateName = component
        ? signal.name.replace(`${component.name}_`, '')
        : signal.name;
      if (stateName === path || signal.name === path) {
        return signal.id;
      }
    }
  }

  return null;
}

// ===== Nested State Editing =====

/**
 * Set a nested value in an object by path
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): boolean {
  const parts = path.split('.');
  let current: any = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
  return true;
}

/**
 * Get a nested value from an object by path
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

// ===== Value Parsing =====

/**
 * Parse user input into appropriate type
 */
export function parseValue(input: string, targetType: string): unknown {
  const trimmed = input.trim();

  // Try to parse as JSON first
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      trimmed === 'true' ||
      trimmed === 'false' ||
      trimmed === 'null' ||
      /^-?\d+(\.\d+)?$/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to string
    }
  }

  // Handle special types
  switch (targetType) {
    case 'number':
      return parseFloat(trimmed) || 0;
    case 'boolean':
      return trimmed === 'true' || trimmed === '1';
    case 'string':
    default:
      return trimmed;
  }
}

/**
 * Format value for display
 */
export function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'function') return 'ƒ()';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '{...}';
    }
  }
  return String(value);
}

// ===== History Management =====

/**
 * Get edit history
 */
export function getEditHistory(): StateEditRecord[] {
  return [...editorState.editHistory];
}

/**
 * Clear edit history
 */
export function clearEditHistory(): void {
  editorState.editHistory = [];
}

/**
 * Undo last edit (if possible)
 */
export function undoLastEdit(): StateEditResult {
  const lastEdit = editorState.editHistory.pop();
  if (!lastEdit) {
    return { success: false, error: 'No edits to undo' };
  }

  return applyStateEdit(lastEdit.componentId, lastEdit.path, lastEdit.oldValue);
}

// ===== Panel Integration =====

/**
 * Initialize state editor panel
 */
export function initStateEditor(): () => void {
  // Listen for messages from panel
  const unsubscribe = onPanelMessage((message: unknown) => {
    const msg = message as { type: string; data?: unknown };

    switch (msg.type) {
      case 'GET_COMPONENT_STATE':
        handleGetComponentState(msg.data as { componentId: string });
        break;

      case 'EDIT_STATE':
        handleEditState(msg.data as StateEditMessage);
        break;

      case 'GET_EDIT_HISTORY':
        sendToPanel({
          type: 'EDIT_HISTORY',
          data: getEditHistory(),
        });
        break;

      case 'UNDO_LAST_EDIT':
        handleUndoLastEdit();
        break;
    }
  });

  return unsubscribe;
}

function handleGetComponentState(data: { componentId: string } | undefined): void {
  if (!data?.componentId) return;

  const state = extractComponentState(data.componentId);
  sendToPanel({
    type: 'COMPONENT_STATE',
    data: state,
  });
}

function handleEditState(data: StateEditMessage | undefined): void {
  if (!data) return;

  const result = applyStateEdit(data.componentId, data.path, data.value);
  sendToPanel({
    type: 'STATE_EDIT_RESULT',
    data: {
      ...result,
      componentId: data.componentId,
      path: data.path,
    },
  });
}

function handleUndoLastEdit(): void {
  const result = undoLastEdit();
  sendToPanel({
    type: 'UNDO_RESULT',
    data: result,
  });
}

// ===== Exports =====

export {
  editorState,
};
