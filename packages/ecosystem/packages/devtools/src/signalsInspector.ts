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

/** 可视化布局节点 */
export interface VisualLayoutNode {
  id: string;
  name: string;
  type: 'signal' | 'computed' | 'effect';
  x: number;
  y: number;
  level: number;
  width: number;
  height: number;
  inDegree: number;
  outDegree: number;
}

/** 可视化布局边 */
export interface VisualLayoutEdge {
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  type: 'dependency';
}

/** 可视化布局图 */
export interface VisualLayoutGraph {
  nodes: VisualLayoutNode[];
  edges: VisualLayoutEdge[];
  width: number;
  height: number;
}

/** 布局选项 */
export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  centerX: number;
  centerY: number;
}

/** 默认布局选项 */
const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeWidth: 120,
  nodeHeight: 40,
  horizontalSpacing: 60,
  verticalSpacing: 80,
  centerX: 300,
  centerY: 200,
};

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

// ===== 可视化布局功能 =====

/**
 * 计算节点的层级（用于分层布局）
 */
function calculateNodeLevels(): Map<string, number> {
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  
  function visitNode(nodeId: string, level: number): void {
    if (visited.has(nodeId)) {
      const existingLevel = levels.get(nodeId);
      if (existingLevel !== undefined && level > existingLevel) {
        levels.set(nodeId, level);
      }
      return;
    }
    
    visited.add(nodeId);
    levels.set(nodeId, level);
    
    const node = signalRegistry.get(nodeId);
    if (node) {
      node.dependents.forEach((depId) => {
        visitNode(depId, level + 1);
      });
    }
  }
  
  signalRegistry.forEach((node, id) => {
    if (node.dependencies.size === 0) {
      visitNode(id, 0);
    }
  });
  
  signalRegistry.forEach((_, id) => {
    if (!visited.has(id)) {
      visitNode(id, 0);
    }
  });
  
  return levels;
}

/**
 * 计算每个节点的入度和出度
 */
function calculateNodeDegrees(): Map<string, { inDegree: number; outDegree: number }> {
  const degrees = new Map<string, { inDegree: number; outDegree: number }>();
  
  signalRegistry.forEach((node, id) => {
    degrees.set(id, {
      inDegree: node.dependencies.size,
      outDegree: node.dependents.size,
    });
  });
  
  return degrees;
}

/**
 * 获取可视化布局图
 */
export function getVisualLayoutGraph(options?: Partial<LayoutOptions>): VisualLayoutGraph {
  const opts: LayoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  
  if (signalRegistry.size === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }
  
  const levels = calculateNodeLevels();
  const degrees = calculateNodeDegrees();
  
  const levelNodes = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    const nodes = levelNodes.get(level) || [];
    nodes.push(nodeId);
    levelNodes.set(level, nodes);
  });
  
  const maxLevel = Math.max(...Array.from(levels.values()), 0);
  const maxNodesInLevel = Math.max(...Array.from(levelNodes.values()).map((n) => n.length), 1);
  
  const graphWidth = (maxNodesInLevel + 1) * (opts.nodeWidth + opts.horizontalSpacing);
  const graphHeight = (maxLevel + 2) * (opts.nodeHeight + opts.verticalSpacing);
  
  const nodes: VisualLayoutNode[] = [];
  const edges: VisualLayoutEdge[] = [];
  
  levelNodes.forEach((nodeIds, level) => {
    const levelWidth = nodeIds.length * (opts.nodeWidth + opts.horizontalSpacing) - opts.horizontalSpacing;
    const startX = (graphWidth - levelWidth) / 2;
    
    nodeIds.forEach((nodeId, index) => {
      const node = signalRegistry.get(nodeId);
      if (!node) return;
      
      const degree = degrees.get(nodeId) || { inDegree: 0, outDegree: 0 };
      const x = startX + index * (opts.nodeWidth + opts.horizontalSpacing);
      const y = opts.centerY - (graphHeight / 2) + level * (opts.nodeHeight + opts.verticalSpacing) + opts.verticalSpacing / 2;
      
      nodes.push({
        id: nodeId,
        name: node.name,
        type: node.type,
        x,
        y,
        level,
        width: opts.nodeWidth,
        height: opts.nodeHeight,
        inDegree: degree.inDegree,
        outDegree: degree.outDegree,
      });
      
      node.dependencies.forEach((depId) => {
        const depNode = nodes.find((n) => n.id === depId);
        if (depNode) {
          edges.push({
            source: depId,
            target: nodeId,
            sourceX: depNode.x + opts.nodeWidth,
            sourceY: depNode.y + opts.nodeHeight / 2,
            targetX: x,
            targetY: y + opts.nodeHeight / 2,
            type: 'dependency',
          });
        }
      });
    });
  });
  
  return { nodes, edges, width: graphWidth, height: graphHeight };
}

