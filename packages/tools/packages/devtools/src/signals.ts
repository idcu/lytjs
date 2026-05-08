/**
 * @lytjs/devtools - Signal inspection
 */

import type { SignalInfo } from './types';

// Signal registry
const signalRegistry = new Map<string, any>();
let signalIdCounter = 0;

/**
 * Generate a unique signal ID
 */
export function generateSignalId(): string {
  return `signal-${++signalIdCounter}`;
}

/**
 * Register a signal for inspection
 */
export function registerSignal(signal: any, id: string, name: string): void {
  signalRegistry.set(id, { signal, name, registeredAt: Date.now() });
}

/**
 * Unregister a signal
 */
export function unregisterSignal(id: string): void {
  signalRegistry.delete(id);
}

/**
 * Get all registered signals
 */
export function getSignals(): SignalInfo[] {
  const signals: SignalInfo[] = [];
  
  for (const [id, entry] of signalRegistry) {
    const { signal, name } = entry;
    signals.push({
      id,
      name,
      value: getSignalValue(signal),
      type: detectSignalType(signal),
      dependencies: [], // Would be populated in full implementation
      dependents: [], // Would be populated in full implementation
    });
  }
  
  return signals;
}

/**
 * Get a signal's value
 */
export function getSignalValue(signal: any): unknown {
  if (!signal) return undefined;
  
  // Handle different signal types
  if ('value' in signal) {
    return signal.value;
  }
  
  if ('_value' in signal) {
    return signal._value;
  }
  
  return signal;
}

/**
 * Detect signal type
 */
function detectSignalType(signal: any): SignalInfo['type'] {
  if (!signal) return 'ref';
  
  if (signal._isRef) return 'ref';
  if (signal._isReactive) return 'reactive';
  if (signal._isComputed) return 'computed';
  if (signal._isSignal) return 'signal';
  
  return 'ref';
}

/**
 * Get signal by ID
 */
export function getSignalById(id: string): SignalInfo | undefined {
  const entry = signalRegistry.get(id);
  if (!entry) return undefined;
  
  const { signal, name } = entry;
  return {
    id,
    name,
    value: getSignalValue(signal),
    type: detectSignalType(signal),
    dependencies: [],
    dependents: [],
  };
}

/**
 * Clear signal registry
 */
export function clearSignalRegistry(): void {
  signalRegistry.clear();
  signalIdCounter = 0;
}
