# @lytjs/devtools

Lyt.js 开发者工具 - 提供组件树、状态查看、性能分析等功能。

## 安装

```bash
npm install @lytjs/devtools

# 或使用 pnpm
pnpm add @lytjs/devtools
```

## 特性

- 🌲 组件树查看
- 📊 状态数据查看
- ⏱️ 性能分析
- 🔍 组件状态检查
- 🎯 零运行时依赖

## 快速开始

```javascript
import { createApp } from '@lytjs/core';
import { devtools } from '@lytjs/devtools';

const app = createApp(App);
app.use(devtools);
app.mount('#app');
```

## 功能

### 组件树

查看应用的组件层次结构，包括：

- 组件名称
- 组件实例数量
- 组件状态（是否活跃）
- 组件嵌套关系

### 状态查看

查看和编辑组件的响应式状态：

- ref 值
- reactive 对象
- computed 属性
- watchers

### 性能分析

分析应用的性能数据：

- 组件渲染时间
- 响应式更新频率
- DOM 操作次数
- 内存使用情况

### 时间旅行

记录状态变化，支持时间旅行调试：

- 记录状态历史
- 跳转到任意状态
- 重放状态变化

## API 参考

### 安装插件

```javascript
import { devtools } from '@lytjs/devtools';

app.use(devtools, {
  enabled: true, // 是否启用
  maxHistory: 50 // 历史记录最大条数
});
```

### 核心 API

```javascript
import { DevTools } from '@lytjs/devtools';

const devtools = new DevTools();

// 启用
devtools.enable();

// 禁用
devtools.disable();

// 查看组件树
const componentTree = devtools.getComponentTree();

// 查看性能数据
const performanceData = devtools.getPerformanceData();
```

## 示例

### 性能监控

```javascript
import { devtools } from '@lytjs/devtools';

app.use(devtools, {
  performance: {
    enabled: true,
    samplingRate: 1000
  }
});

// 性能统计
const stats = devtools.getPerformanceStats();
console.log('Component render time:', stats.componentRenderTime);
```

### 时间旅行调试

```javascript
import { devtools } from '@lytjs/devtools';

const stateHistory = devtools.getStateHistory();

// 跳转到某个时间点
devtools.jumpToState(stateHistory[10]);

// 重放状态
devtools.replayStates();
```

## 性能

- 轻量级开发者工具
- 非侵入式集成
- 低性能开销
- 可选启用/禁用

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
