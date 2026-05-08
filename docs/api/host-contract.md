# @lytjs/host-contract API 参考

`@lytjs/host-contract` 定义了 LytJS 的**跨平台渲染宿主接口**（Host Contract）。所有平台适配器（Web、SSR、小程序、Native 等）必须实现此接口，确保 L1 的 `createRenderer` 与具体平台解耦。

---

## 核心概念

### 为什么需要 Host Contract？

```
传统模式（耦合）：
  createRenderer() → 直接操作 DOM API（强耦合）

Host Contract 模式（解耦）：
  createRenderer() → RendererHost 接口 → 具体平台实现（@lytjs/adapter-web）
```

通过 RendererHost 接口抽象，createRenderer 不需要知道运行在什么平台上：

- Web 浏览器 → 实现为 DOM 操作
- SSR → 实现为空操作或字符串拼接
- 小程序 → 实现为小程序 API
- 移动端 Native → 实现为原生组件调用

---

## 接口总览

### RendererHost

统一渲染宿主接口，定义了所有平台必须实现的底层操作。

```ts
interface RendererHost<HN = unknown, HE extends HN = HN> {
  // 标识符号
  readonly __isRendererHost?: true;

  // 一、节点操作
  createElement(tag: string, isSVG?: boolean): HE;
  createText(text: string): HN;
  createComment(text: string): HN;
  setElementText(node: HE, text: string): void;
  setText(node: HN, text: string): void;
  insert(child: HN, parent: HN, anchor?: HN | null): void;
  remove(child: HN): void;
  nextSibling(node: HN): HN | null;
  parentNode(node: HN): HN | null;
  querySelector(selector: string): HE | null;

  // 二、属性操作
  patchProp(el: HE, key: string, prevValue: unknown, nextValue: unknown, isSVG?: boolean): void;

  // 三、样式操作
  addClass(el: HE, cls: string): void;
  removeClass(el: HE, cls: string): void;
  hasClass(el: HE, cls: string): boolean;
  setStyle(el: HE, key: string, value: string | null | undefined): void;
  removeStyle(el: HE, key: string): void;
  getComputedStyle(el: HE): HostStyleDeclaration;
  forceReflow(el: HE): void;

  // 四、事件操作
  addEventListener(
    el: HE,
    event: string,
    handler: HostEventHandler,
    options?: HostEventOptions,
  ): () => void;
  removeEventListener(
    el: HE,
    event: string,
    handler: HostEventHandler,
    options?: HostEventOptions,
  ): void;

  // 五、过渡动画
  getBoundingClientRect(el: HE): HostRect;
  getAttribute(el: HE, key: string): string | null;
  getTransitionInfo(el: HE, type: 'enter' | 'leave'): TransitionDurationInfo;

  // 六、时序调度
  nextFrame(fn: () => void): void;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;

  // 七、其他（可选）
  getNamespaceURI?(el: HE): string | null;
  replaceChild?(parent: HN, newChild: HN, oldChild: HN): void;
  getChildNodes?(el: HE): HN[];
  getNodeType?(node: HN): number;
  getTagName?(el: HE): string;
}
```

---

## 一、节点操作 (Node Operations)

### createElement()

创建元素节点。

```ts
createElement(tag: string, isSVG?: boolean): HE
```

| 参数    | 类型      | 说明                                         |
| ------- | --------- | -------------------------------------------- |
| `tag`   | `string`  | HTML 标签名（如 `'div'`, `'span'`, `'svg'`） |
| `isSVG` | `boolean` | 是否 SVG 元素（影响 namespace 处理）         |

**Web 平台实现：**

```ts
// @lytjs/adapter-web
createElement(tag: string, isSVG: boolean): HTMLElement {
  return isSVG
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag)
}
```

**SSR 平台实现：**

```ts
// SSR 实现返回模拟节点对象
createElement(): MockElement {
  return { nodeType: 1, childNodes: [], style: {}, ... }
}
```

