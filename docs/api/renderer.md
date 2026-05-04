# @lytjs/renderer API 参考

`@lytjs/renderer` 是 LytJS 的渲染后端包，提供了 DOM 渲染、SSR 渲染、Signal 模式渲染以及 Island Architecture 支持。

---

## createDOMRenderer()

创建一个 DOM 渲染器，用于在浏览器中将 VNode 树渲染为真实 DOM。

### 签名

```ts
function createDOMRenderer(): DOMRenderer
```

### DOMRenderer

```ts
interface DOMRenderer {
  /** 挂载 VNode 到容器 */
  mount(vnode: VNode, container: Element): void
  /** 卸载 VNode */
  unmount(vnode: VNode): void
  /** 更新 VNode */
  render?(vnode: VNode, container: Element): void
}
```

### 示例

```ts
import { createDOMRenderer, createVNode } from '@lytjs/renderer'

const renderer = createDOMRenderer()
const vnode = createVNode('div', { class: 'app' }, 'Hello LytJS')
renderer.mount(vnode, document.getElementById('app')!)
```

---

## createSignalRenderer()

创建一个 Signal 模式的渲染器，使用细粒度 DOM 操作替代 VNode diff。

### 签名

```ts
function createSignalRenderer(
  template: string,
  context: Record<string, unknown>,
): SignalRenderer
```

### SignalRenderer

```ts
interface SignalRenderer {
  /** 将模板渲染到指定的容器元素或 CSS 选择器 */
  render(container: Element | string): void
  /** 卸载渲染器，清理所有 effect 和 DOM */
  unmount(): void
}
```

### 示例

```ts
import { createSignalRenderer } from '@lytjs/renderer'
import { ref } from '@lytjs/reactivity'

const ctx = { message: ref('Hello Signal Mode') }
const renderer = createSignalRenderer('<div>{{ message }}</div>', ctx)
renderer.render('#app')

// 更新数据，DOM 自动更新
ctx.message.value = 'Updated!'
```

---

## createVaporRenderer()

`createSignalRenderer` 的别名。Vapor 是 Signal 渲染模式的旧名称。

### 签名

```ts
function createVaporRenderer(
  template: string,
  context: Record<string, unknown>,
): VaporRenderer
```

---

## renderToString()

将 VNode 树渲染为 HTML 字符串（SSR）。

### 签名

```ts
function renderToString(input: SSRInput): Promise<string>
```

### SSRInput

```ts
interface SSRInput {
  vnode: VNode
}
```

### 返回值

返回 `Promise<string>`，解析为完整的 HTML 字符串。

### 示例

```ts
import { renderToString, createVNode } from '@lytjs/renderer'

const vnode = createVNode('div', { class: 'app' }, [
  createVNode('h1', {}, 'Hello SSR'),
  createVNode('p', {}, 'Server-side rendered content')
])

const html = await renderToString({ vnode })
console.log(html)
// <div class="app"><h1>Hello SSR</h1><p>Server-side rendered content</p></div>
```

---

## renderToStream()

将 VNode 树流式渲染为 `ReadableStream<Uint8Array>`（SSR Streaming）。

### 签名

```ts
function renderToStream(
  input: SSRInput,
  options?: SSRStreamOptions,
): ReadableStream<Uint8Array>
```

### SSRStreamOptions

```ts
interface SSRStreamOptions {
  /** 是否在块之间插入注释标记（用于调试），默认 false */
  commentMarkers?: boolean
}
```

### 示例

```ts
import { renderToStream, createVNode } from '@lytjs/renderer'

const vnode = createVNode('div', {}, 'Streaming content')
const stream = renderToStream({ vnode })

// 在 Node.js 中使用
import { Readable } from 'stream'
Readable.fromWeb(stream).pipe(process.stdout)
```

---

## createHydrationFunctions()

创建水合（hydration）函数，用于将 SSR 生成的 HTML 与客户端应用进行关联。

### 签名

```ts
function createHydrationFunctions(): HydrationRenderer
```

### HydrationRenderer

```ts
interface HydrationRenderer {
  /** 水合并挂载 */
  hydrate(vnode: VNode, container: Element | string): ComponentPublicInstance
  /** 渲染（非水合模式） */
  render(vnode: VNode, container: Element | string): ComponentPublicInstance
}
```

### 示例

```ts
import { createHydrationFunctions, createVNode } from '@lytjs/renderer'

const { hydrate } = createHydrationFunctions()
const vnode = createVNode(App)
hydrate(vnode, document.getElementById('app')!)
```

---

## hydrateIsland()

Island Architecture 的选择性水合函数，只对指定的 island 组件进行水合。

### 签名

```ts
function hydrateIsland(
  name: string,
  container: Element | string,
  props?: Record<string, unknown>,
): void
```

### 示例

