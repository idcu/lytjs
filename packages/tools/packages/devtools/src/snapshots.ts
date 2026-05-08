/**
 * @lytjs/devtools - Time travel debugging
 */

import type { StateSnapshot } from './types';
import { getComponentTree } from './component-tree';
import { getSignals, setSignalValue } from './signals';
import { getEvents } from './events';

// Snapshot store
const snapshots: StateSnapshot[] = [];
let snapshotIdCounter = 0;

/**
 * Take a snapshot of current state
 */
export function takeSnapshot(): StateSnapshot {
  const snapshot: StateSnapshot = {
    id: `snapshot-${++snapshotIdCounter}`,
    timestamp: Date.now(),
    components: getComponentTree(),
    signals: getSignals(),
    events: getEvents(),
  };
  
  snapshots.push(snapshot);
  return snapshot;
}

/**
 * Get all snapshots
 */
export function getSnapshots(): StateSnapshot[] {
  return [...snapshots];
}

/**
 * Get snapshot by ID
 */
export function getSnapshotById(id: string): StateSnapshot | undefined {
  return snapshots.find(s => s.id === id);
}

/**
 * Restore a snapshot
 * Restores signal values from the snapshot
 */
export function restoreSnapshot(snapshot: StateSnapshot): boolean {
  try {
    for (const signalInfo of snapshot.signals) {
      if (setSignalValue(signalInfo.id, signalInfo.value)) {
        console.log(`[@lytjs/devtools] Restored signal ${signalInfo.name} (${signalInfo.id})`);
      }
    }

    console.log(`[@lytjs/devtools] Restored snapshot ${snapshot.id} with ${snapshot.signals.length} signals`);
    return true;
  } catch (error) {
    console.error(`[@lytjs/devtools] Failed to restore snapshot ${snapshot.id}:`, error);
    return false;
  }
}

/**
 * Delete a snapshot
 */
export function deleteSnapshot(id: string): boolean {
  const index = snapshots.findIndex(s => s.id === id);
  if (index === -1) return false;
  
  snapshots.splice(index, 1);
  return true;
}

/**
 * Clear all snapshots
 */
export function clearSnapshots(): void {
  snapshots.length = 0;
  snapshotIdCounter = 0;
}
