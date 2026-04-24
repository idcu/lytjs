# 渲染器 API

Lyt.js 渲染器将 VNode 树渲染到目标平台，支持 DOM、SSR、原生移动端和小程序。

## createRenderer()

创建渲染器实例。

```ts
function createRenderer(renderer: LytRenderer): RendererInstance
```

| 参数 | 类型 | 说明 |
|------|------|------|
| renderer | `LytRenderer` | 平台渲染器实现 |

**返回值：** `RendererInstance`

```ts
import { createRenderer, DOMRenderer } from 'lyt/renderer'

const renderer = createRenderer(new DOMRenderer())
```

---

## VNode 类型

```ts
interface VNode {
  type: string | object | symbol    // 节点类型
  props: Record<string, any> | null // 属性
  children: string | VNode[] | Record<string, any> | null  // 子节点
  key: string | number | null       // 键值
  ref: any                          // 引用
  shapeFlag: number                 // 类型标记
  patchFlag: number                 // 更新标记
  dynamicChildren: VNode[] | null   // 动态子节点
  dynamicProps: string[] | null     // 动态属性
  component: any                    // 组件实例
  el: any                           // DOM 元素
  anchor: any                       // 锚点
}
```

---

## VNode 工具

### Fragment

```ts
const Fragment: unique symbol
```

片段节点，渲染多个子节点而不创建包裹元素。

### Text

```ts
const Text: unique symbol
```

文本节点类型标记。

### Comment

```ts
const Comment: unique symbol
```

注释节点类型标记。

### ShapeFlags

```ts
const ShapeFlags: {
  ELEMENT: number
  FUNCTIONAL_COMPONENT: number
  STATEFUL_COMPONENT: number
  TEXT_CHILDREN: number
  ARRAY_CHILDREN: number
  SLOTS_CHILDREN: number
  // ...
}
```

VNode 类型标记常量。

### PatchFlags

```ts
const PatchFlags: {
  TEXT: number
  CLASS: number
  STYLE: number
  PROPS: number
  FULL_PROPS: number
  // ...
}
```

VNode 更新标记常量。

---

## DOM 渲染器

### DOMRenderer

```ts
class DOMRenderer implements LytRenderer {
  createElement(tag: string): Element
  createText(text: string): Text
  insert(child: Node, parent: Node, anchor?: Node): void
  remove(child: Node): void
  patchProp(el: Element, key: string, prevValue: any, nextValue: any): void
  // ...
}
```

### domRenderer

```ts
const domRenderer: DOMRenderer
```

预创建的 DOM 渲染器单例。

---

## DOM 操作辅助

### setDOMProp()

```ts
function setDOMProp(el: Element, key: string, value: any): void
```

设置 DOM 属性。

### removeDOMProp()

```ts
function removeDOMProp(el: Element, key: string): void
```

移除 DOM 属性。

### patchDOMProps()

```ts
function patchDOMProps(el: Element, prevProps: Record<string, any>, nextProps: Record<string, any>): void
```

批量更新 DOM 属性。

### isSVGElement()

```ts
function isSVGElement(tag: string): boolean
```

判断标签是否为 SVG 元素。

### getSVGPropName()

```ts
function getSVGPropName(name: string): string
```

获取 SVG 属性名。

---

## 属性精确更新

```ts
function patchClass(el: Element, next: string, prev?: string): void
function patchStyle(el: Element, next: Record<string, any>, prev?: Record<string, any>): void
function patchEventOnElement(el: Element, name: string, next: Function, prev?: Function): void
function patchDOMProp(el: Element, key: string, next: any, prev?: any): void
function patchProp(el: Element, key: string, next: any, prev: any): void
function patchAllProps(el: Element, next: Record<string, any>, prev: Record<string, any>): void
function patchElementProps(el: Element, next: Record<string, any>, prev: Record<string, any>): void
```

---

## 事件系统

```ts
function normalizeEventName(name: string): string
function getEventKey(name: string, options?: EventListenerOptions): string
function parseEventModifier(name: string): { name: string, modifiers: string[] }
function createInvoker(fn: Function): EventInvoker
function getEventInvokers(el: Element): Map<string, EventInvoker>
function patchEvent(el: Element, name: string, next: Function, prev?: Function): void
function removeAllEventListeners(el: Element): void
```

---

## SSR 渲染

### renderToString()

```ts
function renderToString(vnode: VNode): string
```

将 VNode 树同步渲染为 HTML 字符串。

### renderToStream()

```ts
function renderToStream(vnode: VNode, options?: RenderToStreamOptions): ReadableStream<string>
```

将 VNode 树异步流式渲染。

### renderToStreamGenerator()

```ts
function renderToStreamGenerator(vnode: VNode): AsyncGenerator<string>
```

使用 Generator 进行流式渲染。

### StringRenderer / ssrRenderer

```ts
class StringRenderer implements LytRenderer { /* ... */ }
const ssrRenderer: StringRenderer
```

SSR 字符串渲染器。

---

## Hydration（注水）

### hydrate()

```ts
function hydrate(app: App, container: Element, options?: HydrateOptions): HydrateResult
```

客户端注水入口函数。

```ts
interface HydrateOptions {
  warnOnMismatch?: boolean
}

interface HydrateResult {
  success: boolean
  mismatches: number
}
```

### 工具函数

```ts
function isHydrating(): boolean
function setHydrating(value: boolean): void
function onHydrated(callback: () => void): void
function getHydrateStats(): { mismatches: number, nodes: number }
function resetHydrateStats(): void
```

---

## 多平台渲染器

### NativeRenderer（移动端）

```ts
class NativeRenderer implements LytRenderer { /* ... */ }
const nativeRenderer: NativeRenderer
```

原生移动端渲染器。

### MiniAppRenderer（小程序）

```ts
class MiniAppRenderer implements LytRenderer { /* ... */ }
const miniAppRenderer: MiniAppRenderer
```

小程序渲染器。