---

### createText()

创建文本节点。

```ts
createText(text: string): HN
```

**Web 平台：**

```ts
createText(text: string): Text {
  return document.createTextNode(text)
}
```

---

### createComment()

创建注释节点。

```ts
createComment(text: string): HN
```

---

### insert()

在父节点中插入子节点。

```ts
insert(child: HN, parent: HN, anchor?: HN | null): void
```

| 参数     | 类型         | 说明                                               |
| -------- | ------------ | -------------------------------------------------- |
| `child`  | `HN`         | 要插入的节点                                       |
| `parent` | `HN`         | 父节点                                             |
| `anchor` | `HN \| null` | 锚点节点，插入到此节点之前；为 `null` 时追加到末尾 |

**Web 平台：**

```ts
insert(child: Node, parent: Node, anchor: Node | null): void {
  parent.insertBefore(child, anchor)
}
```

---

### remove()

从 DOM 中移除节点。

```ts
remove(child: HN): void
```

---

### nextSibling() / parentNode()

导航节点关系。

```ts
nextSibling(node: HN): HN | null
parentNode(node: HN): HN | null
```

---

### querySelector()

查询选择器（用于 Teleport 目标查找）。

```ts
querySelector(selector: string): HE | null
```

---

## 二、属性操作 (Property Operations)

### patchProp()

统一属性 patch 入口。

```ts
patchProp(
  el: HE,
  key: string,
  prevValue: unknown,
  nextValue: unknown,
  isSVG?: boolean
): void
```

**分发逻辑：**

| key 类型 | 实际处理                                                           |
| -------- | ------------------------------------------------------------------ |
| `class`  | 样式类名更新 → `addClass` / `removeClass`                          |
| `style`  | 内联样式更新 → `setStyle` / `removeStyle`                          |
| `onXxx`  | 事件绑定 → `addEventListener` / `removeEventListener`              |
| 其他     | HTML attribute / DOM property → `setAttribute` / `removeAttribute` |

---

## 三、样式操作 (Style Operations)

### addClass() / removeClass() / hasClass()

```ts
addClass(el: HE, cls: string): void
removeClass(el: HE, cls: string): void
hasClass(el: HE, cls: string): boolean
```

---

### setStyle() / removeStyle()

```ts
setStyle(el: HE, key: string, value: string | null | undefined): void
removeStyle(el: HE, key: string): void
```

**Web 平台：**

```ts
setStyle(el: HTMLElement, key: string, value: string | null): void {
  if (value === null || value === undefined) {
    el.style.removeProperty(key)
  } else {
    el.style.setProperty(key, value)
  }
}
```

---

### getComputedStyle()

获取计算样式（用于 Transition 时长检测）。

```ts
getComputedStyle(el: HE): HostStyleDeclaration
```

---

### forceReflow()

强制回流（用于 Transition 触发）。

```ts
forceReflow(el: HE): void
```

**Web 平台：**

```ts
// 读取 offsetHeight 触发强制回流
forceReflow(el: HTMLElement): void {
  void el.offsetHeight
}
```

---

## 四、事件操作 (Event Operations)

### addEventListener()

添加事件监听器。

```ts
addEventListener(
  el: HE,
  event: string,
  handler: HostEventHandler,
  options?: HostEventOptions
): () => void
```

**返回值：** 取消监听的函数

---

### removeEventListener()

移除事件监听器。

```ts
removeEventListener(
  el: HE,
  event: string,
  handler: HostEventHandler,
  options?: HostEventOptions
): void
```

---

## 五、过渡动画 (Transition Operations)

### getBoundingClientRect()

获取元素边界信息（用于 FLIP 动画）。

```ts
getBoundingClientRect(el: HE): HostRect
```

**返回值：**

```ts
interface HostRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}
```

---

### getTransitionInfo()

获取过渡/动画时长信息。

