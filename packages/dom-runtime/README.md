# @lytjs/dom-runtime

> Signal 模式 DOM 运行时，提供细粒度 DOM 操作、列表协调与清理作用域管理

## 安装

```bash
npm install @lytjs/dom-runtime
```

## 核心 API

### DOM 创建

创建 DOM 元素、文本节点和模板片段

```typescript
import { createTemplate, createElement, createTextNode } from '@lytjs/dom-runtime';

// 从 HTML 字符串创建模板（解析一次，后续克隆复用）
const fragment = createTemplate('<div class="item"><span></span></div>');

// 创建 DOM 元素
const el = createElement('div', { id: 'app', class: 'container' }, [
  'Hello',
  createElement('span', null, ['World']),
]);

// 创建文本节点
const text = createTextNode('Hello World');
```

### DOM 插入/删除

节点的插入、移除和清空操作

```typescript
import { insert, remove, clearChildren, setText, setHTML } from '@lytjs/dom-runtime';

// 插入节点（ref 为 null 时追加到末尾）
insert(childNode, parentNode, refNode);

// 移除节点
remove(childNode);

// 清空所有子节点
clearChildren(parentNode);

// 设置文本内容
setText(el, 'Hello World');

// 设置 HTML 内容（内置 XSS 防护，自动过滤危险标签和属性）
setHTML(el, userProvidedHTML);
```

### DOM 属性操作

属性、样式、类名的设置与移除

```typescript
import {
  setAttribute,
  removeAttribute,
  setProperty,
  setStyle,
  setClass,
  toggleClass,
} from '@lytjs/dom-runtime';

// HTML attribute
setAttribute(el, 'data-id', '123');
removeAttribute(el, 'data-id');

// 智能 property 设置（自动判断使用 DOM property 或 HTML attribute）
// value、checked、disabled 等直接设置 DOM property
setProperty(el, 'value', 'hello');
setProperty(el, 'disabled', true);

// 设置样式（支持字符串和对象，数值类型自动添加 px 单位）
setStyle(el, { width: 100, height: '50px', backgroundColor: 'red' });
setStyle(el, 'width: 100px; height: 50px;');

// 设置 class
setClass(el, 'active visible');

// 切换 class
toggleClass(el, 'active', true); // 添加
toggleClass(el, 'active', false); // 移除
```

### 事件绑定

添加事件监听器，支持修饰符

```typescript
import { addEventListener, createEventHandler } from '@lytjs/dom-runtime';

// 基础事件监听（返回取消监听函数）
const dispose = addEventListener(el, 'click', (e) => {
  console.log('clicked', e);
});

// 取消监听
dispose();

// 带修饰符的事件处理器
const dispose2 = createEventHandler(
  el,
  'click',
  (e) => {
    console.log('clicked');
  },
  {
    prevent: true, // 调用 e.preventDefault()
    stop: true, // 调用 e.stopPropagation()
    capture: true, // 捕获阶段监听
    once: true, // 只触发一次
  },
);
```

### reconcileArray

列表协调（keyed diff），对比新旧列表执行最小化 DOM 操作

```typescript
import { reconcileArray } from '@lytjs/dom-runtime';

interface Item {
  id: number;
  text: string;
}

const list: Item[] = [
  { id: 1, text: 'Item 1' },
  { id: 2, text: 'Item 2' },
];

reconcileArray(parentNode, list, {
  key: (item) => item.id,
  create: (item) => {
    const el = document.createElement('div');
    el.textContent = item.text;
    return el;
  },
  update: (node, item) => {
    (node as HTMLElement).textContent = item.text;
  },
  destroy: (node) => {
    console.log('removed', node);
  },
  animateMove: (node, fromIndex, toIndex) => {
    // 移动动画回调
    console.log(`moved from ${fromIndex} to ${toIndex}`);
  },
});
```

### bindEffect

创建自动清理的响应式 effect，与 `@lytjs/reactivity` 集成

```typescript
import { bindEffect } from '@lytjs/dom-runtime';
import { ref } from '@lytjs/reactivity';

const count = ref(0);

// 创建 effect，自动追踪依赖
const dispose = bindEffect(() => {
  el.textContent = `Count: ${count.value}`;
});

// 手动停止 effect
dispose();
// 也可通过 onCleanup 作用域自动清理
```

### batchDOM

批量执行 DOM 操作，减少重排

```typescript
import { batchDOM } from '@lytjs/dom-runtime';

// 使用微任务延迟执行，合并同一 tick 内的多次 DOM 操作
batchDOM(() => {
  el.style.width = '100px';
  el.style.height = '200px';
  el.textContent = 'Updated';
});
```

### 清理作用域

管理 DOM 操作的生命周期，支持嵌套作用域

```typescript
import { onCleanup, runCleanups, createCleanupScope } from '@lytjs/dom-runtime';

// 注册清理函数
onCleanup(() => {
  el.removeEventListener('click', handler);
});

// 执行所有清理函数
runCleanups();

// 创建隔离的清理作用域
const scope = createCleanupScope();

onCleanup(() => {
  console.log('scope cleanup 1');
});
onCleanup(() => {
  console.log('scope cleanup 2');
});

// 销毁作用域（仅清理当前作用域内的函数）
scope.dispose();
```

## XSS 防护

`setHTML` 内置基础 HTML sanitizer，自动过滤以下危险内容：

- 危险标签：`script`、`iframe`、`object`、`embed`、`applet`、`form` 等
- 事件属性：所有 `on*` 属性
- 危险属性：`srcdoc`、`formaction`、`xlink:href`
- `javascript:` 伪协议
- SVG `foreignObject` 标签
- `style` 标签（防止 CSS 注入）
- `base` 标签（防止基地址劫持）
- `data:` URI

> 注意：这不是一个完整的 sanitizer，生产环境建议使用 DOMPurify 等成熟库。

## 类型定义

```typescript
import type { CleanupFn, ReconcileOptions } from '@lytjs/dom-runtime';

interface ReconcileOptions<T> {
  key: (item: T) => string | number;
  create: (item: T) => Node;
  update?: (node: Node, item: T) => void;
  destroy?: (node: Node) => void;
  animateMove?: (node: Node, fromIndex: number, toIndex: number) => void;
}

type CleanupFn = () => void;
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口
- [@lytjs/reactivity](../reactivity) - 响应式系统（bindEffect 依赖）
- [@lytjs/host-contract](../host-contract) - 渲染器宿主抽象
- [@lytjs/dom](../dom) - DOM 平台封装
