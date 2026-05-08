# @lytjs/devtools

> LytJS 浏览器 DevTools 扩展后端，用于调试 LytJS 应用。

## 安装

```bash
pnpm add -D @lytjs/devtools
```

## 功能

### 组件树检查

查看组件层次结构、props、slots 和事件。

### Signal 状态追踪

实时监控 ref、reactive、computed、signal 的值变化。

### 事件记录

记录组件生命周期事件、Signal 变化、路由导航等。

### 时间旅行调试

拍摄应用状态快照，支持状态回溯和对比。

## API

### 启用 DevTools

```typescript
import { activateBridge } from '@lytjs/devtools';
activateBridge();
```

### 编程式使用

```typescript
import {
  getComponentTree,
  getSignals,
  recordEvent,
  takeSnapshot,
} from '@lytjs/devtools';

// 获取组件树
const tree = getComponentTree();

// 获取所有 Signal 状态
const signals = getSignals();

// 拍摄快照
const snapshot = takeSnapshot();
```
