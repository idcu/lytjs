/**
 * DevTools 状态快照管理模块
 */

import type { StateSnapshot, ComponentTreeNode, SignalInfo, DevToolsEvent } from './types';
import { setSignalValue } from './signals';

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
 *
 * @description
 * 遍历快照中的 signals，调用 setSignalValue 逐个恢复信号的值。
 * 如果某个信号恢复失败，会记录错误但不会中断其余信号的恢复。
 *
 * @param snapshot - 要恢复的状态快照
 * @returns 是否全部恢复成功
 */
export function restoreSnapshot(snapshot: StateSnapshot): boolean {
  try {
    if (!snapshot.signals || snapshot.signals.length === 0) {
      console.log('[DevTools Snapshots] No signals to restore in snapshot:', snapshot.id);
      return true;
    }

    let allSuccess = true;

    for (const signalInfo of snapshot.signals) {
      try {
        const success = setSignalValue(signalInfo.id, signalInfo.value);
        if (!success) {
          console.warn(
            `[DevTools Snapshots] Failed to restore signal "${signalInfo.name}" (id: ${signalInfo.id}): not found in registry`
          );
          allSuccess = false;
        }
      } catch (err) {
        console.error(
          `[DevTools Snapshots] Error restoring signal "${signalInfo.name}":`,
          err
        );
        allSuccess = false;
      }
    }

    console.log('[DevTools Snapshots] Snapshot restored:', snapshot.id);
    return allSuccess;
  } catch (e) {
    console.error('[DevTools Snapshots] Restore failed:', e);
    return false;
  }
}