```ts
import { hydrateIsland, registerIslandComponent } from '@lytjs/renderer'

// 先注册 island 组件
registerIslandComponent('Counter', CounterComponent)

// 在客户端选择性水合
hydrateIsland('Counter', document.querySelector('[data-island="counter"]')!)
```

---

## registerIslandComponent()

注册一个 named island 组件，供 `hydrateIsland` 和 `createIslandSSRContent` 使用。

### 签名

```ts
function registerIslandComponent(name: string, component: ComponentOptions): void
```

---

## createIslandSSRContent()

在 SSR 阶段生成 island 组件的 HTML 内容，包含水合所需的元数据。

### 签名

```ts
function createIslandSSRContent(
  name: string,
  props?: Record<string, unknown>,
): string
```

---

## Vapor App API

### defineVaporComponent()

定义一个 Vapor 模式（Signal 模式）的组件。

### 签名

```ts
function defineVaporComponent(options: VaporComponentOptions): VaporComponentDefinition
```

### VaporComponentOptions

```ts
interface VaporComponentOptions {
  name?: string
  props?: Record<string, PropOptions>
  setup?: (props: Record<string, unknown>, ctx: VaporContext) => Record<string, unknown> | void
  template?: string
  beforeMount?(): void
  mounted?(): void
  beforeUnmount?(): void
  unmounted?(): void
}
```

### 示例

```ts
import { defineVaporComponent } from '@lytjs/renderer'
import { ref } from '@lytjs/reactivity'

const Counter = defineVaporComponent({
  name: 'Counter',
  props: { initialCount: { type: Number, default: 0 } },
  setup(props) {
    const count = ref(props.initialCount)
    return { count }
  },
  template: '<button @click="count++">Count: {{ count }}</button>'
})
```

---

### createVaporApp()

创建一个 Vapor 模式的应用实例。

### 签名

```ts
function createVaporApp(options: VaporAppOptions): VaporApp
```

### VaporAppOptions

```ts
interface VaporAppOptions {
  rootComponent: VaporComponentDefinition
  rootProps?: Record<string, unknown>
}
```

---

## DOM 属性补丁操作

以下函数用于 DOM 属性的更新操作：

| 函数 | 签名 | 说明 |
|------|------|------|
| `patchProp` | `(el: Element, key: string, prevValue, nextValue) => void` | 通用属性补丁 |
| `patchClass` | `(el: Element, nextValue) => void` | 更新 class |
| `patchStyle` | `(el: Element, prev, next) => void` | 更新 style |
| `patchEvent` | `(el: Element, name, nextValue) => void` | 更新事件监听 |
| `patchAttr` | `(el: Element, key, value) => void` | 更新 HTML 属性 |
| `normalizeEventName` | `(name: string) => string` | 规范化事件名 |
| `getEventKey` | `(name: string) => string` | 获取事件键 |
| `parseEventModifier` | `(name: string) => { name, modifiers }` | 解析事件修饰符 |
| `createInvoker` | `(initialValue, event) => EventInvoker` | 创建事件调用器 |
| `removeAllEventListeners` | `(el: Element) => void` | 移除所有事件监听 |
| `isOn` | `(key: string) => boolean` | 判断是否为事件属性 |

---

## Web 渲染器宿主

| 导出 | 说明 |
|------|------|
| `WebRendererHost` | Web 平台的渲染器宿主实现 |
| `createWebHost()` | 创建 Web 宿主实例 |
| `wrapDOMEvent()` | 包装 DOM 事件 |

---

## 组件资源清理

以下函数用于组件卸载时自动清理资源：

| 函数 | 签名 | 说明 |
|------|------|------|
| `registerComponentEventListener` | `(el, event, handler) => void` | 注册事件监听器，卸载时自动移除 |
| `registerComponentEffectSubscription` | `(effect) => void` | 注册 effect 订阅，卸载时自动停止 |
| `registerComponentCleanup` | `(cleanupFn) => void` | 注册清理回调 |
| `cleanupComponentResources` | `(instance) => void` | 执行所有已注册的资源清理 |

---

## 工具函数

| 函数 | 签名 | 说明 |
|------|------|------|
| `escapeHtml` | `(str: string) => string` | HTML 特殊字符转义 |
| `isBooleanAttr` | `(key: string) => boolean` | 判断是否为布尔属性 |
| `isVoidElement` | `(tag: string) => boolean` | 判断是否为 void 元素 |

---

## 首次渲染优化

以下 API 从 `@lytjs/reactivity` re-export，用于优化首次渲染性能：

| 函数 | 说明 |
|------|------|
| `withFirstRenderOptimization` | 包裹首次渲染过程，期间禁用依赖收集 |
| `shouldSkipTracking` | 检查当前是否应跳过依赖收集 |
| `getSkippedTrackingCount` | 获取被跳过的追踪次数（调试用） |
| `resetSkippedTrackingCount` | 重置被跳过的追踪计数（测试用） |
