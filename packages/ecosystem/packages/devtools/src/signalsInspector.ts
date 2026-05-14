/**
 * @lytjs/devtools - 信号依赖追踪和快照
 *
 * 提供时间旅行调试、信号依赖图可视化和性能分析功能
 */

// 信号节点信息
export interface SignalNode {
  id: string;
  name: string;
  type: 'signal' | 'computed' | 'effect';
  value?: unknown;
  previousValue?: unknown;
  dependencies: string[];
  dependents: string[];
  updateCount: number;
  lastUpdateTime: number;
  averageUpdateTime: number;
}

/** 快照记录 */
export interface Snapshot {
  id: string;
  timestamp: number;
  label?: string;
  signals: Record<string, SignalSnapshot>;
}

/** 单个信号的快照 */
export interface SignalSnapshot {
  value: unknown;
  dependencies: string[];
}

/** 时间旅行状态 */
export interface TimeTravelState {
  snapshots: Snapshot[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

/** 性能记录 */
export interface PerformanceRecord {
  id: string;
  name: string;
  type: 'signal' | 'computed' | 'effect';
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/** 依赖图节点 */
export interface DependencyGraphNode {
  id: string;
  name: string;
  type: 'signal' | 'computed' | 'effect';
  x?: number;
  y?: number;
}

/** 依赖图边 */
export interface DependencyGraphEdge {
  source: string;
  target: string;
  type: 'dependency' | 'dependent';
}

/** 依赖图 */
export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

// 信号注册表
const signalRegistry = new Map<string, {
  type: 'signal' | 'computed' | 'effect';
  name: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  value: unknown;
  previousValue?: unknown;
  updateCount: number;
  updateTimes: number[];
  lastUpdateTime: number;
}>();

// 快照管理器
const snapshotManager = {
  snapshots: [] as Snapshot[],
  maxSnapshots: 100,
  
  add(snapshot: Snapshot) {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  },
  
  getAll(): Snapshot[] {
    return [...this.snapshots];
  },
  
  get(index: number): Snapshot | undefined {
    return this.snapshots[index];
  },
  
  clear() {
    this.snapshots = [];
  },
  
  getLength(): number {
    return this.snapshots.length;
  }
};

// 性能记录
const performanceRecords: PerformanceRecord[] = [];
const maxPerformanceRecords = 1000;

/**
 * 注册一个信号
 */
export function registerSignal(
  id: string,
  name: string,
  type: 'signal' | 'computed' | 'effect',
  initialValue?: unknown
): void {
  signalRegistry.set(id, {
    type,
    name,
    dependencies: new Set(),
    dependents: new Set(),
    value: initialValue,
    updateCount: 0,
    updateTimes: [],
    lastUpdateTime: 0,
  });
}

/**
 * 注销一个信号
 */
export function unregisterSignal(id: string): void {
  const node = signalRegistry.get(id);
  if (node) {
    node.dependencies.forEach((depId) => {
      const dep = signalRegistry.get(depId);
      if (dep) {
        dep.dependents.delete(id);
      }
    });
    node.dependents.forEach((depId) => {
      const dep = signalRegistry.get(depId);
      if (dep) {
        dep.dependencies.delete(id);
      }
    });
  }
  signalRegistry.delete(id);
}

/**
 * 记录信号更新
 */
export function recordSignalUpdate(
  id: string,
  newValue: unknown,
  duration?: number
): void {
  const node = signalRegistry.get(id);
  if (node) {
    node.previousValue = node.value;
    node.value = newValue;
    node.updateCount++;
    node.lastUpdateTime = Date.now();
    
    if (duration !== undefined) {
      node.updateTimes.push(duration);
      if (node.updateTimes.length > 10) {
        node.updateTimes.shift();
      }
    }
    
    if (duration !== undefined) {
      recordPerformance({
        id,
        name: node.name,
        type: node.type,
        duration,
        timestamp: Date.now(),
      });
    }
  }
}

/**
 * 记录依赖关系
 */
export function recordDependency(sourceId: string, targetId: string): void {
  const source = signalRegistry.get(sourceId);
  const target = signalRegistry.get(targetId);
  
  if (source && target) {
    source.dependencies.add(targetId);
    target.dependents.add(sourceId);
  }
}

/**
 * 获取所有信号节点
 */
export function getSignalNodes(): SignalNode[] {
  return Array.from(signalRegistry.entries()).map(([id, node]) => ({
    id,
    name: node.name,
    type: node.type,
    value: node.value,
    previousValue: node.previousValue,
    dependencies: Array.from(node.dependencies),
    dependents: Array.from(node.dependents),
    updateCount: node.updateCount,
    lastUpdateTime: node.lastUpdateTime,
    averageUpdateTime: node.updateTimes.length > 0
      ? node.updateTimes.reduce((a, b) => a + b, 0) / node.updateTimes.length
      : 0,
  }));
}

/**
 * 获取单个信号节点
 */
export function getSignalNode(id: string): SignalNode | undefined {
  const node = signalRegistry.get(id);
  if (!node) return undefined;
  
  return {
    id,
    name: node.name,
    type: node.type,
    value: node.value,
    previousValue: node.previousValue,
    dependencies: Array.from(node.dependencies),
    dependents: Array.from(node.dependents),
    updateCount: node.updateCount,
    lastUpdateTime: node.lastUpdateTime,
    averageUpdateTime: node.updateTimes.length > 0
      ? node.updateTimes.reduce((a, b) => a + b, 0) / node.updateTimes.length
      : 0,
  };
}

/**
 * 获取依赖图
 */
export function getDependencyGraph(): DependencyGraph {
  const nodes: DependencyGraphNode[] = [];
  const edges: DependencyGraphEdge[] = [];
  
  signalRegistry.forEach((node, id) => {
    nodes.push({
      id,
      name: node.name,
      type: node.type,
    });
    
    node.dependencies.forEach((depId) => {
      edges.push({
        source: depId,
        target: id,
        type: 'dependency',
      });
    });
  });
  
  return { nodes, edges };
}

/**
 * 创建快照
 */
export function createSnapshot(label?: string): Snapshot {
  const snapshot: Snapshot = {
    id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    label,
    signals: {},
  };
  
  signalRegistry.forEach((node, id) => {
    snapshot.signals[id] = {
      value: node.value,
      dependencies: Array.from(node.dependencies),
    };
  });
  
  snapshotManager.add(snapshot);
  return snapshot;
}

/**
 * 获取所有快照
 */
export function getSnapshots(): Snapshot[] {
  return snapshotManager.getAll();
}

/**
 * 获取快照
 */
export function getSnapshot(index: number): Snapshot | undefined {
  return snapshotManager.get(index);
}

/**
 * 获取时间旅行状态
 */
export function getTimeTravelState(): TimeTravelState {
  const length = snapshotManager.getLength();
  return {
    snapshots: snapshotManager.getAll(),
    currentIndex: length - 1,
    canUndo: length > 1,
    canRedo: false,
  };
}

/**
 * 恢复到指定快照
 */
export function restoreSnapshot(index: number): Snapshot | undefined {
  const snapshot = snapshotManager.get(index);
  if (!snapshot) return undefined;
  
  Object.entries(snapshot.signals).forEach(([id, signalSnapshot]) => {
    const node = signalRegistry.get(id);
    if (node) {
      node.value = signalSnapshot.value;
    }
  });
  
  return snapshot;
}

/**
 * 清除所有快照
 */
export function clearSnapshots(): void {
  snapshotManager.clear();
}

/**
 * 记录性能数据
 */
export function recordPerformance(record: PerformanceRecord): void {
  performanceRecords.push(record);
  if (performanceRecords.length > maxPerformanceRecords) {
    performanceRecords.shift();
  }
}

/**
 * 获取性能记录
 */
export function getPerformanceRecords(limit?: number): PerformanceRecord[] {
  const records = [...performanceRecords];
  if (limit !== undefined) {
    return records.slice(-limit);
  }
  return records;
}

/**
 * 获取性能统计
 */
export function getPerformanceStats(): {
  totalRecords: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  byType: Record<string, { count: number; average: number; max: number }>;
} {
  if (performanceRecords.length === 0) {
    return {
      totalRecords: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      byType: {},
    };
  }
  
  const durations = performanceRecords.map((r) => r.duration);
  const byType: Record<string, { count: number; total: number; max: number }> = {};
  
  performanceRecords.forEach((record) => {
    if (!byType[record.type]) {
      byType[record.type] = { count: 0, total: 0, max: 0 };
    }
    const typeStats = byType[record.type]!;
    typeStats.count++;
    typeStats.total += record.duration;
    typeStats.max = Math.max(typeStats.max, record.duration);
  });
  
  const byTypeResult: Record<string, { count: number; average: number; max: number }> = {};
  Object.entries(byType).forEach(([type, data]) => {
    byTypeResult[type] = {
      count: data.count,
      average: data.total / data.count,
      max: data.max,
    };
  });
  
  return {
    totalRecords: performanceRecords.length,
    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    maxDuration: Math.max(...durations),
    minDuration: Math.min(...durations),
    byType: byTypeResult,
  };
}

/**
 * 清除性能记录
 */
export function clearPerformanceRecords(): void {
  performanceRecords.length = 0;
}

/**
 * 清除所有注册信号
 */
export function clearSignalRegistry(): void {
  signalRegistry.clear();
}

/**
 * 序列化信号节点用于显示
 */
export function serializeSignalNode(node: SignalNode): string {
  let result = `📊 ${node.name} (${node.type})\n`;
  result += `   ID: ${node.id}\n`;
  result += `   更新次数: ${node.updateCount}\n`;
  result += `   最后更新: ${new Date(node.lastUpdateTime).toLocaleTimeString()}\n`;
  
  if (node.averageUpdateTime > 0) {
    result += `   平均更新耗时: ${node.averageUpdateTime.toFixed(2)}ms\n`;
  }
  
  if (node.dependencies.length > 0) {
    result += `   依赖: ${node.dependencies.join(', ')}\n`;
  }
  
  if (node.dependents.length > 0) {
    result += `   被依赖: ${node.dependents.join(', ')}\n`;
  }
  
  return result;
}

/**
 * 序列化依赖图用于显示
 */
export function serializeDependencyGraph(): string {
  const graph = getDependencyGraph();
  if (graph.nodes.length === 0) {
    return '暂无信号数据';
  }
  
  let result = `📈 依赖图 (${graph.nodes.length} 个节点, ${graph.edges.length} 条边)\n\n`;
  
  graph.nodes.forEach((node) => {
    const nodeInfo = signalRegistry.get(node.id);
    const deps = nodeInfo?.dependencies || new Set();
    const dependents = nodeInfo?.dependents || new Set();
    
    result += `🔹 ${node.name} (${node.type})\n`;
    if (deps.size > 0) {
      result += `   ↓ 依赖: ${Array.from(deps).join(', ')}\n`;
    }
    if (dependents.size > 0) {
      result += `   ↑ 被依赖: ${Array.from(dependents).join(', ')}\n`;
    }
    result += '\n';
  });
  
  return result;
}

/**
 * 序列化性能统计
 */
export function serializePerformanceStats(): string {
  const stats = getPerformanceStats();
  
  if (stats.totalRecords === 0) {
    return '暂无性能数据';
  }
  
  let result = `⚡ 性能统计\n\n`;
  result += `总记录数: ${stats.totalRecords}\n`;
  result += `平均耗时: ${stats.averageDuration.toFixed(2)}ms\n`;
  result += `最大耗时: ${stats.maxDuration.toFixed(2)}ms\n`;
  result += `最小耗时: ${stats.minDuration.toFixed(2)}ms\n\n`;
  
  result += `按类型统计:\n`;
  Object.entries(stats.byType).forEach(([type, data]) => {
    result += `  ${type}: ${data.count} 次, 平均 ${data.average.toFixed(2)}ms, 最大 ${data.max.toFixed(2)}ms\n`;
  });
  
  return result;
}
