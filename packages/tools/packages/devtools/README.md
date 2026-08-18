# @lytjs/devtools-extension

LytJS 浏览器开发者工具，内置 Chrome 扩展（`extension/` 目录），用于调试 LytJS 应用的状态、组件树、响应式 Signal、事件、状态快照与性能数据。

> 注意：包名为 `@lytjs/devtools-extension`（非 `@lytjs/devtools`），与仓库目录名 `devtools` 不同。

## 安装

```bash
pnpm add @lytjs/devtools-extension
```

## 接入方式

`@lytjs/devtools-extension` 提供三种接入方式：

### 1. 底层函数（启用/禁用 DevTools）

```typescript
import { enable, disable, getState, setConnected } from '@lytjs/devtools-extension';

enable(); // 启用 DevTools
console.log(getState()); // 当前 DevTools 状态
```

### 2. 统一 API（推荐）

```typescript
import { createDevToolsAPI } from '@lytjs/devtools-extension';

const api = createDevToolsAPI();
api.enable();
api.getComponentTree(); // 组件树
api.getSignals(); // 信号列表
api.startRecording(); // 开始记录事件
api.getEvents(); // 获取事件
api.takeSnapshot(); // 状态快照
api.restoreSnapshot(snapshot); // 恢复快照
api.sendToPanel(message); // 向面板发送消息
```

### 3. 面板桥接（Bridge）

```typescript
import { activateBridge, sendToPanel, onPanelMessage } from '@lytjs/devtools-extension';

activateBridge(); // 激活桥接

// 监听面板消息
const off = onPanelMessage('edit-state', (msg) => {
  console.log(msg.payload);
});

// 向面板发送消息
sendToPanel({ type: 'init', payload: { app: 'my-app' } });
```

## 能力概览

| 能力域                  | 说明                                       | 主要导出                                                                                                                                                               |
| ----------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 状态 (State)            | 全局 DevTools 开关与连接状态，支持录制状态 | `enable`、`disable`、`getState`、`setConnected`、`startStateRecording`、`subscribeState`                                                                               |
| 组件树 (Component Tree) | 组件注册与层级树构建                       | `registerComponent`、`buildComponentTree`、`getComponentTree`、`getComponentById`、`getRootComponents`、`autoRegisterFromInstance`                                     |
| 信号 (Signals)          | 响应式 Signal 的注册、取值与修改           | `registerSignal`、`getSignals`、`getSignalById`、`setSignalValue`、`getSignalsByComponent`                                                                             |
| 事件 (Events)           | 事件录制与统计                             | `startEventRecording`、`recordEvent`、`getEvents`、`getEventStats`、`getEventsByComponent`、`setMaxEvents`                                                             |
| 快照 (Snapshots)        | 状态快照的创建、恢复、导入导出             | `takeSnapshot`、`restoreSnapshot`、`exportSnapshots`、`importSnapshots`                                                                                                |
| 桥接 (Bridge)           | DevTools 与面板通信                        | `activateBridge`、`sendToPanel`、`broadcastToPanel`、`onPanelMessage`                                                                                                  |
| Store / Router 集成     | 跟踪 store 变更与路由导航                  | `trackStoreMutation`、`registerStoreSignals`、`trackRouterNavigation`                                                                                                  |
| 面板 (Panel)            | 面板初始化与 Tab 管理                      | `initDevToolsPanel`、`setActiveTab`、`isPanelInitialized`                                                                                                              |
| 状态编辑 (State Editor) | 组件状态的读取、编辑与撤销                 | `initStateEditor`、`applyStateEdit`、`extractComponentState`、`undoLastEdit`                                                                                           |
| 时间旅行 (Time Travel)  | 历史记录录制与状态跳转                     | `initTimeTravel`、`startHistoryRecording`、`jumpToHistory`、`goBack`/`goForward`、`exportHistory`/`downloadHistory`                                                    |
| 性能 (Performance)      | 组件渲染性能、热力图与内存趋势             | `initPerformancePanel`、`recordComponentRender`、`getComponentPerformance`、`getRenderHeatmap`、`getPerformanceTimeline`、`getMemoryTrend`、`suggestGarbageCollection` |

## 展开的 DevTools 面板

`@lytjs/devtools-extension` 内置浏览器扩展源码（`extension/` 目录，含 `injected.js`、`panel.js`、`panel.css` 与图标），通过 `initDevToolsPanel` 初始化的面板提供组件树、Signal、事件、时间旅行、性能热力图等可视化调试视图。

## 相关包

- `@lytjs/core` - LytJS 核心运行时
- `@lytjs/reactivity` - 响应式系统（Signal 数据源）
- `@lytjs/component` - 组件系统
- `@lytjs/common-string` - 通用字符串工具

## 许可证

[MIT](../../../../LICENSE)
