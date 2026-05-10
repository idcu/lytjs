/**
 * DevTools 状态快照管理模块
 */

import type { StateSnapshot, ComponentTreeNode, SignalInfo, DevToolsEvent } from './types';

// 重新导出 StateSnapshot 类型以保持兼容性
export type { StateSnapshot as Snapshot };

const snapshots = new Map<string, StateSnapshot>();
let snapshotIdCounter = 0;

/**
 * 生成快照 ID
 */
function generateSnapshotId(): string {
  return `snapshot-${++snapshotIdCounter}-${Date.now().toString(36)}`;
}

/**
 * 创建快照
 */
export function takeSnapshot(
  components?: ComponentTreeNode[],
  signals?: SignalInfo[],
  events?: DevToolsEvent[]
): StateSnapshot {
  const snapshot: StateSnapshot = {
    id: generateSnapshotId(),
    timestamp: Date.now(),
    components: components || [],
    signals: signals || [],
    events: events || [],
  };
  snapshots.set(snapshot.id, snapshot);
  return snapshot;
}

/**
 * 创建快照（兼容旧接口）
 */
export function createSnapshot(
  id: string,
  data: Record<string, unknown>,
  description?: string
): StateSnapshot {
  const snapshot: StateSnapshot = {
    id,
    timestamp: Date.now(),
    components: [],
    signals: Object.entries(data).map(([name, value]) => ({
      id: `signal-${name}`,
      name,
      type: 'signal',
      value,
      dependencies: [],
      dependents: [],
    })),
    events: description ? [{
      id: `event-${Date.now()}`,
      type: 'store:mutation',
      timestamp: Date.now(),
      payload: { description },
    }] : [],
  };
  snapshots.set(id, snapshot);
  return snapshot;
}

/**
 * 获取快照
 */
export function getSnapshot(id: string): StateSnapshot | undefined {
  return snapshots.get(id);
}

/**
 * 通过 ID 获取快照（兼容新接口）
 */
export function getSnapshotById(id: string): StateSnapshot | undefined {
  return snapshots.get(id);
}

/**
 * 获取所有快照
 */
export function getAllSnapshots(): StateSnapshot[] {
  return Array.from(snapshots.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 获取所有快照列表（兼容新接口）
 */
export function getSnapshots(): StateSnapshot[] {
  return getAllSnapshots();
}

/**
 * 删除快照
 */
export function deleteSnapshot(id: string): boolean {
  return snapshots.delete(id);
}

/**
 * 清除所有快照
 */
export function clearSnapshots(): void {
  snapshots.clear();
}

/**
 * 导出快照为 JSON
 */
export function exportSnapshots(): string {
  return JSON.stringify(getAllSnapshots(), null, 2);
}

/**
 * 从 JSON 导入快照
 */
export function importSnapshots(json: string): StateSnapshot[] {
  try {
    const parsed = JSON.parse(json) as StateSnapshot[];
    parsed.forEach(s => snapshots.set(s.id, s));
    return parsed;
  } catch (e) {
    console.error('[DevTools Snapshots] Import failed:', e);
    return [];
  }
}

/**
 * 恢复快照
 * 注意：这是一个简化实现，实际恢复需要根据具体应用架构实现
 */
export function restoreSnapshot(snapshot: StateSnapshot): boolean {
  try {
    // 这里应该实现实际的状态恢复逻辑
    // 由于涉及具体的信号系统实现，这里仅作示例
    console.log('[DevTools Snapshots] Restoring snapshot:', snapshot.id);
    return true;
  } catch (e) {
    console.error('[DevTools Snapshots] Restore failed:', e);
    return false;
  }
}
