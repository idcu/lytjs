# DevTools 使用指南

Lyt.js 提供了强大的浏览器开发者工具，帮助你调试和优化应用程序。

## 安装和集成

### 快速开始

在你的 Lyt.js 应用中集成 DevTools 非常简单：

```typescript
import { createApp } from '@lytjs/core';
import { createDevTools } from '@lytjs/devtools';

const app = createApp({
  template: `<div>{{ message }}</div>`,
  state: { message: 'Hello Lyt.js!' }
});

// 启用 DevTools
app.use(createDevTools());

app.mount('#app');
```

### 配置选项

你可以通过配置选项自定义 DevTools 的行为：

```typescript
app.use(createDevTools({
  width: 480,           // 面板宽度
  height: 640,          // 面板高度
  x: 100,               // 初始 X 位置
  y: 60,                // 初始 Y 位置
  autoShow: true,       // 是否自动显示
  title: 'My App Dev',  // 面板标题
  enablePerf: true,     // 启用性能面板
  enableMemory: true,   // 启用内存追踪
  enableRouter: true    // 启用路由面板
}));
```

## 功能模块

### 1. 组件树面板

查看应用的组件层级结构，支持：

- 组件搜索
- 组件选择
- 查看组件 props 和 state
- 高亮组件 DOM

**使用方法：**

1. 在组件树中选择一个组件
2. 查看右侧的组件详情
3. 点击"高亮"按钮查看对应 DOM 元素

### 2. 状态面板

监控和调试响应式状态：

- 查看当前状态值
- 状态变化历史
- 直接修改状态值
- 状态搜索和过滤

**使用方法：**

1. 在状态树中浏览状态
2. 点击值来编辑
3. 查看状态变化历史

### 3. 事件面板

跟踪和分析事件流：

- 查看事件触发历史
- 事件详情（参数、目标组件）
- 事件搜索和过滤

### 4. 时光旅行调试

让你可以回放状态变化历史：

- 状态快照
- 回退到之前的状态
- 状态对比
- 时间轴导航

**使用方法：**

1. 在历史记录中选择一个时间点
2. 点击"回退"按钮
3. 查看状态变化

### 5. 性能面板

监控应用性能：

- FPS（帧率）监控
- 组件渲染性能
- 内存使用情况
- 更新频率分析

**性能分析功能：**

```typescript
import { PerformanceCollector, ComponentProfiler } from '@lytjs/devtools';

const collector = new PerformanceCollector({ autoStart: true });
const profiler = new ComponentProfiler();

// 获取性能报告
const report = collector.getReport();
console.log(report.fps, report.memory);
```

### 6. 路由面板

监控路由导航：

- 当前路由信息
- 路由导航历史
- 路由参数和查询字符串
- 路由守卫状态

**与 Router 集成：**

```typescript
import { createRouter } from '@lytjs/router';
import { createDevTools } from '@lytjs/devtools';

const router = createRouter({
  routes: [...],
  // DevTools 会自动集成
});

app.use(router);
app.use(createDevTools({ enableRouter: true }));
```

## 键盘快捷键

DevTools 提供了便捷的键盘快捷键：

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Shift+D | 切换 DevTools 面板显示/隐藏 |
| Escape | 关闭 DevTools 面板 |
| Ctrl+1-6 | 切换到对应标签页 |

## API 参考

### createDevTools(config)

创建 DevTools 插件实例。

**参数：**

```typescript
interface DevToolsConfig {
  width?: number;           // 默认 420
  height?: number;          // 默认 560
  x?: number;               // 默认右下角
  y?: number;               // 默认 60
  autoShow?: boolean;       // 默认 true
  title?: string;           // 默认 'Lyt DevTools'
  enablePerf?: boolean;     // 默认 true
  enableMemory?: boolean;   // 默认 true
  enableRouter?: boolean;   // 默认 true
}
```

**返回：** 插件对象，包含 install 方法。

### DevTools 类

DevTools 实例提供了以下方法：

```typescript
interface DevTools {
  // 面板控制
  show(): void;
  hide(): void;
  toggle(): void;
  isVisible(): boolean;

  // 获取子模块
  getPanel(): DevToolsPanel;
  getComponentTree(): ComponentTreeInspector;
  getStateInspector(): StateInspector;
  getEventTracker(): EventTracker;
  getTimeTravel(): TimeTravelDebugger;
  getPerfPanel(): PerfPanel | null;
  getRouterPanel(): RouterPanel | null;

  // 其他方法
  refreshTree(): void;
  clearAllRecords(): void;
  destroy(): void;
}
```

## 生产环境

在生产环境中，你应该禁用 DevTools 来减小包大小：

```typescript
import { createApp } from '@lytjs/core';

const app = createApp({...});

// 只在开发环境启用
if (import.meta.env.DEV) {
  const { createDevTools } = await import('@lytjs/devtools');
  app.use(createDevTools());
}

app.mount('#app');
```

## 浏览器扩展（待开发）

未来版本将提供浏览器扩展形式的 DevTools，提供更好的体验。

## 最佳实践

1. **在开发环境始终启用 DevTools**：可以大大提高开发效率
2. **使用性能面板监控 FPS**：确保应用流畅度
3. **利用时光旅行调试**：快速定位状态问题
4. **定期检查内存使用**：防止内存泄漏
5. **查看事件面板**：优化事件处理逻辑

## 故障排除

### DevTools 面板不显示

确保：
- 你已调用 `app.use(createDevTools())`
- 浏览器控制台没有错误
- 尝试使用 Ctrl+Shift+D 快捷键

### 性能数据不准确

确保：
- 你在开发环境中使用
- 没有启用生产模式优化
- 页面没有被缓存

### 路由面板为空

确保：
- 你已启用 `enableRouter: true`
- 已集成 `@lytjs/router`
- 有路由导航发生

## 更多资源

- [API 参考](/api/devtools.md)
- [Router 使用指南](/guide/router.md)
- [性能优化指南](/guide/performance.md)
- [开发者文档](/developer/README.md)
