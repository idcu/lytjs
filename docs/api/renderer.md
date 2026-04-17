# @lytjs/renderer — 渲染器 API

Lyt.js 渲染器提供平台无关的渲染抽象层。通过 `LytRenderer` 接口定义平台操作，`createRenderer` 工厂函数创建渲染器实例。内置 DOM 渲染器和 SSR 渲染器。纯原生零依赖实现。

## 安装与导入

```typescript
import {
  createRenderer,
  LytRenderer,
  RendererInstance,
  DOMRenderer,
  domRenderer,
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
  // DOM 操作辅助
  setDOMProp,
  removeDOMProp,
  patchDOMProps,
  isSVGElement,
  getSVGPropName,
  // 属性精确更新
  patchClass,
  patchStyle,
  patchEventOnElement,
  patchDOMProp,
  patchProp,
  patchAllProps,
  patchElementProps,
  // 事件系统
  normalizeEventName,
  getEventKey,
  parseEventModifier,
  createInvoker,
  getEventInvokers,
  patchEvent,
  removeAllEventListeners,
} from '@lytjs/renderer'
```

---

## createRenderer

创建渲染器实例。接收一个 `LytRenderer` 实现，返回包含 mount/patch/unmount 方法的渲染器实例。

### 签名

```typescript
function createRenderer(renderer: LytRenderer): RendererInstance
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `renderer` | `LytRenderer` | 平台渲染器实现 |

### 返回值

`RendererInstance`

### 示例

```typescript
import { createRenderer } from '@lytjs/renderer'
import { DOMRenderer } from '@lytjs/renderer'

const renderer = createRenderer(new DOMRenderer())
renderer.mount(vnode, document.getElementById('app'))
```

---

## LytRenderer

平台无关的渲染器接口。定义了渲染器需要实现的所有平台操作。

### 接口定义

```typescript
interface LytRenderer {
  createElement(tag: string): any
  createText(text: string): any
  createComment(text: string): any
  setAttribute(el: any, key: string, val: any): void
  removeAttribute(el: any, key: string): void
  setStyle(el: any, style: object): void
  setClass(el: any, cls: string | object): void
  insert(parent: any, child: any, ref?: any): void
  remove(child: any): void
  replace(parent: any, oldChild: any, newChild: any): void
  addEventListener(el: any, event: string, handler: Function, options?: any): void
  removeEventListener(el: any, event: string, handler: Function): void
  nextTick(cb: Function): void
  parentNode(el: any): any
  nextSibling(el: any): any
  querySelector(selector: string): any
}
```

### 方法说明

| 方法 | 说明 |
|------|------|
| `createElement(tag)` | 创建元素节点 |
| `createText(text)` | 创建文本节点 |
| `createComment(text)` | 创建注释节点 |
| `setAttribute(el, key, val)` | 设置元素属性 |
| `removeAttribute(el, key)` | 移除元素属性 |
| `setStyle(el, style)` | 设置元素样式 |
| `setClass(el, cls)` | 设置元素 class |
| `insert(parent, child, ref?)` | 插入子节点 |
| `remove(child)` | 移除节点 |
| `replace(parent, oldChild, newChild)` | 替换子节点 |
| `addEventListener(el, event, handler, options?)` | 添加事件监听 |
| `removeEventListener(el, event, handler)` | 移除事件监听 |
| `nextTick(cb)` | 在下一个微任务中执行回调 |
| `parentNode(el)` | 获取父节点 |
| `nextSibling(el)` | 获取下一个兄弟节点 |
| `querySelector(selector)` | 查询选择器 |

---

## RendererInstance

渲染器实例，由 `createRenderer` 返回。

### 接口定义

```typescript
interface RendererInstance {
  mount(vnode: VNode, container: any): void
  patch(oldVNode: VNode, newVNode: VNode, container?: any): void
  unmount(vnode: VNode, container?: any): void
}
```

### 方法说明

| 方法 | 说明 |
|------|------|
| `mount(vnode, container)` | 将 VNode 树渲染为真实 DOM 并插入到容器中 |
| `patch(oldVNode, newVNode, container?)` | 对比新旧 VNode 树，计算出最小更新操作并应用 |
| `unmount(vnode, container?)` | 从容器中移除 VNode 对应的真实 DOM，并清理资源 |

---

## DOMRenderer

DOM 平台渲染器实现，实现了 `LytRenderer` 接口。

### 使用

```typescript
import { DOMRenderer, domRenderer } from '@lytjs/renderer'

