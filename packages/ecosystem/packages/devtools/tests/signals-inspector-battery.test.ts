/**
 * 行为级判据：`@lytjs/devtools` 的**信号检查器**（`src/signalsInspector.ts`，957 行）
 *
 * ## 为什么要有这条
 *
 * 该模块是 `@lytjs/devtools` 的公开导出面（`index.ts` 转出），含信号注册表 / 依赖图 /
 * 快照与回溯 / 性能记录 / 可视化布局 / 搜索过滤 / 快照差异 等 20+ 函数，
 * 而同包的 `tests/index.test.ts`（786 行）**一个符号都没引用** ⇒ 覆盖率缺口 ~421 条语句。
 *
 * ## 手法
 *
 * 模块持有模块级状态（`signalRegistry` / `snapshotManager` / `performanceRecords`）
 * ⇒ 每个用例前清空三者。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerSignal,
  unregisterSignal,
  recordSignalUpdate,
  recordDependency,
  getSignalNodes,
  getSignalNode,
  getDependencyGraph,
  createSnapshot,
  getSnapshots,
  getSnapshot,
  getTimeTravelState,
  restoreSnapshot,
  clearSnapshots,
  recordPerformance,
  getPerformanceRecords,
  getPerformanceStats,
  clearPerformanceRecords,
  clearSignalRegistry,
  serializeSignalNode,
  serializeDependencyGraph,
  serializePerformanceStats,
  getVisualLayoutGraph,
  getSubgraph,
  searchSignals,
  filterSignals,
  compareSnapshots,
  serializeSnapshotDiff,
} from '../src/signalsInspector';

beforeEach(() => {
  clearSignalRegistry();
  clearSnapshots();
  clearPerformanceRecords();
});

/** 建一条 a → b → c 的依赖链（b 依赖 a，c 依赖 b） */
const buildChain = (): void => {
  registerSignal('a', 'Alpha', 'signal', 1);
  registerSignal('b', 'Beta', 'computed', 2);
  registerSignal('c', 'Gamma', 'effect', 3);
  recordDependency('b', 'a');
  recordDependency('c', 'b');
};

// ==================== 注册表 ====================

describe('registerSignal / unregisterSignal / getSignalNode(s)', () => {
  it('注册后可按 id 取到，字段齐全', () => {
    registerSignal('s1', 'Count', 'signal', 42);

    const node = getSignalNode('s1');
    expect(node).toBeDefined();
    expect(node!.id).toBe('s1');
    expect(node!.name).toBe('Count');
    expect(node!.type).toBe('signal');
    expect(node!.value).toBe(42);
    expect(node!.updateCount).toBe(0);
    expect(node!.dependencies).toEqual([]);
    expect(node!.dependents).toEqual([]);
    expect(node!.averageUpdateTime).toBe(0);
  });

  it('取不存在的 id 返回 undefined', () => {
    expect(getSignalNode('nope')).toBeUndefined();
  });

  it('重复注册同 id 会覆盖', () => {
    registerSignal('s1', 'First', 'signal', 1);
    registerSignal('s1', 'Second', 'computed', 2);

    expect(getSignalNodes()).toHaveLength(1);
    expect(getSignalNode('s1')!.name).toBe('Second');
  });

  it('注销应**双向**清理依赖关系', () => {
    buildChain();

    unregisterSignal('b');

    expect(getSignalNode('b')).toBeUndefined();
    // a 的「被依赖」里不应再有 b；c 的「依赖」里也不应再有 b
    expect(getSignalNode('a')!.dependents).toEqual([]);
    expect(getSignalNode('c')!.dependencies).toEqual([]);
  });

  it('注销不存在的 id 不抛', () => {
    expect(() => unregisterSignal('nope')).not.toThrow();
  });

  it('clearSignalRegistry 清空全部', () => {
    buildChain();
    clearSignalRegistry();

    expect(getSignalNodes()).toHaveLength(0);
  });
});

// ==================== 更新记录 ====================

