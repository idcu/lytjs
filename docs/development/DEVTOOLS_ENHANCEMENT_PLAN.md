# DevTools 增强计划

> 本文档描述 v6.1 版本 DevTools 增强的具体实施方案。

## 一、现状分析

### 1.1 现有功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 信号管理 | 注册/注销/查询 | ✅ 已完成 |
| 依赖追踪 | 依赖关系记录 | ✅ 已完成 |
| 快照系统 | 时间旅行快照 | ✅ 已完成 |
| 性能监控 | FPS/内存/渲染时间 | ✅ 已完成 |
| 告警系统 | 性能告警规则 | ✅ 已完成 |
| 组件树 | 组件层级检查 | ✅ 已完成 |

### 1.2 待增强功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 信号依赖关系可视化优化 | 🔴 高 | 支持图形化展示和交互 |
| VDOM 节点树检查 | 🟡 中 | 树形结构展示虚拟 DOM |
| 性能时序分析增强 | 🟡 中 | 添加时序图和火焰图 |
| 时间旅行调试体验优化 | 🟡 中 | 更流畅的导航体验 |

## 二、任务分解

### 2.1 信号依赖关系可视化优化

**目标**：提供图形化的信号依赖关系展示

**实现方案**：
1. 扩展 `signalsInspector.ts`，添加图形化数据导出
2. 支持节点定位和高亮
3. 添加过滤和搜索功能
4. 支持导出依赖图数据（用于面板渲染）

**API 增强**：
```typescript
// 新增：获取可视化布局数据
export interface VisualizableGraph {
  nodes: Array<{
    id: string;
    name: string;
    type: 'signal' | 'computed' | 'effect';
    x: number;
    y: number;
    level: number;  // 层级（用于布局）
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'dependency';
  }>;
}

export function getVisualizableGraph(options?: {
  centerId?: string;
  depth?: number;
}): VisualizableGraph;
```

### 2.2 VDOM 节点树检查

**目标**：提供虚拟 DOM 树形结构检查

**实现方案**：
1. 创建 `vdomInspector.ts` 模块
2. 实现节点树构建和序列化
3. 支持节点搜索和过滤
4. 提供展开/折叠功能

**API 设计**：
```typescript
export interface VNodeInfo {
  type: string;
  tag?: string;
  props?: Record<string, unknown>;
  children?: VNodeInfo[];
  key?: string | number;
  ref?: string;
}

export function captureVDOMTree(): VNodeInfo;
export function searchVDOMNodes(predicate: (node: VNodeInfo) => boolean): VNodeInfo[];
```

### 2.3 性能时序分析增强

**目标**：提供更详细的性能时序分析

**实现方案**：
1. 扩展 `performance.ts`，添加时序事件记录
2. 支持自定义时序标记
3. 导出火焰图数据格式
4. 添加慢操作分析

**API 增强**：
```typescript
export interface TimelineEvent {
  id: string;
  name: string;
  category: 'render' | 'effect' | 'custom';
  startTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

export function markTimelineEvent(event: Omit<TimelineEvent, 'id' | 'startTime'>): string;
export function getFlameGraphData(): FlameGraphNode;
export function getSlowOperations(limit?: number): TimelineEvent[];
```

### 2.4 时间旅行调试体验优化

**目标**：提供更流畅的时间旅行调试体验

**实现方案**：
1. 添加快照比较功能
2. 支持差异高亮
3. 添加快捷键导航
4. 支持批量快照操作

**API 增强**：
```typescript
export interface SnapshotDiff {
  added: string[];
  removed: string[];
  changed: Array<{
    id: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

export function compareSnapshots(snapshot1: Snapshot, snapshot2: Snapshot): SnapshotDiff;
export function restoreToIndex(index: number): void;
export function getTimeTravelKeyboardShortcuts(): Record<string, () => void>;
```

## 三、实施计划

### Phase 1：信号依赖可视化（1周）

| 任务 | 状态 | 负责人 |
|------|------|--------|
| 分析现有依赖图实现 | ✅ | - |
| 设计可视化数据格式 | 🔄 进行中 | - |
| 实现布局算法 | ⬜ | - |
| 添加过滤和搜索 | ⬜ | - |
| 单元测试 | ⬜ | - |

### Phase 2：VDOM 检查器（0.5周）

| 任务 | 状态 |
|------|------|
| 创建 vdomInspector.ts | ⬜ |
| 实现节点树构建 | ⬜ |
| 添加搜索功能 | ⬜ |
| 单元测试 | ⬜ |

### Phase 3：性能时序增强（0.5周）

| 任务 | 状态 |
|------|------|
| 添加时序事件 API | ⬜ |
| 实现火焰图数据导出 | ⬜ |
| 增强慢操作分析 | ⬜ |
| 单元测试 | ⬜ |

### Phase 4：时间旅行优化（0.5周）

| 任务 | 状态 |
|------|------|
| 实现快照比较 | ⬜ |
| 添加快捷键支持 | ⬜ |
| 优化导航体验 | ⬜ |
| 单元测试 | ⬜ |

## 四、性能目标

| 指标 | 目标 | 说明 |
|------|------|------|
| DevTools 初始化时间 | < 50ms | 冷启动时间 |
| 信号查询响应 | < 10ms | 1000 个信号场景 |
| 依赖图生成 | < 100ms | 100 个节点 |
| 内存开销 | < 5% | 启用监控后 |

## 五、兼容性

- 保持与现有 API 兼容
- 向后兼容所有现有功能
- 不引入新的外部依赖

## 六、测试计划

| 测试类型 | 覆盖率目标 |
|----------|-----------|
| 单元测试 | 90%+ |
| 集成测试 | 核心流程 100% |
| 性能测试 | < 5% 性能开销 |

---

**文档版本**：v1.0.0
**创建时间**：2026-05-16
**计划完成**：v6.1 正式版