// 方式 1：手动创建实例
const renderer = new DOMRenderer()

// 方式 2：使用预创建的单例
const renderer = domRenderer
```

---

## Fragment / Text / Comment

特殊节点类型标识符。

```typescript
const Fragment = Symbol('Fragment')  // 多根节点
const Text = Symbol('Text')          // 文本节点
const Comment = Symbol('Comment')    // 注释节点
```

---

## ShapeFlags

VNode 形状标记，使用位标记描述 VNode 的类型和子节点形态。

| 常量 | 值 | 说明 |
|------|-----|------|
| `ELEMENT` | 1 | 普通 HTML/SVG 元素 |
| `FUNCTIONAL_COMPONENT` | 2 | 函数式组件 |
| `STATEFUL_COMPONENT` | 4 | 有状态组件 |
| `TEXT_CHILDREN` | 8 | 子节点是纯文本 |
| `ARRAY_CHILDREN` | 16 | 子节点是数组 |
| `SLOTS_CHILDREN` | 32 | 子节点是插槽 |

---

## PatchFlags

PatchFlag 位标记，标记哪些 props 是动态的，用于精确更新。

| 常量 | 值 | 说明 |
|------|-----|------|
| `TEXT` | 1 | 动态文本 |
| `CLASS` | 2 | 动态 class |
| `STYLE` | 4 | 动态 style |
| `PROPS` | 8 | 动态 props |
| `FULL_PROPS` | 16 | 动态 props，键名可能变化 |
| `STABLE_FRAGMENT` | 32 | 稳定的 Fragment |
| `KEYED_FRAGMENT` | 64 | 带 key 的 Fragment |
| `UNKEYED_FRAGMENT` | 128 | 不带 key 的 Fragment |
| `NEED_PATCH` | 256 | 需要 patch |
| `DYNAMIC_SLOTS` | 512 | 动态插槽 |
| `HOISTED` | -1 | 静态提升 |
| `BAIL` | -2 | 退出优化 |

---

## DOM 操作辅助函数

### setDOMProp / removeDOMProp / patchDOMProps

```typescript
function setDOMProp(el: Element, key: string, value: any): void
function removeDOMProp(el: Element, key: string): void
function patchDOMProps(el: Element, oldProps: Record<string, any>, newProps: Record<string, any>): void
```

### isSVGElement / getSVGPropName

```typescript
function isSVGElement(el: Element): boolean
function getSVGPropName(name: string): string
```

---

## 属性精确更新函数

### patchClass

```typescript
function patchClass(el: Element, value: string | Record<string, boolean> | null, prevValue?: any): void
```

### patchStyle

```typescript
function patchStyle(el: Element, value: Record<string, string> | string | null, prevValue?: any): void
```

### patchEventOnElement

```typescript
function patchEventOnElement(el: Element, rawName: string, prevValue: Function | null, nextValue: Function | null): void
```

### patchDOMProp

```typescript
function patchDOMProp(el: Element, key: string, value: any, prevValue?: any): void
```

### patchProp / patchAllProps / patchElementProps

```typescript
function patchProp(el: Element, key: string, value: any, prevValue?: any): void
function patchAllProps(el: Element, oldProps: Record<string, any>, newProps: Record<string, any>): void
function patchElementProps(el: Element, oldVNode: VNode, newVNode: VNode): void
```

---

## 事件系统

### normalizeEventName

```typescript
function normalizeEventName(name: string): string
```

### getEventKey

```typescript
function getEventKey(el: Element, name: string): string
```

### parseEventModifier

```typescript
function parseEventModifier(name: string): { name: string; modifiers: string[] }
```

### createInvoker

```typescript
function createInvoker(initialValue: Function | null, instance: any): EventInvoker
```

### getEventInvokers

```typescript
function getEventInvokers(el: Element): Map<string, EventInvoker>
```

### patchEvent

```typescript
function patchEvent(el: Element, rawName: string, prevValue: Function | null, nextValue: Function | null, instance?: any): void
```

### removeAllEventListeners

```typescript
function removeAllEventListeners(el: Element): void
```

### 类型

```typescript
interface ParsedEvent {
  name: string
  modifiers: string[]
}

interface EventInvoker {
  value: Function | null
  attached: number
}
```
