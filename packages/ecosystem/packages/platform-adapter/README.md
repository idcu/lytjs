# @lytjs/platform-adapter

> LytJS 跨平台渲染适配器，提供统一的渲染器抽象层，支持多平台扩展。

[![npm version](https://img.shields.io/npm/v/@lytjs/platform-adapter.svg)](https://www.npmjs.com/package/@lytjs/platform-adapter)
[![license](https://img.shields.io/npm/l/@lytjs/platform-adapter.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/platform-adapter` 是 LytJS 框架的跨平台渲染适配器包，提供了一套统一的渲染器抽象接口，允许开发者为不同平台（Web、移动端、桌面端、服务端等）创建自定义渲染适配器。它实现了适配器注册表模式，支持插件扩展和运行时平台切换。

### 核心特性

- **统一抽象层**：为不同平台提供统一的渲染器接口
- **适配器注册表**：集中管理所有平台适配器
- **插件扩展系统**：支持通过插件扩展适配器功能
- **运行时切换**：支持在运行时动态切换平台
- **类型安全**：完整的 TypeScript 类型推导
- **零外部依赖**：完全基于原生 API 实现
- **可扩展架构**：易于添加新的平台支持

## 安装

```bash
npm install @lytjs/platform-adapter
```

或使用 pnpm：

```bash
pnpm add @lytjs/platform-adapter
```

## 依赖关系

`@lytjs/platform-adapter` 依赖以下 LytJS 核心包：

- `@lytjs/vdom` - 虚拟 DOM
- `@lytjs/common-vnode` - VNode 类型定义
- `@lytjs/common-is` - 工具函数
- `@lytjs/common-constants` - 常量定义

## 快速开始

### 创建渲染器

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

const renderer = createPlatformRenderer({
  name: 'web',
  platform: 'web',
  createElement(type) {
    return document.createElement(type);
  },
  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor);
  },
  remove(child, parent) {
    parent.removeChild(child);
  },
  setElementText(el, text) {
    el.textContent = text;
  },
  setElementAttribute(el, key, value) {
    el.setAttribute(key, value);
  },
  createTextNode(text) {
    return document.createTextNode(text);
  },
});
```

### 注册适配器

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

adapterRegistry.register('web', webRenderer);
adapterRegistry.register('ssr', ssrRenderer);
adapterRegistry.register('wechat', wechatRenderer);
```

### 使用适配器

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

const renderer = adapterRegistry.get('web');
if (renderer) {
  renderer.render(vnode, container);
}
```

## 主要 API

### `createPlatformRenderer(config)`

创建平台渲染器。

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

const renderer = createPlatformRenderer({
  name: 'my-platform',
  platform: 'custom',
  features: {
    portals: true,
    suspense: true,
    errorBoundary: true,
  },
  render(vnode, container) {
    // 渲染逻辑
  },
  hydrate(vnode, container) {
    // 水合逻辑
  },
});
```

### `adapterRegistry`

适配器注册表，提供适配器的注册、获取和枚举功能。

#### `register(platform, adapter)`

注册平台适配器。

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

adapterRegistry.register('web', webRenderer);
adapterRegistry.register('miniapp', miniappRenderer);
```

#### `get(platform)`

获取指定平台的适配器。

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

const renderer = adapterRegistry.get('web');
if (renderer) {
  renderer.render(vnode, container);
}
```

#### `has(platform)`

检查平台是否已注册。

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

if (adapterRegistry.has('web')) {
  console.log('Web 平台已注册');
}
```

#### `unregister(platform)`

注销平台适配器。

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

adapterRegistry.unregister('web');
```

#### `list()`

列出所有已注册的适配器。

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

const platforms = adapterRegistry.list();
console.log('已注册的适配器:', platforms);
```

#### `getDefault()`

获取默认平台适配器。

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

const defaultRenderer = adapterRegistry.getDefault();
```

#### `setDefault(platform)`

设置默认平台适配器。

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

adapterRegistry.setDefault('web');
```

#### `clear()`

清除所有注册的适配器。

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

adapterRegistry.clear();
```

## 类型定义

### PlatformAdapter

平台适配器接口。

```typescript
interface PlatformAdapter {
  name: string;
  platform: string;
  features?: PlatformFeatures;
  createElement(type: string, props?: VNodeProps): VNode;
  insert(child: VNode, parent: VNode, anchor?: VNode): void;
  remove(child: VNode, parent: VNode): void;
  setElementText(el: VNode, text: string): void;
  setElementAttribute(el: VNode, key: string, value: any): void;
  removeElementAttribute(el: VNode, key: string): void;
  createTextNode(text: string): VNode;
  render(vnode: VNode, container: VNode): void;
  hydrate?(vnode: VNode, container: VNode): void;
  unmount?(vnode: VNode): void;
  createPortal?(vnode: VNode, container: VNode): void;
}
```

### PlatformConfig

平台配置选项。

```typescript
interface PlatformConfig {
  name: string;
  platform: string;
  features?: PlatformFeatures;
  render: (vnode: VNode, container: VNode) => void;
  hydrate?: (vnode: VNode, container: VNode) => void;
  unmount?: (vnode: VNode) => void;
}
```

### PlatformPlugin

平台插件接口。

```typescript
interface PlatformPlugin {
  name: string;
  version: string;
  install(platform: PlatformAdapter, options?: any): void;
  uninstall?(platform: PlatformAdapter): void;
}
```

### PlatformFeatures

平台特性支持。

```typescript
interface PlatformFeatures {
  portals?: boolean;
  suspense?: boolean;
  errorBoundary?: boolean;
  transition?: boolean;
  teleport?: boolean;
}
```

## 使用示例

### Web 平台适配器

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

const webRenderer = createPlatformRenderer({
  name: 'web',
  platform: 'web',
  features: {
    portals: true,
    suspense: true,
    errorBoundary: true,
    transition: true,
    teleport: true,
  },

  createElement(type, props) {
    const el = document.createElement(type);
    if (props) {
      Object.entries(props).forEach(([key, value]) => {
        if (key.startsWith('on')) {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'className') {
          el.className = value;
        } else {
          el.setAttribute(key, value);
        }
      });
    }
    return el;
  },

  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null);
  },

  remove(child, parent) {
    parent.removeChild(child);
  },

  setElementText(el, text) {
    el.textContent = text;
  },

  setElementAttribute(el, key, value) {
    if (value === null || value === undefined) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, String(value));
    }
  },

  removeElementAttribute(el, key) {
    el.removeAttribute(key);
  },

  createTextNode(text) {
    return document.createTextNode(text);
  },

  render(vnode, container) {
    const el = this.createElement(vnode.type, vnode.props);
    // 渲染逻辑
    container.appendChild(el);
  },
});

