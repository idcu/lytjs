/**
 * @lytjs/devtools - DevTools state management
 */

import type { DevToolsState } from './types';
import { signal, effect } from '@lytjs/reactivity';

// Global DevTools state
const devtoolsState = signal<DevToolsState>({
  enabled: false,
  connected: false,
  recording: false,
});

// 存储 effect cleanup 函数的集合
const stateSubscribers = new Set<() => void>();

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
 * @param callback - 状态变化回调函数
 * @returns 取消订阅函数
 */
export function subscribeState(callback: (state: DevToolsState) => void): () => void {
  let isActive = true;

  const stopEffect = effect(() => {
    const currentState = devtoolsState.value;
    if (isActive) {
      callback(currentState);
    }
  });

  // 创建 cleanup 函数
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

/**
 * 清除所有状态订阅
 * 主要用于测试和清理场景
 */
export function clearStateSubscribers(): void {
  stateSubscribers.forEach(cleanup => cleanup());
  stateSubscribers.clear();
}
