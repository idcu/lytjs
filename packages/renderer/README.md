# @lytjs/renderer

> LytJS 渲染后端，提供 DOM 渲染、SSR 渲染、Signal 渲染、Hydration 和 Island Architecture 支持

## 安装

```bash
npm install @lytjs/renderer
```

## 渲染器类型

### DOM 渲染器

用于浏览器端的 DOM 渲染

```typescript
import { createDOMRenderer } from '@lytjs/renderer';

const renderer = createDOMRenderer();
renderer.render(vnode, document.getElementById('app'));
```

### Signal 渲染器

用于细粒度响应式更新（Vapor 模式）

```typescript
import { createSignalRenderer, createVaporRenderer } from '@lytjs/renderer';

// Signal 渲染器
const signalRenderer = await createSignalRenderer();

// Vapor 渲染器（Signal 渲染器的别名）
const vaporRenderer = await createVaporRenderer();
```

### SSR 渲染器

用于服务端渲染

```typescript
import { renderToString, renderToStream } from '@lytjs/renderer';

// 渲染为字符串
const html = await renderToString(vnode);

// 流式渲染
const stream = await renderToStream(vnode, {
  onChunk: (chunk) => res.write(chunk),
});
```

## 核心 API

### createRenderer

创建自定义渲染器实例

```typescript
import { createRenderer, type RendererOptions } from '@lytjs/renderer';

const options: RendererOptions = {
  createElement: (tag) => document.createElement(tag),
  insert: (el, parent, anchor) => parent.insertBefore(el, anchor),
  // ...
};

const renderer = createRenderer(options);
```

### createDOMRenderer

创建 DOM 渲染器实例

```typescript
import { createDOMRenderer } from '@lytjs/renderer';

const renderer = createDOMRenderer();
```

### patchProp / patchClass / patchStyle / patchEvent / patchAttr

DOM 属性更新工具函数

```typescript
import {
  patchProp,
  patchClass,
  patchStyle,
  patchEvent,
  patchAttr,
  normalizeEventName,
  getEventKey,
  parseEventModifier,
  createInvoker,
} from '@lytjs/renderer';

// 更新属性
patchProp(el, 'class', prevValue, nextValue);

// 更新 class
patchClass(el, 'active visible');

// 更新 style
patchStyle(el, { color: 'red', fontSize: '14px' });

// 更新事件
patchEvent(el, 'onClick', prevHandler, nextHandler);
```

## Hydration

### createHydrationFunctions

创建服务端渲染 Hydration 函数

```typescript
import { createHydrationFunctions } from '@lytjs/renderer';

const { hydrate, hydrateNode } = createHydrationFunctions(options);
```

## Island Architecture

Island Architecture 用于在 SSR 页面中实现部分区域的客户端交互

### hydrateIsland

水合单个 Island 组件

```typescript
import { hydrateIsland, registerIslandComponent } from '@lytjs/renderer';

// 注册 Island 组件
await registerIslandComponent('Counter', CounterComponent);

// 水合 Island
const islandEl = document.querySelector('[data-island="Counter"]');
await hydrateIsland(islandEl, CounterComponent, { initialCount: 0 });
```

### registerIslandComponent

注册 Island 组件供后续水合使用

```typescript
import { registerIslandComponent } from '@lytjs/renderer';

await registerIslandComponent('MyComponent', MyComponent);
```

### createIslandSSRContent

创建 Island SSR 内容

```typescript
import { createIslandSSRContent } from '@lytjs/renderer';

const html = await createIslandSSRContent(vnode, {
  islandId: 'Counter',
});
```

## 懒加载

渲染器支持懒加载大型模块，减少初始包体积：

```typescript
// SSR 相关函数使用动态导入
import { renderToString, renderToStream } from '@lytjs/renderer';

// 这些函数会按需加载 SSR 模块
const html = await renderToString(vnode);

// Signal/Vapor 渲染器也是懒加载的
const signalRenderer = await createSignalRenderer();
```

## 渲染器插件系统

### use

安装渲染器插件

