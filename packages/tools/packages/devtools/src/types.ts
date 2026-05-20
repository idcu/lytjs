/**
 * @lytjs/devtools - Type definitions
 */



// ===== DevTools State =====

export interface DevToolsState {
  enabled: boolean;
  connected: boolean;
  recording: boolean;
}

// ===== Component Tree =====

export interface ComponentTreeNode {
  id: string;
  name: string;
  type: 'component' | 'fragment' | 'text' | 'comment';
  children: ComponentTreeNode[];
  props: Record<string, unknown>;
  emits: string[];
  slots: string[];
  parent?: string;
}

// ===== Signal Inspection =====

export interface SignalInfo {
  id: string;
  name: string;
  value: unknown;
  type: 'ref' | 'reactive' | 'computed' | 'signal';
  dependencies: string[];
  dependents: string[];
}

export interface StoreInspection {
  id: string;
  name: string;
  state: Record<string, unknown>;
  getters: Record<string, unknown>;
}

// ===== Event Recording =====

export type EventType =
  | 'component:created'
  | 'component:mounted'
  | 'component:updated'
  | 'component:unmounted'
  | 'signal:changed'
  | 'store:mutation'
  | 'router:navigation'
  | 'error:captured';

export interface DevToolsEvent {
  id: string;
  type: EventType;
  timestamp: number;
  payload: unknown;
  componentId?: string;
}

// ===== Time Travel =====

export interface StateSnapshot {
  id: string;
  timestamp: number;
  components: ComponentTreeNode[];
  signals: SignalInfo[];
  events: DevToolsEvent[];
}

// ===== DevTools API =====

export interface DevToolsHook {
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, handler: (payload?: unknown) => void) => void;
  off: (event: string, handler: (payload?: unknown) => void) => void;
}

export interface DevToolsPlugin {
  name: string;
  setup: (api: DevToolsAPI) => void | (() => void);
}

export interface DevToolsAPI {
  // State
  getState(): DevToolsState;
  enable(): void;
  disable(): void;

  // Component Tree
  getComponentTree(): ComponentTreeNode[];
  getComponentById(id: string): ComponentTreeNode | undefined;

  // Signal Inspection
  getSignals(): SignalInfo[];
  getSignalValue(id: string): unknown;

  // Event Recording
  startRecording(): void;
  stopRecording(): void;
  getEvents(filter?: EventType[]): DevToolsEvent[];
  clearEvents(): void;

  // Time Travel
  takeSnapshot(): StateSnapshot;
  restoreSnapshot(snapshot: StateSnapshot): void;
  getSnapshots(): StateSnapshot[];

  // Communication
  sendToPanel(message: unknown): void;
  onPanelMessage(handler: (message: unknown) => void): () => void;
}
