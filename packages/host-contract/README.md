# @lytjs/host-contract

> 统一渲染宿主接口定义，提供跨平台渲染器抽象契约

## 安装

```bash
npm install @lytjs/host-contract
```

## 概述

`@lytjs/host-contract` 定义了渲染器与平台之间的抽象接口。所有平台适配器（Web、小程序、Android、SSR 等）必须实现 `RendererHost` 接口，使渲染器核心逻辑与平台解耦。

接口分为 7 个操作维度：

1. **节点操作** - 创建、插入、移除 DOM 节点
2. **属性操作** - 统一 patchProp 入口
3. **样式操作** - class / style / 计算样式
4. **事件操作** - 事件监听与移除
5. **过渡动画** - 几何信息、过渡时长检测
6. **时序调度** - nextFrame / setTimeout
7. **其他** - hydration 辅助、namespace 检测等

## 核心类型

### RendererHost

统一渲染宿主接口，所有平台适配器必须实现

```typescript
import type { RendererHost } from '@lytjs/host-contract';

// 泛型参数：
// HN - 宿主节点类型（Web: Node, 小程序: WxNode, SSR: SSRNode）
// HE - 宿主元素类型（Web: Element, 小程序: WxElement）
interface MyHost implements RendererHost<Node, Element> {
  // 节点操作
  createElement(tag: string, isSVG?: boolean): Element;
  createText(text: string): Node;
  createComment(text: string): Node;
  setElementText(node: Element, text: string): void;
  setText(node: Node, text: string): void;
  insert(child: Node, parent: Node, anchor?: Node | null): void;
  remove(child: Node): void;
  nextSibling(node: Node): Node | null;
  parentNode(node: Node): Node | null;
  querySelector(selector: string): Element | null;

  // 属性操作
  patchProp(el: Element, key: string, prevValue: unknown, nextValue: unknown, isSVG?: boolean): void;

  // 样式操作
  addClass(el: Element, cls: string): void;
  removeClass(el: Element, cls: string): void;
  hasClass(el: Element, cls: string): boolean;
  setStyle(el: Element, key: string, value: string | null | undefined): void;
  removeStyle(el: Element, key: string): void;
  getComputedStyle(el: Element): HostStyleDeclaration;
  forceReflow(el: Element): void;

  // 事件操作
  addEventListener(el: Element, event: string, handler: HostEventHandler, options?: HostEventOptions): () => void;
  removeEventListener(el: Element, event: string, handler: HostEventHandler, options?: HostEventOptions): void;

  // 过渡动画
  getBoundingClientRect(el: Element): HostRect;
  getAttribute(el: Element, key: string): string | null;
  getTransitionInfo(el: Element, type: 'enter' | 'leave'): TransitionDurationInfo;

  // 时序调度
  nextFrame(fn: () => void): void;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;

  // 可选：hydration 辅助
  getNamespaceURI?(el: Element): string | null;
  replaceChild?(parent: Node, newChild: Node, oldChild: Node): void;
  getChildNodes?(el: Element): Node[];
  getNodeType?(node: Node): number;
  getTagName?(el: Element): string;
}
```

### HostRect

宿主元素的几何边界信息，用于 FLIP 动画和 TransitionGroup

```typescript
import type { HostRect } from '@lytjs/host-contract';

interface HostRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}
```

各平台返回值：
- **Web**: `DOMRect`
- **小程序**: `{ left, top, width, height, right, bottom }`
- **SSR**: 全部为零值

### HostStyleDeclaration

宿主元素的样式声明（平台无关抽象）

```typescript
import type { HostStyleDeclaration } from '@lytjs/host-contract';

interface HostStyleDeclaration {
  getPropertyValue(prop: string): string;
}
```

各平台实现：
- **Web**: `CSSStyleDeclaration`
- **小程序**: `Record<string, string>`
- **SSR**: 空声明

### TransitionDurationInfo

过渡/动画时长信息

```typescript
import type { TransitionDurationInfo } from '@lytjs/host-contract';

interface TransitionDurationInfo {
  /** 总过渡时长（ms） */
  duration: number;
  /** 是否存在 CSS transition */
  hasTransition: boolean;
  /** 是否存在 CSS animation */
  hasAnimation: boolean;
}
```

### HostEvent / HostEventHandler / HostEventOptions

平台无关的事件抽象

```typescript
import type { HostEvent, HostEventHandler, HostEventOptions } from '@lytjs/host-contract';

// 事件对象
interface HostEvent {
  type: string;
  target: unknown;
  currentTarget: unknown;
  preventDefault(): void;
  stopPropagation(): void;
  nativeEvent: unknown;
}

// 事件监听器
type HostEventHandler = (event: HostEvent) => void;

// 事件监听选项
interface HostEventOptions {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}
```

## 类型定义

```typescript
import type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  TransitionDurationInfo,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
} from '@lytjs/host-contract';
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口，使用此接口创建渲染器
- [@lytjs/dom](../dom) - DOM 平台封装
- [@lytjs/dom-runtime](../dom-runtime) - DOM 运行时工具