```typescript
import { use, type RendererPlugin } from '@lytjs/renderer';

const myPlugin: RendererPlugin = {
  name: 'MyPlugin',
  install(context) {
    context.on('beforeMount', (vnode) => {
      console.log('Before mount:', vnode);
    });
  },
  beforeMount(vnode) {
    console.log('Will mount:', vnode);
  },
};

use(myPlugin);
```

### 插件生命周期钩子

```typescript
interface RendererPlugin {
  name: string;
  install: (context: PluginContext) => void;
  beforeMount?: (vnode: VNode) => void;
  afterMount?: (vnode: VNode, container: unknown) => void;
  beforePatch?: (oldVNode: VNode, newVNode: VNode) => void;
  afterPatch?: (vnode: VNode) => void;
  beforeUnmount?: (vnode: VNode) => void;
  afterUnmount?: (vnode: VNode) => void;
}
```

### 插件管理

```typescript
import { use, getInstalledPlugins, isPluginInstalled, removePlugin } from '@lytjs/renderer';

// 安装插件
use(myPlugin);

// 检查插件是否已安装
if (isPluginInstalled('MyPlugin')) {
  console.log('Plugin is installed');
}

// 获取所有已安装插件
const plugins = getInstalledPlugins();

// 移除插件
removePlugin('MyPlugin');
```

## Vapor 模式

Vapor 模式提供无虚拟 DOM 的细粒度响应式渲染

### createVaporApp

创建 Vapor 应用

```typescript
import { createVaporApp, defineVaporComponent } from '@lytjs/renderer';

const MyComponent = await defineVaporComponent({
  setup() {
    const count = signal(0);
    return () => html`<div>${count()}</div>`;
  },
});

const app = await createVaporApp(MyComponent);
app.mount('#app');
```

### defineVaporComponent

定义 Vapor 组件

```typescript
import { defineVaporComponent } from '@lytjs/renderer';

const Counter = await defineVaporComponent({
  props: {
    initialCount: { type: Number, default: 0 },
  },
  setup(props) {
    // 组件逻辑
  },
});
```

## 组件资源清理

```typescript
import {
  registerComponentEventListener,
  registerComponentEffectSubscription,
  registerComponentCleanup,
  cleanupComponentResources,
} from '@lytjs/renderer';

// 注册事件监听器（卸载时自动清理）
registerComponentEventListener(instance, target, 'click', handler);

// 注册 effect 订阅（卸载时自动清理）
registerComponentEffectSubscription(instance, subscription);

// 注册自定义清理函数
registerComponentCleanup(instance, () => {
  // 清理逻辑
});

// 手动清理所有资源
cleanupComponentResources(instance);
```

## 首次渲染优化

```typescript
import {
  withFirstRenderOptimization,
  shouldSkipTracking,
  getSkippedTrackingCount,
  resetSkippedTrackingCount,
} from '@lytjs/renderer';

// 使用首次渲染优化
withFirstRenderOptimization(() => {
  // 首次渲染时跳过不必要的追踪
});

// 检查是否跳过追踪
if (shouldSkipTracking()) {
  console.log('Tracking is skipped');
}
```

## 工具函数

```typescript
import { escapeHtml, isBooleanAttr, isVoidElement } from '@lytjs/renderer';

// HTML 转义
const safe = escapeHtml('<script>alert("xss")</script>');

// 检查布尔属性
if (isBooleanAttr('disabled')) {
  // 处理布尔属性
}

// 检查自闭合标签
if (isVoidElement('img')) {
  // 自闭合标签处理
}
```

## 类型定义

```typescript
import type {
  VNode,
  RendererOptions,
  RendererPlugin,
  PluginContext,
  LifecycleEvent,
  DOMRenderer,
  SignalRenderer,
  VaporRenderer,
  VaporApp,
  VaporComponentOptions,
  HydrationRenderer,
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  HostEvent,
  HostEventHandler,
} from '@lytjs/renderer';
```

## 相关包

- [@lytjs/vdom](../vdom) - 虚拟 DOM 实现，渲染器的基础
- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/adapter-web](../adapter-web) - Web 平台适配器
- [@lytjs/host-contract](../host-contract) - 渲染器宿主抽象