describe('recordSignalUpdate', () => {
  it('更新 value / previousValue / updateCount / lastUpdateTime', () => {
    registerSignal('s1', 'Count', 'signal', 1);
    const before = Date.now();

    recordSignalUpdate('s1', 2);

    const node = getSignalNode('s1')!;
    expect(node.value).toBe(2);
    expect(node.previousValue).toBe(1);
    expect(node.updateCount).toBe(1);
    expect(node.lastUpdateTime).toBeGreaterThanOrEqual(before);
  });

  it('传 duration 时计入 averageUpdateTime', () => {
    registerSignal('s1', 'Count', 'signal', 0);

    recordSignalUpdate('s1', 1, 10);
    recordSignalUpdate('s1', 2, 20);

    expect(getSignalNode('s1')!.averageUpdateTime).toBeCloseTo(15);
  });

  it('averageUpdateTime 只统计**最近 10 次**', () => {
    registerSignal('s1', 'Count', 'signal', 0);

    for (let i = 0; i < 10; i++) recordSignalUpdate('s1', i, 100);
    recordSignalUpdate('s1', 99, 0); // 第 11 次 ⇒ 挤掉最早的 100

    expect(getSignalNode('s1')!.averageUpdateTime).toBeCloseTo(90);
  });

  it('未注册的 id 静默忽略', () => {
    expect(() => recordSignalUpdate('nope', 1, 5)).not.toThrow();
    expect(getPerformanceRecords()).toHaveLength(0);
  });

  it('传 duration 时同时写入性能记录', () => {
    registerSignal('s1', 'Count', 'signal', 0);
    recordSignalUpdate('s1', 1, 7);

    const records = getPerformanceRecords();
    expect(records).toHaveLength(1);
    expect(records[0]!.id).toBe('s1');
    expect(records[0]!.name).toBe('Count');
    expect(records[0]!.duration).toBe(7);
  });

  it('不传 duration 时不写性能记录', () => {
    registerSignal('s1', 'Count', 'signal', 0);
    recordSignalUpdate('s1', 1);

    expect(getPerformanceRecords()).toHaveLength(0);
  });
});

// ==================== 依赖图 ====================

describe('recordDependency / getDependencyGraph', () => {
  it('记录依赖后节点双向可见', () => {
    registerSignal('a', 'A', 'signal');
    registerSignal('b', 'B', 'computed');
    recordDependency('b', 'a');

    expect(getSignalNode('b')!.dependencies).toEqual(['a']);
    expect(getSignalNode('a')!.dependents).toEqual(['b']);
  });

  it('任一端未注册则整条依赖忽略', () => {
    registerSignal('a', 'A', 'signal');
    recordDependency('b', 'a');

    expect(getSignalNode('a')!.dependents).toEqual([]);
  });

  it('getDependencyGraph 的边方向：依赖方 → 使用者', () => {
    buildChain();

    const g = getDependencyGraph();
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c']);
    expect(g.edges).toEqual(
      expect.arrayContaining([
        { source: 'a', target: 'b', type: 'dependency' },
        { source: 'b', target: 'c', type: 'dependency' },
      ]),
    );
  });
});

// ==================== 快照与回溯 ====================

