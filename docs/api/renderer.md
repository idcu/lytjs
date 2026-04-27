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

---

## Vapor Mode API

Vapor Mode 是 Lyt.js 的无虚拟 DOM 渲染模式，通过 Signal 驱动的细粒度绑定实现精确 DOM 更新。

### bindStyle(el, sig)

将 Signal 的值绑定到元素的 style，支持字符串和对象两种形式。

```ts
function bindStyle(el: Element, sig: Signal<string | Record<string, string>>): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| el | `Element` | 目标 DOM 元素 |
| sig | `Signal<string \| Record<string, string>>` | 样式 Signal（字符串或对象） |

**字符串形式：** Signal 值直接设置为 `el.style.cssText`。

**对象形式：** 逐属性 diff 更新，仅修改发生变化的样式属性。

```ts
import { bindStyle } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

// 字符串形式
const cssSig = signal('color: red; font-size: 16px')
bindStyle(el, cssSig)

// 对象形式
const styleSig = signal({ color: 'red', fontSize: '16px' })
bindStyle(el, styleSig)
```

### bindHTML(el, sig)

将 Signal 的值绑定到元素的 innerHTML。

```ts
function bindHTML(el: Element, sig: Signal<string>): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| el | `Element` | 目标 DOM 元素 |
| sig | `Signal<string>` | HTML 内容 Signal |

```ts
import { bindHTML } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const htmlSig = signal('<strong>加粗文本</strong>')
bindHTML(el, htmlSig)
```

### bindIf(el, parentSig, anchor?)

根据 Signal 的值控制元素的 DOM 插入/移除。

```ts
function bindIf(el: Element, parentSig: Signal<boolean>, anchor?: Node): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| el | `Element` | 要控制的 DOM 元素 |
| parentSig | `Signal<boolean>` | 控制可见性的 Signal |
| anchor | `Node`（可选） | 插入位置的锚点节点 |

当 `parentSig` 为 `true` 时，元素被插入到 DOM（锚点之前）；为 `false` 时，元素从 DOM 中移除。

```ts
import { bindIf } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const visible = signal(true)
bindIf(el, visible)
// visible 变为 false 时，el 从 DOM 移除
// visible 变为 true 时，el 重新插入 DOM
```

### bindEach(container, sig, keyFn, renderFn)

基于 Signal 驱动的 keyed diff 列表渲染。

```ts
function bindEach<T>(
  container: Element,
  sig: Signal<T[]>,
  keyFn: (item: T) => string | number,
  renderFn: (item: T, index: number) => Element
): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| container | `Element` | 父容器元素 |
| sig | `Signal<T[]>` | 列表数据 Signal |
| keyFn | `(item: T) => string \| number` | key 函数，用于标识列表项 |
| renderFn | `(item: T, index: number) => Element` | 渲染函数，返回 DOM 元素 |

使用 keyed diff 算法，仅对新增、删除和移动的节点进行 DOM 操作。

```ts
import { bindEach } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const items = signal([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
])

bindEach(
  container,
  items,
  item => item.id,
  (item) => {
    const div = document.createElement('div')
    div.textContent = item.name
    return div
  }
)
```

### 其他 Vapor Mode API

```ts
// 文本绑定
function bindText(el: Element, sig: Signal<any>): void

// 属性绑定
function bindProp(el: Element, key: string, sig: Signal<any>): void

// 类名绑定
function bindClass(el: Element, sig: Signal<string>): void

// 事件绑定
function bindEvent(el: Element, event: string, handler: Function): void

// Vapor 组件定义
function defineVaporComponent(options: VaporComponentOptions): VaporComponent

// Vapor 应用创建
function createVaporApp(component: VaporComponent): VaporApp

// Vapor 组件渲染
function renderVaporComponent(
  component: VaporComponent,
  container: Element,
  options?: { props?: Record<string, any> }
): void

// Vapor 模板编译
function compileToVapor(template: string): VaporRenderFunction
```
