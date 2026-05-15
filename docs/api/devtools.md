# @lytjs/devtools-extension

> LytJS 浏览器 DevTools 扩展后端，用于调试 LytJS 应用。

## 安装

```bash
pnpm add -D @lytjs/devtools-extension
```

## 功能

### 组件树检查

查看组件层次结构、props、slots 和事件。

### Signal 状态追踪

实时监控 ref、reactive、computed、signal 的值变化。

### 状态编辑器

在 DevTools 面板中直接编辑组件状态，修改即时反映到视图。

### 时间旅行调试

拍摄应用状态快照，支持前进/后退/跳转，状态对比分析。

### 性能面板

监控渲染性能、FPS、内存趋势，定位性能瓶颈。

### 事件记录

记录组件生命周期事件、Signal 变化、路由导航等。

---

## API

### 启用 DevTools

```typescript
import { activateBridge } from '@lytjs/devtools-extension';
activateBridge();
```

---

## 状态管理 API

### getState()

获取 DevTools 当前状态。

```typescript
import { getState } from '@lytjs/devtools-extension';

const state = getState();
// { enabled: boolean, connected: boolean, recording: boolean }
```

### enable() / disable()

启用或禁用 DevTools。

```typescript
import { enable, disable } from '@lytjs/devtools-extension';

enable();
disable();
```

### startRecording() / stopRecording()

开始或停止状态录制。

```typescript
import { startStateRecording, stopStateRecording } from '@lytjs/devtools-extension';

startStateRecording();
stopStateRecording();
```

### subscribeState()

订阅状态变化。

```typescript
import { subscribeState } from '@lytjs/devtools-extension';

const unsubscribe = subscribeState((state) => {
  console.log('State changed:', state);
});
```

---

## 组件树 API

### registerComponent()

注册组件实例。

```typescript
import { registerComponent } from '@lytjs/devtools-extension';

registerComponent({
  id: 'comp-1',
  name: 'Counter',
  parentId: null,
  props: { initialCount: 0 },
});
```

### getComponentTree()

获取组件树结构。

```typescript
import { getComponentTree } from '@lytjs/devtools-extension';

const tree = getComponentTree();
// ComponentTreeNode[]
```

### getComponentById()

根据 ID 获取组件。

```typescript
import { getComponentById } from '@lytjs/devtools-extension';

const comp = getComponentById('comp-1');
```

### getRootComponents()

获取根组件列表。

```typescript
import { getRootComponents } from '@lytjs/devtools-extension';

const roots = getRootComponents();
```

---

## Signal API

### registerSignal()

注册 Signal 状态。

```typescript
import { registerSignal } from '@lytjs/devtools-extension';

registerSignal({
  id: 'sig-1',
  name: 'count',
  value: 0,
  type: 'writable',
});
```

### getSignals()

获取所有注册的 Signal。

```typescript
import { getSignals } from '@lytjs/devtools-extension';

const signals = getSignals();
// SignalInfo[]
```

### getSignalValue() / setSignalValue()

获取或设置 Signal 值。

```typescript
import { getSignalValue, setSignalValue } from '@lytjs/devtools-extension';

const value = getSignalValue('sig-1');
setSignalValue('sig-1', 10);
```

---

## 事件 API

### recordEvent()

记录开发工具事件。

```typescript
import { recordEvent } from '@lytjs/devtools-extension';

recordEvent('component:mounted', {
  componentId: 'comp-1',
  componentName: 'Counter',
});
```

### getEvents()

获取所有记录的事件。

```typescript
import { getEvents } from '@lytjs/devtools-extension';

const events = getEvents();
const signalEvents = getEventsByType(['signal:changed']);
```

---

## 快照 API

### takeSnapshot()

拍摄当前状态快照。

```typescript
import { takeSnapshot } from '@lytjs/devtools-extension';

const snapshot = takeSnapshot();
```

### restoreSnapshot()

恢复到指定快照。

```typescript
import { restoreSnapshot } from '@lytjs/devtools-extension';

restoreSnapshot(snapshotId);
```

### exportSnapshots() / importSnapshots()

导出或导入快照数据。

```typescript
import { exportSnapshots, importSnapshots } from '@lytjs/devtools-extension';

const data = exportSnapshots();
importSnapshots(data);
```

---

## 状态编辑器 API

### extractComponentState()

提取组件的完整状态。

```typescript
import { extractComponentState } from '@lytjs/devtools-extension';

const state = extractComponentState('comp-1');
// { componentId, componentName, state: {...}, props: {...} }
```

### applyStateEdit()

应用状态编辑。

```typescript
import { applyStateEdit } from '@lytjs/devtools-extension';

const result = applyStateEdit('comp-1', 'count', 42);
// { success: true, oldValue: 0, newValue: 42 }
```

### getEditHistory() / undoLastEdit()

获取编辑历史和撤销操作。

```typescript
import { getEditHistory, undoLastEdit, clearEditHistory } from '@lytjs/devtools-extension';

const history = getEditHistory();
undoLastEdit();
clearEditHistory();
```

### parseValue() / formatValue()

值解析和格式化工具。

```typescript
import { parseValue, formatValue } from '@lytjs/devtools-extension';

parseValue('123', 'number');    // 123
parseValue('"hello"', 'string'); // "hello"
formatValue({ a: 1 });         // '{\n  "a": 1\n}'
```

