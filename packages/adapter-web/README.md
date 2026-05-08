# @lytjs/adapter-web

> Web 平台适配器，提供 DOM 操作、事件处理、样式管理等 Web 平台特定功能

## 安装

```bash
npm install @lytjs/adapter-web
```

## 核心功能

### WebRendererHost

Web 平台渲染器宿主实现，提供 DOM 操作接口：

```typescript
import { WebRendererHost } from '@lytjs/adapter-web';

const host = new WebRendererHost();

// 创建元素
const div = host.createElement('div');

// 设置文本
host.setText(div, 'Hello World');

// 插入子节点
host.insert(child, parent, null);

// 移除节点
host.remove(child);
```

### createDOMRenderer

创建 DOM 渲染器实例：

```typescript
import { createDOMRenderer } from '@lytjs/adapter-web';

const renderer = createDOMRenderer();

// 渲染 VNode 到容器
renderer.mount(vnode, document.getElementById('app'));

// 更新渲染
renderer.patch(oldVnode, newVnode);

// 卸载
renderer.unmount(vnode);
```

### DOM 操作工具

```typescript
import {
  createElement,
  createTextNode,
  createComment,
  setText,
  setStyle,
  addClass,
  removeClass,
} from '@lytjs/adapter-web';

// 创建元素
const el = createElement('div');

// 设置样式
setStyle(el, { color: 'red', fontSize: '14px' });

// 操作 class
addClass(el, 'container');
removeClass(el, 'old-class');
```

### 事件处理

```typescript
import { addEventListener, removeEventListener, removeAllEventListeners } from '@lytjs/adapter-web';

// 添加事件监听
const cleanup = addEventListener(el, 'click', (e) => {
  console.log('clicked');
});

// 移除事件监听
cleanup();

// 移除元素上所有事件监听
removeAllEventListeners(el);
```

### 属性操作

```typescript
import { patchAttr, patchClass, patchStyle, patchProp } from '@lytjs/adapter-web';

// 设置属性
patchAttr(el, 'id', 'my-id');

// 设置 class
patchClass(el, 'class-a class-b');

// 设置样式
patchStyle(el, { color: 'blue' }, { color: 'red' });

// 设置 DOM 属性
patchProp(el, 'value', 'new value', 'old value');
```

## 类型定义

```typescript
import type { WebRendererHost, DOMRenderer, RendererOptions } from '@lytjs/adapter-web';
```

## 相关包

- [@lytjs/renderer](../renderer) - 渲染器实现
- [@lytjs/vdom](../vdom) - 虚拟 DOM
- [@lytjs/dom](../dom) - DOM 平台封装
