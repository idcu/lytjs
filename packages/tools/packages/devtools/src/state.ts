/**
 * @lytjs/devtools - DevTools state management
 */

import type { DevToolsState } from './types';
import { signal, effect } from '@lytjs/reactivity';

const devtoolsState = signal<DevToolsState>({
  enabled: false,
  connected: false,
  recording: false,
});

const stateSubscribers = new Set<(state: DevToolsState) => void>();

export function getState(): DevToolsState {
  return devtoolsState();
}

export function enable(): void {
  devtoolsState.set({ ...devtoolsState(), enabled: true });
}

export function disable(): void {
  devtoolsState.set({ ...devtoolsState(), enabled: false });
}

export function setConnected(connected: boolean): void {
  devtoolsState.set({ ...devtoolsState(), connected });
}

export function startRecording(): void {
  devtoolsState.set({ ...devtoolsState(), recording: true });
}

export function stopRecording(): void {
  devtoolsState.set({ ...devtoolsState(), recording: false });
}

export function subscribeState(callback: (state: DevToolsState) => void): () => void {
  let isActive = true;

  const stopEffect = effect(() => {
    const currentState = devtoolsState();
    if (isActive) {
      callback(currentState);
    }
  });

  const cleanup = (): void => {
    if (isActive) {
      isActive = false;
      stateSubscribers.delete(cleanup);
      stopEffect();
    }
  };

  stateSubscribers.add(cleanup);
  return cleanup;
}

export function notifyStateChange(): void {
  const state = devtoolsState();
  stateSubscribers.forEach((callback) => callback(state));
}

export function resetState(): void {
  devtoolsState.set({
    enabled: false,
    connected: false,
    recording: false,
  });
}

export function getStateSnapshot(): DevToolsState {
  return { ...devtoolsState() };
}

export function restoreState(state: Partial<DevToolsState>): void {
  devtoolsState.set({ ...devtoolsState(), ...state });
}

export function clearStateSubscribers(): void {
  stateSubscribers.forEach((callback) => callback(devtoolsState()));
  stateSubscribers.clear();
}