---

## 时间旅行 API

### startHistoryRecording() / stopHistoryRecording()

开始或停止历史录制。

```typescript
import { startHistoryRecording, stopHistoryRecording } from '@lytjs/devtools-extension';

startHistoryRecording();
stopHistoryRecording();
```

### jumpToHistory()

跳转到指定历史记录点。

```typescript
import { jumpToHistory } from '@lytjs/devtools-extension';

jumpToHistory(5); // 跳转到第 5 条记录
```

### goBack() / goForward()

前进或后退一步。

```typescript
import { goBack, goForward } from '@lytjs/devtools-extension';

goBack();   // 后退一步
goForward(); // 前进一步
```

### goToStart() / goToEnd()

跳转到起点或终点。

```typescript
import { goToStart, goToEnd } from '@lytjs/devtools-extension';

goToStart(); // 跳转到最初状态
goToEnd();   // 跳转到最新状态
```

### getHistory()

获取历史记录列表。

```typescript
import { getHistory, getCurrentIndex } from '@lytjs/devtools-extension';

const history = getHistory();
const currentIndex = getCurrentIndex();
```

### compareSnapshots()

比较两个快照的差异。

```typescript
import { compareSnapshots } from '@lytjs/devtools-extension';

const diffs = compareSnapshots(snapshot1, snapshot2);
// StateDiff[]
```

### exportHistory() / importHistory()

导出或导入历史数据。

```typescript
import { exportHistory, importHistory } from '@lytjs/devtools-extension';

const data = exportHistory();
importHistory(data);
```

---

## 性能面板 API

### recordComponentRender()

记录组件渲染信息。

```typescript
import { recordComponentRender } from '@lytjs/devtools-extension';

recordComponentRender('comp-1', {
  renderTime: 5.2,
  timestamp: Date.now(),
});
```

### startPerformanceMonitoring() / stopPerformanceMonitoring()

开始或停止性能监控。

```typescript
import { startPerformanceMonitoring, stopPerformanceMonitoring } from '@lytjs/devtools-extension';

startPerformanceMonitoring();
stopPerformanceMonitoring();
```

### getComponentPerformance()

获取单个组件的性能数据。

```typescript
import { getComponentPerformance, getAllComponentPerformance } from '@lytjs/devtools-extension';

const perf = getComponentPerformance('comp-1');
// ComponentPerformance

const all = getAllComponentPerformance();
// ComponentPerformance[]
```

### getRenderHeatmap()

获取渲染热力图数据。

```typescript
import { getRenderHeatmap } from '@lytjs/devtools-extension';

const heatmap = getRenderHeatmap();
```

### getPerformanceTimeline()

获取性能时间线。

```typescript
import { getPerformanceTimeline } from '@lytjs/devtools-extension';

const timeline = getPerformanceTimeline();
```

### getMemoryTrend()

获取内存趋势数据。

```typescript
import { getMemoryTrend } from '@lytjs/devtools-extension';

const trend = getMemoryTrend();
```

### updatePerformanceConfig()

更新性能监控配置。

```typescript
import { updatePerformanceConfig, getPerformanceConfig } from '@lytjs/devtools-extension';

updatePerformanceConfig({
  fpsThreshold: 30,
  slowRenderThreshold: 16,
});
```

### suggestGarbageCollection()

建议执行垃圾回收。

```typescript
import { suggestGarbageCollection } from '@lytjs/devtools-extension';

suggestGarbageCollection();
```

---

## 面板集成 API

### initDevToolsPanel()

初始化 DevTools 面板。

```typescript
import { initDevToolsPanel, setActiveTab, getActiveTab } from '@lytjs/devtools-extension';

initDevToolsPanel();
setActiveTab('components'); // components | signals | timeline | performance
```

---

## 桥接 API

### sendToPanel()

发送消息到面板。

```typescript
import { sendToPanel } from '@lytjs/devtools-extension';

sendToPanel({
  type: 'STATE_UPDATE',
  payload: { /* ... */ },
});
```

### onPanelMessage()

监听面板消息。

```typescript
import { onPanelMessage } from '@lytjs/devtools-extension';

const unsubscribe = onPanelMessage((message) => {
  console.log('Panel message:', message);
});
```

---

## 类型

### DevToolsState

```typescript
interface DevToolsState {
  enabled: boolean;
  connected: boolean;
  recording: boolean;
}
```

### SignalInfo

```typescript
interface SignalInfo {
  id: string;
  name: string;
  value: unknown;
  type: 'writable' | 'computed' | 'readonly';
  dependencies?: string[];
  dependents?: string[];
}
```

### DevToolsEvent

```typescript
interface DevToolsEvent {
  id: string;
  type: EventType;
  timestamp: number;
  payload: unknown;
  componentId?: string;
}
```

### StateSnapshot

```typescript
interface StateSnapshot {
  id: string;
  timestamp: number;
  components: ComponentTreeNode[];
  signals: SignalInfo[];
  events: DevToolsEvent[];
}
```

### ComponentTreeNode

```typescript
interface ComponentTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  children: ComponentTreeNode[];
  props: Record<string, unknown>;
  slots: string[];
  isFragment: boolean;
}
```

### ComponentPerformance

```typescript
interface ComponentPerformance {
  componentId: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  lastRenderTimestamp: number;
}
```