export default webRenderer;
```

### 服务端渲染适配器

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

const ssrRenderer = createPlatformRenderer({
  name: 'ssr',
  platform: 'server',
  features: {
    portals: true,
    suspense: true,
    errorBoundary: true,
  },

  createElement(type, props) {
    return {
      type,
      props: props || {},
      children: [],
      text: '',
    };
  },

  insert(child, parent) {
    child.parent = parent;
    parent.children = parent.children || [];
    parent.children.push(child);
  },

  setElementText(el, text) {
    el.text = text;
  },

  render(vnode, container) {
    const html = this.stringify(vnode);
    return html;
  },

  stringify(node) {
    if (node.text) {
      return node.text;
    }
    const children = (node.children || []).map((child) => this.stringify(child)).join('');
    return `<${node.type}>${children}</${node.type}>`;
  },
});

export default ssrRenderer;
```

### 微信小程序适配器

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

const miniappRenderer = createPlatformRenderer({
  name: 'wechat-miniapp',
  platform: 'miniapp',
  features: {
    portals: false,
    suspense: false,
    errorBoundary: false,
  },

  createElement(type, props) {
    return {
      type,
      props: props || {},
      children: [],
    };
  },

  render(vnode, container) {
    const data = this.flatten(vnode);
    container.setData({ elements: data });
  },

  flatten(node, depth = 0) {
    return {
      tag: node.type,
      attrs: node.props,
      children: (node.children || []).map((child) => this.flatten(child, depth + 1)),
    };
  },
});

export default miniappRenderer;
```

### 使用插件扩展

```typescript
import { adapterRegistry, createPlatformRenderer } from '@lytjs/platform-adapter';

const loggerPlugin = {
  name: 'logger-plugin',
  version: '1.0.0',
  install(platform) {
    const originalRender = platform.render;
    platform.render = (vnode, container) => {
      console.log(`[${platform.name}] 开始渲染`);
      const start = performance.now();
      originalRender.call(platform, vnode, container);
      console.log(`[${platform.name}] 渲染完成，耗时: ${performance.now() - start}ms`);
    };
  },
};