describe('快照', () => {
  it('createSnapshot 记录当前各信号的值与依赖', () => {
    buildChain();
    const snap = createSnapshot('初始');

    expect(snap.label).toBe('初始');
    expect(Object.keys(snap.signals).sort()).toEqual(['a', 'b', 'c']);
    expect(snap.signals.a!.value).toBe(1);
    expect(snap.signals.b!.dependencies).toEqual(['a']);
  });

  it('getSnapshots / getSnapshot(index)', () => {
    buildChain();
    createSnapshot('s0');
    createSnapshot('s1');

    expect(getSnapshots()).toHaveLength(2);
    expect(getSnapshot(0)!.label).toBe('s0');
    expect(getSnapshot(1)!.label).toBe('s1');
    expect(getSnapshot(99)).toBeUndefined();
  });

  it('restoreSnapshot 回填信号值', () => {
    registerSignal('s1', 'Count', 'signal', 1);
    createSnapshot('v1');
    recordSignalUpdate('s1', 99);
    expect(getSignalNode('s1')!.value).toBe(99);

    restoreSnapshot(0);

    expect(getSignalNode('s1')!.value).toBe(1);
  });

  it('restoreSnapshot 越界返回 undefined', () => {
    expect(restoreSnapshot(3)).toBeUndefined();
  });

  it('getTimeTravelState 反映快照数量', () => {
    expect(getTimeTravelState().canUndo).toBe(false);

    registerSignal('s1', 'Count', 'signal', 1);
    createSnapshot();
    createSnapshot();

    const st = getTimeTravelState();
    expect(st.snapshots).toHaveLength(2);
    expect(st.currentIndex).toBe(1);
    expect(st.canUndo).toBe(true);
  });

  it('clearSnapshots 清空', () => {
    registerSignal('s1', 'Count', 'signal', 1);
    createSnapshot();
    clearSnapshots();

    expect(getSnapshots()).toHaveLength(0);
  });
});

// ==================== 性能记录与统计 ====================

describe('性能记录与统计', () => {
  it('recordPerformance / getPerformanceRecords(limit)', () => {
    for (let i = 1; i <= 5; i++) {
      recordPerformance({ id: `r${i}`, name: `R${i}`, type: 'signal', duration: i, timestamp: 0 });
    }

    expect(getPerformanceRecords()).toHaveLength(5);
    expect(getPerformanceRecords(2).map((r) => r.id)).toEqual(['r4', 'r5']);
  });

  it('getPerformanceStats 汇总 total/average/max/min', () => {
    recordPerformance({ id: 'r1', name: 'R1', type: 'signal', duration: 10, timestamp: 0 });
    recordPerformance({ id: 'r2', name: 'R2', type: 'signal', duration: 30, timestamp: 0 });

    const s = getPerformanceStats();
    expect(s.totalRecords).toBe(2);
    expect(s.averageDuration).toBeCloseTo(20);
    expect(s.maxDuration).toBe(30);
    expect(s.minDuration).toBe(10);
    expect(s.byType.signal).toEqual({ count: 2, average: 20, max: 30 });
  });

  it('getPerformanceStats 按类型分组', () => {
    recordPerformance({ id: 'r1', name: 'R1', type: 'signal', duration: 10, timestamp: 0 });
    recordPerformance({ id: 'r2', name: 'R2', type: 'computed', duration: 20, timestamp: 0 });
    recordPerformance({ id: 'r3', name: 'R3', type: 'computed', duration: 40, timestamp: 0 });

    const s = getPerformanceStats();
    expect(s.byType.signal).toEqual({ count: 1, average: 10, max: 10 });
    expect(s.byType.computed).toEqual({ count: 2, average: 30, max: 40 });
  });

  it('无记录时统计全 0', () => {
    expect(getPerformanceStats()).toEqual({
      totalRecords: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      byType: {},
    });
  });

  it('clearPerformanceRecords 清空', () => {
    recordPerformance({ id: 'r1', name: 'R1', type: 'signal', duration: 10, timestamp: 0 });
    clearPerformanceRecords();

    expect(getPerformanceRecords()).toHaveLength(0);
  });
});

// ==================== 序列化 ====================

describe('序列化', () => {
  it('serializeSignalNode 含名称/类型/更新次数/依赖', () => {
    buildChain();
    recordSignalUpdate('b', 5);

    const text = serializeSignalNode(getSignalNode('b')!);
    expect(text).toContain('Beta');
    expect(text).toContain('(computed)');
    expect(text).toContain('更新次数: 1');
    expect(text).toContain('依赖: a');
    expect(text).toContain('被依赖: c');
  });

  it('serializeDependencyGraph 无数据时给出占位', () => {
    expect(serializeDependencyGraph()).toBe('暂无信号数据');
  });

  it('serializeDependencyGraph 含节点与边数', () => {
    buildChain();

    const text = serializeDependencyGraph();
    expect(text).toContain('3 个节点');
    expect(text).toContain('2 条边');
    expect(text).toContain('Alpha');
  });

  it('serializePerformanceStats 无数据时给出占位', () => {
    expect(serializePerformanceStats()).toBe('暂无性能数据');
  });

  it('serializePerformanceStats 含汇总与分类型', () => {
    recordPerformance({ id: 'r1', name: 'R1', type: 'signal', duration: 10, timestamp: 0 });

    const text = serializePerformanceStats();
    expect(text).toContain('总记录数: 1');
    expect(text).toContain('signal: 1 次');
  });
});

