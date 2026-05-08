/**
 * @lytjs/devtools - DevTools state management
 */

import type { DevToolsState } from './types';
import { signal } from '@lytjs/reactivity';

// Global DevTools state
const devtoolsState = signal<DevToolsState>({
  enabled: false,
  connected: false,
  recording: false,
});

/**
 * Get current DevTools state
 */
export function getState(): DevToolsState {
  return devtoolsState.value;
}

/**
 * Enable DevTools
 */
export function enable(): void {
  devtoolsState.value = { ...devtoolsState.value, enabled: true };
}

/**
 * Disable DevTools
 */
export function disable(): void {
  devtoolsState.value = { ...devtoolsState.value, enabled: false };
}

/**
 * Set connection status
 */
export function setConnected(connected: boolean): void {
  devtoolsState.value = { ...devtoolsState.value, connected };
}

/**
 * Start recording events
 */
export function startRecording(): void {
  devtoolsState.value = { ...devtoolsState.value, recording: true };
}

/**
 * Stop recording events
 */
export function stopRecording(): void {
  devtoolsState.value = { ...devtoolsState.value, recording: false };
}

/**
 * Subscribe to state changes
 */
export function subscribeState(callback: (state: DevToolsState) => void): () => void {
  // Use effect to watch state changes
  const { effect } = require('@lytjs/reactivity');
  let cleanup: (() => void) | undefined;
  
  effect(() => {
    callback(devtoolsState.value);
  });
  
  return () => {
    cleanup?.();
  };
}