const webRenderer = createPlatformRenderer({
  /* ... */
});
webRenderer.use?.(loggerPlugin);

adapterRegistry.register('web', webRenderer);
```

### 运行时平台切换

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

function renderApp(vnode) {
  const platform = getPlatformFromUA();
  const renderer = adapterRegistry.get(platform);

  if (!renderer) {
    console.warn(`平台 ${platform} 未注册，使用默认渲染器`);
    return adapterRegistry.getDefault()?.render(vnode, container);
  }

  return renderer.render(vnode, container);
}

function getPlatformFromUA() {
  const ua = navigator.userAgent;
  if (ua.includes('MiniProgram')) return 'wechat';
  return 'web';
}
```

### 动态加载适配器

```typescript
import { adapterRegistry } from '@lytjs/platform-adapter';

async function loadPlatformAdapter(platform) {
  const modules = {
    web: () => import('./adapters/web'),
    ssr: () => import('./adapters/ssr'),
    miniapp: () => import('./adapters/miniapp'),
  };

  if (modules[platform]) {
    const { default: adapter } = await modules[platform]();
    adapterRegistry.register(platform, adapter);
    return adapter;
  }

  throw new Error(`未知的平台: ${platform}`);
}

await loadPlatformAdapter('web');
```

## 高级用法

### 自定义渲染流水线

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

const pipelineRenderer = createPlatformRenderer({
  name: 'pipeline',
  platform: 'custom',
  features: {
    portals: true,
    suspense: true,
    errorBoundary: true,
  },

  render(vnode, container) {
    const pipeline = [this.optimize, this.transform, this.render];

    let current = vnode;
    for (const step of pipeline) {
      current = step.call(this, current);
    }
    return current;
  },

  optimize(vnode) {
    // 优化阶段
    return vnode;
  },

  transform(vnode) {
    // 转换阶段
    return vnode;
  },
});
```

### 性能监控适配器

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

function createMonitoredRenderer(config) {
  const renderer = createPlatformRenderer(config);

  const metrics = {
    renderCount: 0,
    totalTime: 0,
  };

  const originalRender = renderer.render;
  renderer.render = function (vnode, container) {
    const start = performance.now();
    originalRender.call(this, vnode, container);
    metrics.renderCount++;
    metrics.totalTime += performance.now() - start;
  };

  renderer.getMetrics = () => ({ ...metrics });

  return renderer;
}
```

### 调试适配器

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

const debugRenderer = createPlatformRenderer({
  name: 'debug',
  platform: 'web',
  // ... 基础配置
});

debugRenderer.debug = {
  logVNode(vnode) {
    console.log('VNode:', JSON.stringify(vnode, null, 2));
  },
  logTree(vnode, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}${vnode.type}`);
    (vnode.children || []).forEach((child) => this.logTree(child, depth + 1));
  },
  logOperations(operations) {
    console.table(operations);
  },
};
```

## 最佳实践

### 适配器命名规范

```typescript
// ✅ 推荐：使用平台标识符
adapterRegistry.register('web', webRenderer);
adapterRegistry.register('ssr', ssrRenderer);
adapterRegistry.register('wechat-miniapp', wechatRenderer);
adapterRegistry.register('alipay-miniapp', alipayRenderer);

// ❌ 避免：使用模糊名称
adapterRegistry.register('main', webRenderer);
adapterRegistry.register('alt', ssrRenderer);
```

### 特性检测

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

const renderer = createPlatformRenderer({
  name: 'adaptive',
  platform: 'web',

  features: {
    portals: typeof document.createElement === 'function',
    suspense: 'requestIdleCallback' in window,
    errorBoundary: true,
  },
});
```

### 错误处理

```typescript
import { createPlatformRenderer } from '@lytjs/platform-adapter';

const safeRenderer = createPlatformRenderer({
  name: 'safe',
  platform: 'web',

  render(vnode, container) {
    try {
      // 渲染逻辑
    } catch (error) {
      console.error('渲染错误:', error);
      this.handleError?.(error, vnode);
    }
  },

  handleError(error, vnode) {
    // 显示错误边界
  },
});
```

## 浏览器兼容性

`@lytjs/platform-adapter` 支持所有现代浏览器。不同平台的适配器可能有特定的浏览器要求。

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