/**
 * 获取以指定节点为中心的子图
 */
export function getSubgraph(centerId: string, depth: number = 2): VisualLayoutGraph {
  const includedNodes = new Set<string>([centerId]);
  const queue: Array<{ id: string; currentDepth: number }> = [{ id: centerId, currentDepth: 0 }];
  
  while (queue.length > 0) {
    const { id, currentDepth } = queue.shift()!;
    if (currentDepth >= depth) continue;
    
    const node = signalRegistry.get(id);
    if (node) {
      node.dependencies.forEach((depId) => {
        if (!includedNodes.has(depId)) {
          includedNodes.add(depId);
          queue.push({ id: depId, currentDepth: currentDepth + 1 });
        }
      });
      
      node.dependents.forEach((depId) => {
        if (!includedNodes.has(depId)) {
          includedNodes.add(depId);
          queue.push({ id: depId, currentDepth: currentDepth + 1 });
        }
      });
    }
  }
  
  const tempRegistry = new Map(signalRegistry);

  signalRegistry.forEach((_, id) => {
    if (!includedNodes.has(id)) {
      signalRegistry.delete(id);
    }
  });

  const subgraph = getVisualLayoutGraph();

  signalRegistry.clear();
  tempRegistry.forEach((value, key) => {
    signalRegistry.set(key, value);
  });

  return subgraph;
}

/**
 * 搜索信号节点
 */
export function searchSignals(query: string): SignalNode[] {
  const lowerQuery = query.toLowerCase();
  return getSignalNodes().filter(
    (node) =>
      node.name.toLowerCase().includes(lowerQuery) ||
      node.id.toLowerCase().includes(lowerQuery) ||
      node.type.toLowerCase().includes(lowerQuery)
  );
}

/**
 * 过滤信号节点
 */
export function filterSignals(options: {
  types?: Array<'signal' | 'computed' | 'effect'>;
  minUpdateCount?: number;
  hasDependencies?: boolean;
  hasDependents?: boolean;
}): SignalNode[] {
  return getSignalNodes().filter((node) => {
    if (options.types && !options.types.includes(node.type)) {
      return false;
    }
    if (options.minUpdateCount !== undefined && node.updateCount < options.minUpdateCount) {
      return false;
    }
    if (options.hasDependencies && node.dependencies.length === 0) {
      return false;
    }
    if (options.hasDependents && node.dependents.length === 0) {
      return false;
    }
    return true;
  });
}

// ===== 快照比较功能 =====

