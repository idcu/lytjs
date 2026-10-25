/**
 * @lytjs/devtools - State Editor Panel
 *
 * Provides in-panel editing of reactive state (ref/reactive/signal).
 * Changes are immediately reflected in the view.
 */

import type { SignalInfo } from '../types';
import { getComponentById } from '../component-tree';
import { setSignalValue, getSignals } from '../signals';
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
    if (
      isSignalBelongsToComponent(
        signal as Parameters<typeof isSignalBelongsToComponent>[0],
        componentId,
      )
    ) {
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
interface SignalWithComponentId extends SignalInfo {
  componentId?: string;
}

function isSignalBelongsToComponent(signal: SignalInfo, componentId: string): boolean {
  // Check for component metadata in signal
  const signalWithMeta = signal as SignalWithComponentId;
  if (signalWithMeta.componentId === componentId) {
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
export function applyStateEdit(componentId: string, path: string, value: unknown): StateEditResult {
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
      payload: {
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
 * 判断一个节点是否是 `StateValue` 包装（`{ type, value, editable, path }`）
 */
function isStateValue(node: unknown): node is StateValue {
  return (
    !!node && typeof node === 'object' && 'value' in node && 'editable' in node && 'path' in node
  );
}

/**
 * Get current value at a path
 *
 * ★ 2026-10-20 修复（两处，都在这个函数里）：
 *   ① **返回的是包装对象而不是值**：`extractComponentState()` 的 `state` 是
 *      `Record<string, StateValue>`（每项形如 `{ type, value, editable, path }`），
 *      而这里直接 `return current` ⇒ 拿到的是**包装对象**。
 *      后果：`applyStateEdit` 记录的 `oldValue` 是垃圾对象，**撤销时把这个对象写回信号**
 *      ⇒ 状态被污染（`signal.value` 变成 `{type:'ref', value:1, …}`）。
 *   ② **`props.*` 路径永远解析不到**：遍历总是从 `state` 起，而 props 在另一个字段里。
 *      修：按首段分流（`props` ⇒ 从 props 起，否则从 state 起），并在每一层解包 `StateValue`。
 */
function getStateValue(componentId: string, path: string): unknown {
  const componentState = extractComponentState(componentId);
  if (!componentState) return undefined;

  const parts = path.split('.');
  let current: unknown;

  if (parts[0] === 'props') {
    current = componentState.props;
    parts.shift();
  } else {
    current = componentState.state;
  }

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
      // 顶层 state / props 的每项都是 StateValue 包装 ⇒ 解包出真实值
      if (isStateValue(current)) current = current.value;
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
    if (
      isSignalBelongsToComponent(
        signal as Parameters<typeof isSignalBelongsToComponent>[0],
        componentId,
      )
    ) {
      const stateName = component
        ? signal.name.substring(component.name.length + 1) // 使用 substring 而不是 replace
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
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): boolean {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    // ★ 2026-10-20 修复：必须显式排除 `null`。
    //   `typeof null === 'object'` ⇒ 原判断认为"已经是对象"，直接把 current 置成 `null`
    //   ⇒ 下一层赋值 `null[last] = value` 抛 `TypeError: Cannot set properties of null`
    //   （面板里改一个 null 字段的子属性就崩）。
    if (!(part in current) || current[part] === null || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1]!;
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
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'null' ||
    /^-?\d+(\.\d+)?$/.test(trimmed)
  ) {
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
    // ★ 2026-10-25：`BridgeMessage` 的负载字段是 **`payload`**，此前读 `data`
    //   ⇒ `GET_COMPONENT_STATE` / `EDIT_STATE` 拿到的都是 undefined，
    //   前者被 `if (!data?.componentId) return;` 吞掉（**连回包都没有**），后者直接 return。
    //   （与 performance / time-travel 面板同款，属「同一缺陷只修一处」的典型）
    const raw = message as { type: string; payload?: unknown; data?: unknown };
    const msg = { type: raw.type, data: raw.payload ?? raw.data };

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
          payload: getEditHistory(),
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
    payload: state,
  });
}

function handleEditState(data: StateEditMessage | undefined): void {
  if (!data) return;

  const result = applyStateEdit(data.componentId, data.path, data.value);
  sendToPanel({
    type: 'STATE_EDIT_RESULT',
    payload: {
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
    payload: result,
  });
}

// ===== Exports =====

export { editorState };
