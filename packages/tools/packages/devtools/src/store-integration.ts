/**
 * @lytjs/devtools - Store integration
 *
 * Provides hooks for @lytjs/store to integrate with DevTools.
 */

import { recordEvent, isEventRecording } from './events';
import { registerSignal, unregisterSignal } from './signals';
import { generateId } from '@lytjs/common-string';

/**
 * Track a store mutation in DevTools
 */
export function trackStoreMutation(storeId: string, type: string, payload: unknown): void {
  if (!isEventRecording()) return;

  recordEvent(
    'store:mutation',
    { storeId, mutationType: type, payload },
  );
}

/**
 * Register a store's state signals for inspection
 */
export function registerStoreSignals(
  storeId: string,
  state: Record<string, unknown>,
): Map<string, string> {
  const signalIds = new Map<string, string>();

  for (const [key, value] of Object.entries(state)) {
    const id = generateId('signal');
    const name = `${storeId}.${key}`;
    registerSignal({ id, name, type: 'signal', value });
    signalIds.set(key, id);
  }

  return signalIds;
}

/**
 * Unregister a store's signals
 */
export function unregisterStoreSignals(signalIds: Map<string, string>): void {
  for (const id of signalIds.values()) {
    unregisterSignal(id);
  }
}