```ts
getTransitionInfo(el: HE, type: 'enter' | 'leave'): TransitionDurationInfo
```

**返回值：**

```ts
interface TransitionDurationInfo {
  duration: number; // 总时长（ms）
  hasTransition: boolean; // 是否有 CSS transition
  hasAnimation: boolean; // 是否有 CSS animation
}
```

---

## 六、时序调度 (Timing Operations)

### nextFrame()

下一帧执行（双 rAF 确保浏览器已绘制）。

```ts
nextFrame(fn: () => void): void
```

**Web 平台：**

```ts
nextFrame(fn: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(fn))
}
```

**SSR 平台：** 同步执行

---

### setTimeout() / clearTimeout()

延迟执行。

```ts
setTimeout(fn: () => void, ms: number): number
clearTimeout(id: number): void
```

---

## 七、其他操作 (Miscellaneous)

### 可选接口

| 接口                             | 说明                                                          |
| -------------------------------- | ------------------------------------------------------------- |
| `getNamespaceURI(el)`            | 获取 SVG namespace（Web 返回 `'http://www.w3.org/2000/svg'`） |
| `replaceChild(parent, new, old)` | 替换子节点（用于 hydration mismatch）                         |
| `getChildNodes(el)`              | 获取子节点列表                                                |
| `getNodeType(node)`              | 获取节点类型（1=元素, 3=文本, 8=注释）                        |
| `getTagName(el)`                 | 获取小写标签名                                                |

---

## 辅助类型

### HostEvent

平台无关的事件对象。

```ts
interface HostEvent {
  type: string;
  target: unknown;
  currentTarget: unknown;
  preventDefault(): void;
  stopPropagation(): void;
  nativeEvent: unknown; // 原始事件对象
}
```

---

### HostEventHandler

事件监听器类型。

```ts
type HostEventHandler = (event: HostEvent) => void;
```

---

### HostEventOptions

事件监听选项。

```ts
interface HostEventOptions {
  capture?: boolean; // 捕获阶段
  once?: boolean; // 只执行一次
  passive?: boolean; // 被动模式
}
```

---

### HostRect

元素边界矩形。

```ts
interface HostRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}
```

---

### HostStyleDeclaration

计算样式声明。

```ts
interface HostStyleDeclaration {
  getPropertyValue(prop: string): string;
}
```

---

## 平台实现参考

### Web 平台（@lytjs/adapter-web）

```ts
// packages/adapter-web/src/web-host.ts
export const webHost: RendererHost<Node, HTMLElement> = {
  __isRendererHost: true,

  createElement(tag, isSVG) {
    return isSVG
      ? document.createElementNS('http://www.w3.org/2000/svg', tag)
      : document.createElement(tag);
  },
  createText(text) {
    return document.createTextNode(text);
  },
  createComment(text) {
    return document.createComment(text);
  },
  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor);
  },
  remove(child) {
    child.parentNode?.removeChild(child);
  },
  // ... 其他方法
};
```

### SSR 平台

```ts
// SSR 实现返回空操作或最小化模拟
export const ssrHost: RendererHost<SSRNode, SSRElement> = {
  createElement() {
    return {} as SSRElement;
  },
  createText() {
    return {} as SSRNode;
  },
  // 大部分方法为空实现
};
```

---

## 开发自定义渲染器

### 步骤 1: 实现 RendererHost

```ts
// my-renderer.ts
import type { RendererHost } from '@lytjs/host-contract';

export const myHost: RendererHost<MyNode, MyElement> = {
  __isRendererHost: true,
  createElement(tag) {
    /* ... */
  },
  createText(text) {
    /* ... */
  },
  // 实现所有必需方法
};
```

### 步骤 2: 传入 createRenderer

```ts
import { createRenderer } from '@lytjs/vdom';

const renderer = createRenderer(myHost);
renderer.render(vnode, container);
```