// ==================== 可视化布局 ====================

describe('getVisualLayoutGraph', () => {
  it('空注册表返回空图', () => {
    expect(getVisualLayoutGraph()).toEqual({ nodes: [], edges: [], width: 0, height: 0 });
  });

  it('分层：无依赖者在 level 0，依赖方层级递增', () => {
    buildChain();

    const g = getVisualLayoutGraph();
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    expect(byId.get('a')!.level).toBe(0);
    expect(byId.get('b')!.level).toBe(1);
    expect(byId.get('c')!.level).toBe(2);
  });

  it('每条依赖对应一条边，且出入度正确', () => {
    buildChain();

    const g = getVisualLayoutGraph();
    expect(g.edges).toHaveLength(2);

    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    expect(byId.get('a')!).toMatchObject({ inDegree: 0, outDegree: 1 });
    expect(byId.get('b')!).toMatchObject({ inDegree: 1, outDegree: 1 });
    expect(byId.get('c')!).toMatchObject({ inDegree: 1, outDegree: 0 });
  });

  it('★ 存在**环**时所有边都应出现在图里（不得静默丢边）', () => {
    // 环在用户代码里是**缺陷信号**，devtools 的职责恰恰是把它显示出来；
    // 若边被静默丢弃，环就看不出来了。
    registerSignal('a', 'A', 'signal', 1);
    registerSignal('b', 'B', 'computed', 2);
    recordDependency('a', 'b');
    recordDependency('b', 'a');

    const g = getVisualLayoutGraph();

    expect(g.edges).toHaveLength(2);
    expect(g.edges.map((e) => `${e.source}->${e.target}`).sort()).toEqual(['a->b', 'b->a']);
  });

  it('节点坐标与尺寸来自 LayoutOptions，可被覆盖', () => {
    buildChain();

    const g = getVisualLayoutGraph({ nodeWidth: 200, nodeHeight: 50 });
    expect(g.nodes.every((n) => n.width === 200 && n.height === 50)).toBe(true);

    const g2 = getVisualLayoutGraph();
    expect(g2.nodes.every((n) => n.width === 120 && n.height === 40)).toBe(true);
  });

  it('画布尺寸：加宽（同层多节点）与加深（链式依赖）各自增长', () => {
    const empty = getVisualLayoutGraph();
    expect(empty.width).toBe(0);

    registerSignal('a', 'A', 'signal');
    const one = getVisualLayoutGraph();

    // 同一层多一个节点 ⇒ 宽度增长（高度不变）
    registerSignal('b', 'B', 'signal');
    const wide = getVisualLayoutGraph();
    expect(wide.width).toBeGreaterThan(one.width);

    // 链式依赖 ⇒ 层级增加 ⇒ 高度增长
    clearSignalRegistry();
    buildChain();
    const deep = getVisualLayoutGraph();
    expect(deep.height).toBeGreaterThan(one.height);
  });
});

