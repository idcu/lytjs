/**
 * DevTools 状态快照管理模块
 */

export interface Snapshot {
  id: string;
  timestamp: number;
  description?: string;
  data: Record<string, unknown>;
}

const snapshots = new Map<string, Snapshot>();

export function createSnapshot(
  id: string, 
  data: Record<string, unknown>, 
  description?: string
): Snapshot {
  const snapshot: Snapshot = {
    id,
    timestamp: Date.now(),
    description,
    data: JSON.parse(JSON.stringify(data)), // 深拷贝
  };
  snapshots.set(id, snapshot);
  return snapshot;
}

export function getSnapshot(id: string): Snapshot | undefined {
  return snapshots.get(id);
}

export function getAllSnapshots(): Snapshot[] {
  return Array.from(snapshots.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export function deleteSnapshot(id: string): boolean {
  return snapshots.delete(id);
}

export function clearSnapshots(): void {
  snapshots.clear();
}

export function exportSnapshots(): string {
  return JSON.stringify(getAllSnapshots(), null, 2);
}

export function importSnapshots(json: string): Snapshot[] {
  try {
    const parsed = JSON.parse(json) as Snapshot[];
    parsed.forEach(s => snapshots.set(s.id, s));
    return parsed;
  } catch (e) {
    console.error('[DevTools Snapshots] Import failed:', e);
    return [];
  }
}