/** 快照差异 */
export interface SnapshotDiff {
  added: Array<{ id: string; value: unknown }>;
  removed: Array<{ id: string; value: unknown }>;
  changed: Array<{
    id: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

/**
 * 比较两个快照的差异
 */
export function compareSnapshots(snapshot1: Snapshot, snapshot2: Snapshot): SnapshotDiff {
  const diff: SnapshotDiff = {
    added: [],
    removed: [],
    changed: [],
  };
  
  const ids1 = new Set(Object.keys(snapshot1.signals));
  const ids2 = new Set(Object.keys(snapshot2.signals));
  
  ids2.forEach((id) => {
    if (!ids1.has(id)) {
      diff.added.push({
        id,
        value: snapshot2.signals[id]!.value,
      });
    }
  });

  ids1.forEach((id) => {
    if (!ids2.has(id)) {
      diff.removed.push({
        id,
        value: snapshot1.signals[id]!.value,
      });
    }
  });

  ids1.forEach((id) => {
    if (ids2.has(id)) {
      const oldValue = snapshot1.signals[id]!.value;
      const newValue = snapshot2.signals[id]!.value;
      if (!Object.is(oldValue, newValue)) {
        diff.changed.push({ id, oldValue, newValue });
      }
    }
  });
  
  return diff;
}

/**
 * 序列化快照差异
 */
export function serializeSnapshotDiff(diff: SnapshotDiff): string {
  let result = '';
  
  if (diff.added.length > 0) {
    result += `➕ 新增信号 (${diff.added.length}):\n`;
    diff.added.forEach(({ id, value }) => {
      result += `   ${id}: ${JSON.stringify(value)}\n`;
    });
    result += '\n';
  }
  
  if (diff.removed.length > 0) {
    result += `➖ 移除信号 (${diff.removed.length}):\n`;
    diff.removed.forEach(({ id, value }) => {
      result += `   ${id}: ${JSON.stringify(value)}\n`;
    });
    result += '\n';
  }
  
  if (diff.changed.length > 0) {
    result += `🔄 变更信号 (${diff.changed.length}):\n`;
    diff.changed.forEach(({ id, oldValue, newValue }) => {
      result += `   ${id}:\n`;
      result += `     旧值: ${JSON.stringify(oldValue)}\n`;
      result += `     新值: ${JSON.stringify(newValue)}\n`;
    });
    result += '\n';
  }
  
  if (result === '') {
    result = '✨ 快照完全相同';
  }
  
  return result;
}

/**
 * 获取相邻快照的差异
 */
export function getDiffBetweenSnapshots(index1: number, index2: number): SnapshotDiff | null {
  const snapshot1 = getSnapshot(index1);
  const snapshot2 = getSnapshot(index2);
  
  if (!snapshot1 || !snapshot2) {
    return null;
  }
  
  return compareSnapshots(snapshot1, snapshot2);
}

/**
 * 时间旅行导航
 */
export interface TimeTravelNavigator {
  currentIndex: number;
  total: number;
  canGoBack: boolean;
  canGoForward: boolean;
  currentSnapshot: Snapshot | null;
  previousSnapshot: Snapshot | null;
  nextSnapshot: Snapshot | null;
  diff: SnapshotDiff | null;
}

/**
 * 获取时间旅行导航状态
 */
export function getTimeTravelNavigator(index?: number): TimeTravelNavigator {
  const snapshots = getSnapshots();
  const currentIndex = index !== undefined ? index : Math.max(0, snapshots.length - 1);

  return {
    currentIndex,
    total: snapshots.length,
    canGoBack: currentIndex > 0,
    canGoForward: currentIndex < snapshots.length - 1,
    currentSnapshot: snapshots[currentIndex] ?? null,
    previousSnapshot: currentIndex > 0 ? (snapshots[currentIndex - 1] ?? null) : null,
    nextSnapshot: snapshots[currentIndex + 1] ?? null,
    diff: currentIndex > 0
      ? compareSnapshots(snapshots[currentIndex - 1]!, snapshots[currentIndex]!)
      : null,
  };
}

/**
 * 恢复到上一个快照
 */
export function timeTravelBack(): Snapshot | null {
  const navigator = getTimeTravelNavigator();
  if (!navigator.canGoBack) return null;
  return restoreSnapshot(navigator.currentIndex - 1) ?? null;
}

/**
 * 前进到下一个快照
 */
export function timeTravelForward(): Snapshot | null {
  const navigator = getTimeTravelNavigator();
  if (!navigator.canGoForward) return null;
  return restoreSnapshot(navigator.currentIndex + 1) ?? null;
}