describe('getSubgraph', () => {
  it('depth=0 只含中心节点', () => {
    buildChain();

    const g = getSubgraph('b', 0);
    expect(g.nodes.map((n) => n.id)).toEqual(['b']);
    expect(g.edges).toHaveLength(0);
  });

  it('depth=1 含直接依赖与被依赖', () => {
    buildChain();

    const g = getSubgraph('b', 1);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('默认 depth=2 覆盖整条链', () => {
    buildChain();

    const g = getSubgraph('b');
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c']);
    expect(g.edges).toHaveLength(2);
  });

  it('★ 它是**读**操作：调用前后全局注册表必须完全不变', () => {
    buildChain();
    const before = JSON.stringify(getSignalNodes());

    getSubgraph('b', 1);

    expect(JSON.stringify(getSignalNodes())).toBe(before);
    expect(getSignalNodes()).toHaveLength(3);
  });

  it('★ 子图尺寸应与「只含这些节点」的图一致（不因边界外的依赖虚增层级）', () => {
    // 旧实现把全局注册表临时删到只剩子图节点，但**被删节点仍留在邻居的依赖集合里**
    // ⇒ `calculateNodeLevels` 会给这些「幽灵 id」分配层级 ⇒ 子图高度被虚增。
    buildChain();
    const sub = getSubgraph('b', 0); // 只含 b

    clearSignalRegistry();
    registerSignal('b', 'Beta', 'computed', 2);
    const same = getVisualLayoutGraph();

    expect(sub.width).toBe(same.width);
    expect(sub.height).toBe(same.height);
  });
});

// ==================== 搜索与过滤 ====================

describe('searchSignals / filterSignals', () => {
  it('按 name / id / type 不区分大小写搜索', () => {
    buildChain();

    expect(searchSignals('beta').map((n) => n.id)).toEqual(['b']); // 命中 name
    expect(searchSignals('gamma').map((n) => n.id)).toEqual(['c']); // 命中 name
    expect(searchSignals('COMPUTED').map((n) => n.id)).toEqual(['b']); // 命中 type（不区分大小写）
    expect(searchSignals('zzz')).toHaveLength(0);
  });

  it('filterSignals 按类型 / 更新次数 / 有无依赖过滤', () => {
    buildChain();
    recordSignalUpdate('b', 9);

    expect(filterSignals({ types: ['effect'] }).map((n) => n.id)).toEqual(['c']);
    expect(filterSignals({ minUpdateCount: 1 }).map((n) => n.id)).toEqual(['b']);
    expect(
      filterSignals({ hasDependencies: true })
        .map((n) => n.id)
        .sort(),
    ).toEqual(['b', 'c']);
    expect(
      filterSignals({ hasDependents: true })
        .map((n) => n.id)
        .sort(),
    ).toEqual(['a', 'b']);
    expect(filterSignals({})).toHaveLength(3);
  });
});

// ==================== 快照差异 ====================

describe('compareSnapshots / serializeSnapshotDiff', () => {
  it('识别 added / removed / changed', () => {
    const s1 = {
      id: '1',
      timestamp: 0,
      signals: { a: { value: 1, dependencies: [] }, b: { value: 2, dependencies: [] } },
    };
    const s2 = {
      id: '2',
      timestamp: 0,
      signals: { a: { value: 9, dependencies: [] }, c: { value: 3, dependencies: [] } },
    };

    const diff = compareSnapshots(s1, s2);
    expect(diff.changed).toEqual([{ id: 'a', oldValue: 1, newValue: 9 }]);
    expect(diff.removed).toEqual([{ id: 'b', value: 2 }]);
    expect(diff.added).toEqual([{ id: 'c', value: 3 }]);
  });

  it('值相同不算变化（Object.is）', () => {
    const mk = (v: unknown) => ({
      id: 'x',
      timestamp: 0,
      signals: { a: { value: v, dependencies: [] } },
    });

    expect(compareSnapshots(mk(1), mk(1)).changed).toHaveLength(0);
    expect(compareSnapshots(mk(1), mk(2)).changed).toHaveLength(1);
  });

  it('serializeSnapshotDiff 输出可读文本', () => {
    const s1 = { id: '1', timestamp: 0, signals: { a: { value: 1, dependencies: [] } } };
    const s2 = { id: '2', timestamp: 0, signals: { a: { value: 2, dependencies: [] } } };

    const text = serializeSnapshotDiff(compareSnapshots(s1, s2));
    expect(text).toContain('a');
  });
});
