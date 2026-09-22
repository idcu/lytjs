# @lytjs/renderer API 参考

`@lytjs/renderer` 是 LytJS 的渲染后端包，提供了 DOM 渲染、SSR 渲染、Signal 模式渲染以及 Island Architecture 支持。

---

## createDOMRenderer()

创建一个 DOM 渲染器，用于在浏览器中将 VNode 树渲染为真实 DOM。

### 签名

```ts
function createDOMRenderer(): DOMRenderer;
```

### DOMRenderer

```ts
interface DOMRenderer {
  /** 挂载 VNode 到容器 */
  mount(vnode: VNode, container: Element): void;
  /** 卸载 VNode */
  unmount(vnode: VNode): void;
  /** 更新 VNode */
  render?(vnode: VNode, container: Element): void;
}
```

### 示例

```ts
import { createDOMRenderer, createVNode } from '@lytjs/renderer';

const renderer = createDOMRenderer();
const vnode = createVNode('div', { class: 'app' }, 'Hello LytJS');
renderer.mount(vnode, document.getElementById('app')!);
```

---

## createSignalRenderer()

创建一个 Signal 模式的渲染器，使用细粒度 DOM 操作替代 VNode diff。

### 签名

```ts
function createSignalRenderer(template: string, context: Record<string, unknown>): SignalRenderer;
```

### SignalRenderer

```ts
interface SignalRenderer {
  /** 将模板渲染到指定的容器元素或 CSS 选择器 */
  render(container: Element | string): void;
  /** 卸载渲染器，清理所有 effect 和 DOM */
  unmount(): void;
}
```

### 示例

```ts
import { createSignalRenderer } from '@lytjs/renderer';
import { ref } from '@lytjs/reactivity';

const ctx = { message: ref('Hello Signal Mode') };
const renderer = createSignalRenderer('<div>{{ message }}</div>', ctx);
renderer.render('#app');

// 更新数据，DOM 自动更新
ctx.message.value = 'Updated!';
```

---

## createVaporRenderer()

`createSignalRenderer` 的别名。Vapor 是 Signal 渲染模式的旧名称。

### 签名

```ts
function createVaporRenderer(template: string, context: Record<string, unknown>): VaporRenderer;
```

---

## renderToString()

将 VNode 树渲染为 HTML 字符串（SSR）。

### 签名

```ts
function renderToString(input: SSRInput): Promise<string>;
```

### SSRInput

```ts
interface SSRInput {
  vnode: VNode;
}
```

### 返回值

返回 `Promise<string>`，解析为完整的 HTML 字符串。

### 示例

```ts
import { renderToString, createVNode } from '@lytjs/renderer';

const vnode = createVNode('div', { class: 'app' }, [
  createVNode('h1', {}, 'Hello SSR'),
  createVNode('p', {}, 'Server-side rendered content'),
]);

const html = await renderToString({ vnode });
console.log(html);
// <div class="app"><h1>Hello SSR</h1><p>Server-side rendered content</p></div>
```

---

## renderToStream()

将 VNode 树流式渲染为 `ReadableStream<Uint8Array>`（SSR Streaming）。

### 签名

```ts
function renderToStream(input: SSRInput, options?: SSRStreamOptions): ReadableStream<Uint8Array>;
```

### SSRStreamOptions

```ts
interface SSRStreamOptions {
  /** 是否在块之间插入注释标记（用于调试），默认 false */
  commentMarkers?: boolean;
}
```

### 示例

```ts
import { renderToStream, createVNode } from '@lytjs/renderer';

const vnode = createVNode('div', {}, 'Streaming content');
const stream = renderToStream({ vnode });

// 在 Node.js 中使用
import { Readable } from 'stream';
Readable.fromWeb(stream).pipe(process.stdout);
```

---

## createHydrationFunctions()

创建水合（hydration）函数，用于将 SSR 生成的 HTML 与客户端应用进行关联。

### 签名

```ts
function createHydrationFunctions(): HydrationRenderer;
```

### HydrationRenderer

```ts
interface HydrationRenderer {
  /** 水合并挂载 */
  hydrate(vnode: VNode, container: Element | string): ComponentPublicInstance;
  /** 渲染（非水合模式） */
  render(vnode: VNode, container: Element | string): ComponentPublicInstance;
}
```

### 示例

```ts
import { createHydrationFunctions, createVNode } from '@lytjs/renderer';

const { hydrate } = createHydrationFunctions();
const vnode = createVNode(App);
hydrate(vnode, document.getElementById('app')!);
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
): void;
```

### 参数

| 参数        | 类型                      | 说明                      |
| ----------- | ------------------------- | ------------------------- |
| `name`      | `string`                  | 已注册的 island 组件名称  |
| `container` | `Element \| string`       | 挂载容器元素或 CSS 选择器 |
| `props`     | `Record<string, unknown>` | 传递给组件的 props        |

### 示例

```ts
import { hydrateIsland, registerIslandComponent } from '@lytjs/renderer';

// 先注册 island 组件
registerIslandComponent('Counter', CounterComponent);

// 在客户端选择性水合
hydrateIsland('Counter', document.querySelector('[data-island="counter"]')!);
```

---

## hydrateIslandOnVisible()

在元素可见时才进行 Island 水合（延迟水合）。

### 签名

```ts
function hydrateIslandOnVisible(
  name: string,
  container: Element | string,
  props?: Record<string, unknown>,
  options?: IntersectionObserverInit,
): () => void;
```

### 参数

| 参数        | 类型                       | 说明                      |
| ----------- | -------------------------- | ------------------------- |
| `name`      | `string`                   | 已注册的 island 组件名称  |
| `container` | `Element \| string`        | 挂载容器元素或 CSS 选择器 |
| `props`     | `Record<string, unknown>`  | 传递给组件的 props        |
| `options`   | `IntersectionObserverInit` | IntersectionObserver 选项 |

### 返回值

返回一个清理函数，调用它可以取消观察和水合。

### 示例

```ts
import { hydrateIslandOnVisible, registerIslandComponent } from '@lytjs/renderer';

registerIslandComponent('HeavyWidget', HeavyWidgetComponent);

// 当元素进入视口时才水合
const cleanup = hydrateIslandOnVisible(
  'HeavyWidget',
  '[data-island="heavy-widget"]',
  { initialData: [] },
  { rootMargin: '100px' }, // 提前 100px 开始加载
);

// 如果需要取消
// cleanup()
```

---

## hydrateIslandOnIdle()

在浏览器空闲时进行 Island 水合。

### 签名

```ts
function hydrateIslandOnIdle(
  name: string,
  container: Element | string,
  props?: Record<string, unknown>,
  options?: { timeout?: number },
): () => void;
```

### 参数

| 参数              | 类型                      | 说明                             |
| ----------------- | ------------------------- | -------------------------------- |
| `name`            | `string`                  | 已注册的 island 组件名称         |
| `container`       | `Element \| string`       | 挂载容器元素或 CSS 选择器        |
| `props`           | `Record<string, unknown>` | 传递给组件的 props               |
| `options.timeout` | `number`                  | 超时时间（毫秒），超时后强制水合 |

### 示例

```ts
import { hydrateIslandOnIdle, registerIslandComponent } from '@lytjs/renderer';

registerIslandComponent('Analytics', AnalyticsComponent);

// 浏览器空闲时水合，最多等待 3 秒
hydrateIslandOnIdle('Analytics', '[data-island="analytics"]', {}, { timeout: 3000 });
```

---

## hydrateIslandOnInteraction()

在用户交互时进行 Island 水合。

### 签名

```ts
function hydrateIslandOnInteraction(
  name: string,
  container: Element | string,
  props?: Record<string, unknown>,
  events?: string[],
): () => void;
```

### 参数

| 参数        | 类型                      | 说明                                                                     |
| ----------- | ------------------------- | ------------------------------------------------------------------------ |
| `name`      | `string`                  | 已注册的 island 组件名称                                                 |
| `container` | `Element \| string`       | 挂载容器元素或 CSS 选择器                                                |
| `props`     | `Record<string, unknown>` | 传递给组件的 props                                                       |
| `events`    | `string[]`                | 触发水合的事件列表，默认 `['click', 'focus', 'mouseover', 'touchstart']` |

### 示例

```ts
import { hydrateIslandOnInteraction, registerIslandComponent } from '@lytjs/renderer';

registerIslandComponent('DatePicker', DatePickerComponent);

// 用户点击或聚焦时水合
hydrateIslandOnInteraction('DatePicker', '[data-island="datepicker"]', { format: 'YYYY-MM-DD' }, [
  'click',
  'focus',
]);
```

---

## registerIslandComponent()

注册一个 named island 组件，供 `hydrateIsland` 和 `createIslandSSRContent` 使用。

### 签名

```ts
function registerIslandComponent(name: string, component: ComponentOptions): void;
```

---

## createIslandSSRContent()

在 SSR 阶段生成 island 组件的 HTML 内容，包含水合所需的元数据。

### 签名

```ts
function createIslandSSRContent(name: string, props?: Record<string, unknown>): string;
```

---

## Vapor App API

### defineVaporComponent()

定义一个 Vapor 模式（Signal 模式）的组件。

### 签名

```ts
function defineVaporComponent(options: VaporComponentOptions): VaporComponentDefinition;
```

### VaporComponentOptions

```ts
interface VaporComponentOptions {
  name?: string;
  props?: Record<string, PropOptions>;
  setup?: (props: Record<string, unknown>, ctx: VaporContext) => Record<string, unknown> | void;
  template?: string;
  beforeMount?(): void;
  mounted?(): void;
  beforeUnmount?(): void;
  unmounted?(): void;
}
```

### 示例

```ts
import { defineVaporComponent } from '@lytjs/renderer';
import { ref } from '@lytjs/reactivity';

const Counter = defineVaporComponent({
  name: 'Counter',
  props: { initialCount: { type: Number, default: 0 } },
  setup(props) {
    const count = ref(props.initialCount);
    return { count };
  },
  template: '<button @click="count++">Count: {{ count }}</button>',
});
```

---

### createVaporApp()

创建一个 Vapor 模式的应用实例。

### 签名

```ts
function createVaporApp(options: VaporAppOptions): VaporApp;
```

### VaporAppOptions

```ts
interface VaporAppOptions {
  rootComponent: VaporComponentDefinition;
  rootProps?: Record<string, unknown>;
}
```

---

## DOM 属性补丁操作

以下函数用于 DOM 属性的更新操作：

| 函数                      | 签名                                                       | 说明               |
| ------------------------- | ---------------------------------------------------------- | ------------------ |
| `patchProp`               | `(el: Element, key: string, prevValue, nextValue) => void` | 通用属性补丁       |
| `patchClass`              | `(el: Element, nextValue) => void`                         | 更新 class         |
| `patchStyle`              | `(el: Element, prev, next) => void`                        | 更新 style         |
| `patchEvent`              | `(el: Element, name, nextValue) => void`                   | 更新事件监听       |
| `patchAttr`               | `(el: Element, key, value) => void`                        | 更新 HTML 属性     |
| `normalizeEventName`      | `(name: string) => string`                                 | 规范化事件名       |
| `getEventKey`             | `(name: string) => string`                                 | 获取事件键         |
| `parseEventModifier`      | `(name: string) => { name, modifiers }`                    | 解析事件修饰符     |
| `createInvoker`           | `(initialValue, event) => EventInvoker`                    | 创建事件调用器     |
| `removeAllEventListeners` | `(el: Element) => void`                                    | 移除所有事件监听   |
| `isOn`                    | `(key: string) => boolean`                                 | 判断是否为事件属性 |

---

## Web 渲染器宿主

| 导出              | 说明                     |
| ----------------- | ------------------------ |
| `WebRendererHost` | Web 平台的渲染器宿主实现 |
| `createWebHost()` | 创建 Web 宿主实例        |
| `wrapDOMEvent()`  | 包装 DOM 事件            |

---

## 组件资源清理

以下函数用于组件卸载时自动清理资源：

| 函数                                  | 签名                           | 说明                             |
| ------------------------------------- | ------------------------------ | -------------------------------- |
| `registerComponentEventListener`      | `(el, event, handler) => void` | 注册事件监听器，卸载时自动移除   |
| `registerComponentEffectSubscription` | `(effect) => void`             | 注册 effect 订阅，卸载时自动停止 |
| `registerComponentCleanup`            | `(cleanupFn) => void`          | 注册清理回调                     |
| `cleanupComponentResources`           | `(instance) => void`           | 执行所有已注册的资源清理         |

---

## 工具函数

| 函数            | 签名                       | 说明                 |
| --------------- | -------------------------- | -------------------- |
| `escapeHtml`    | `(str: string) => string`  | HTML 特殊字符转义    |
| `isBooleanAttr` | `(key: string) => boolean` | 判断是否为布尔属性   |
| `isVoidElement` | `(tag: string) => boolean` | 判断是否为 void 元素 |

---

## 首次渲染优化

以下 API 从 `@lytjs/reactivity` re-export，用于优化首次渲染性能：

| 函数                          | 说明                               |
| ----------------------------- | ---------------------------------- |
| `withFirstRenderOptimization` | 包裹首次渲染过程，期间禁用依赖收集 |
| `shouldSkipTracking`          | 检查当前是否应跳过依赖收集         |
| `getSkippedTrackingCount`     | 获取被跳过的追踪次数（调试用）     |
| `resetSkippedTrackingCount`   | 重置被跳过的追踪计数（测试用）     |

---

## 懒加载 API

### defineLazyComponent()

定义一个懒加载组件，支持自动代码分割和按需加载。

#### 签名

```ts
function defineLazyComponent<T extends Component>(
  loader: () => Promise<T>,
  options?: LazyComponentOptions,
): LazyComponent;
```

#### LazyComponentOptions

```ts
interface LazyComponentOptions {
  /** 加载中显示的组件 */
  loadingComponent?: Component;
  /** 加载失败时显示的组件 */
  errorComponent?: Component;
  /** 显示 loading 组件前的延迟（毫秒），默认 200 */
  delay?: number;
  /** 超时时间（毫秒），超时后显示错误组件 */
  timeout?: number;
  /** 加载失败时的回调 */
  onError?: (error: Error, retry: () => void, fail: () => void, attempts: number) => void;
}
```

#### 示例

```ts
import { defineLazyComponent } from '@lytjs/renderer';

// 基本用法
const LazyDashboard = defineLazyComponent(() => import('./Dashboard.vue'));

// 带选项
const LazySettings = defineLazyComponent(() => import('./Settings.vue'), {
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,
  timeout: 10000,
  onError(error, retry, fail, attempts) {
    if (attempts <= 3) retry();
    else fail();
  },
});
```

---

### preloadComponent()

预加载懒加载组件，提前获取组件代码。

#### 签名

```ts
function preloadComponent(component: LazyComponent): Promise<Component>;
```

#### 示例

```ts
import { defineLazyComponent, preloadComponent } from '@lytjs/renderer';

const LazyDashboard = defineLazyComponent(() => import('./Dashboard.vue'));

// 在用户可能访问前预加载
button.addEventListener('mouseenter', () => {
  preloadComponent(LazyDashboard);
});
```

---

## 渲染器插件系统

LytJS 的渲染器支持插件扩展，可在组件生命周期中注入自定义逻辑。

### RendererPlugin

渲染器插件接口。

```ts
interface RendererPlugin<HN = unknown, HE extends HN = HN> {
  name: string;

  /** 安装时调用 */
  install?(renderer: Renderer<HN, HE>): void;

  /** 组件挂载前 */
  onBeforeMount?(ctx: PluginContext<HN, HE>): void;

  /** 组件挂载后 */
  onMounted?(ctx: PluginContext<HN, HE>): void;

  /** 组件更新前 */
  onBeforeUpdate?(ctx: PluginContext<HN, HE>): void;

  /** 组件更新后 */
  onUpdated?(ctx: PluginContext<HN, HE>): void;

  /** 组件卸载前 */
  onBeforeUnmount?(ctx: PluginContext<HN, HE>): void;

  /** 组件卸载后 */
  onUnmounted?(ctx: PluginContext<HN, HE>): void;

  /** VNode 创建后 */
  onVNodeCreated?(vnode: VNode, parentVnode: VNode | null): void;

  /** VNode 挂载前 */
  onVNodeBeforeMount?(vnode: VNode, container: HN): void;

  /** VNode 挂载后 */
  onVNodeMounted?(vnode: VNode, container: HN): void;

  /** VNode 更新前 */
  onVNodeBeforeUpdate?(vnode: VNode, oldVnode: VNode): void;

  /** VNode 更新后 */
  onVNodeUpdated?(vnode: VNode, oldVnode: VNode): void;

  /** VNode 卸载前 */
  onVNodeBeforeUnmount?(vnode: VNode): void;

  /** VNode 卸载后 */
  onVNodeUnmounted?(vnode: VNode): void;

  /** 卸载时调用 */
  uninstall?(renderer: Renderer<HN, HE>): void;
}
```

### PluginContext

插件上下文。

```ts
interface PluginContext<HN = unknown, HE extends HN = HN> {
  /** 渲染器实例 */
  renderer: Renderer<HN, HE>;
  /** 组件 VNode */
  vnode: VNode;
  /** 组件公开实例 */
  instance: ComponentPublicInstance | null;
  /** 容器节点 */
  container: HE;
}
```

### LifecycleEvent

生命周期事件名称。

```ts
type LifecycleEvent =
  | 'beforeMount'
  | 'mounted'
  | 'beforeUpdate'
  | 'updated'
  | 'beforeUnmount'
  | 'unmounted';
```

### HookHandler

钩子处理函数类型。

```ts
type HookHandler<T = unknown> = (ctx: T) => void | Promise<void>;
```

### use()

在渲染器上安装插件。

```ts
function use<HN, HE>(renderer: Renderer<HN, HE>, plugin: RendererPlugin<HN, HE>): void;
```

**示例：**

```ts
import { createDOMRenderer, use } from '@lytjs/renderer';

const renderer = createDOMRenderer();

// 定义插件
const myPlugin: RendererPlugin = {
  name: 'my-plugin',
  install(r) {
    console.log('Plugin installed');
  },
  onMounted(ctx) {
    console.log('Component mounted:', ctx.vnode);
  },
};

// 安装插件
use(renderer, myPlugin);
```

### getInstalledPlugins()

获取已安装的插件列表。

```ts
function getInstalledPlugins<HN, HE>(renderer: Renderer<HN, HE>): RendererPlugin<HN, HE>[];
```

### isPluginInstalled()

检查插件是否已安装。

```ts
function isPluginInstalled<HN, HE>(renderer: Renderer<HN, HE>, pluginName: string): boolean;
```

### removePlugin()

移除已安装的插件。

```ts
function removePlugin<HN, HE>(renderer: Renderer<HN, HE>, pluginName: string): void;
```

### executeHooks()

手动执行指定生命周期钩子。

```ts
function executeHooks<HN, HE>(
  renderer: Renderer<HN, HE>,
  event: LifecycleEvent,
  context: PluginContext<HN, HE>,
): Promise<void>;
```

---

## 扩展阅读

- [SSR 服务端渲染](../guide/ssr) - 服务端渲染完整指南
- [渲染模式](../guide/rendering-modes) - DOM / Signal / SSR 渲染对比
- [Island Architecture](../guide/ssr#island-architecture) - 部分水合策略

---

## Vapor / Signal 模式的组件支持

Signal（Vapor）模式此前**完全没有组件概念**：组件标签会被当成普通 HTML 元素写进
`createTemplate` 的模板串，DOM 里留下字面量 `<Child />`，组件的 setup/render 不会执行。

现在通过运行时 `mountComponent()` + 编译产物中的占位元素解决：

```ts
// 模板 <div><Child :title="t"/></div> 的编译产物（节选）
const _0 = createTemplate('<div><lyt-comp data-lyt-comp="Child"></lyt-comp></div>');
const [_1] = _0.children;
insert(_0, _n);
mountComponent(_c.Child, { title: _c.t }, _1);
```

要点：

| 项目     | 说明                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 占位元素 | 组件在模板串里被序列化为 `<lyt-comp data-lyt-comp="Child">`（**必须是元素**：注释节点不在 `element.children` 里，会让后续按下标取元素的变量错位）                                                                                                                                                                                                                                                  |
| props    | 静态属性与 `v-bind` 表达式都会进入传给组件的 props 对象（表达式前缀为 `_c.`）                                                                                                                                                                                                                                                                                                                      |
| 事件     | `@click="fn"` 编译为 `onClick: _c.fn`（kebab 事件名先 camelize 成 `onMyEvent`），与 `@lytjs/component` 的 `emit()` / `toHandlerKey()` 约定对齐；组件内 `emit('click')` 即可触达父级处理器                                                                                                                                                                                                          |
| 更新策略 | 首版采用 **effect 包裹的整体重渲染**（依赖变化时重建该组件子树），正确性优先；细粒度更新留待后续版本                                                                                                                                                                                                                                                                                               |
| 非优化版 | `optimizeSignal: false` 走 `generateSignal`，**同样支持组件挂载**（输出 `<lyt-comp>` 占位 + `mountComponent`），与优化版行为一致                                                                                                                                                                                                                                                                   |
| 插槽     | 组件子内容编译为默认插槽 `{default:()=>[vnode,...]}`（**必须是 vnode**：`normalizeSlotValue` 校验 `__v_isVNode`，而 signal 产物本身是 DOM 操作，故此处生成 vnode 构造代码）。覆盖文本 / 插值 / 元素（含 `:bind` 与 `@事件`）/ 嵌套组件。**插槽依赖需「预热」**：插槽真正执行发生在组件渲染内部（另一层响应式边界），故 `mountComponent` 在自身 effect 里先求值一次，否则父级数据变化不会触发重渲染 |
| 条件渲染 | 插槽内 `v-if` → `(cond?vnode:null)`；`v-else` → 三元另支；`v-else-if` → **嵌套三元**（数据源 `JS_CONDITIONAL_EXPRESSION` 的 `alternate` 递归；`consequent`/`alternate` 为 `VNODE_CALL`）                                                                                                                                                                                                           |
| v-show   | 插槽内 `v-show` → `style:{"display":(cond?'':'none')}`（元素始终在 DOM，仅切换 display）。含多个 `v-show` 或表达式缺失时整体放弃                                                                                                                                                                                                                                                                   |
| 列表渲染 | 插槽内 `v-for` → `...((source).map((item,i)=>vnode))`（数据源是 `RENDER_LIST` 调用）。**循环变量作为 `locals` 传给 `prefixIdentifiers`**，否则 `item.id` 会被误加 `_ctx.`/`_c.` 前缀                                                                                                                                                                                                               |
| 严格模式 | 上述两种编译均采用：只要有一段无法完整还原就**整体跳过**，绝不下发半成品（实测 `v-else`/`v-else-if`/`v-show`、结构异常节点均跳过）                                                                                                                                                                                                                                                                 |
| 具名插槽 | `<template #name>…</template>` → `{"name":()=>[vnode,…]}`，与默认插槽并列；插槽体内的文本/插值/元素/`v-if`/`v-for` 沿用同一套编译                                                                                                                                                                                                                                                                  |
| 已知限制 | **动态**插槽名（`#[expr]`）与插槽作用域（`v-slot="props"`）暂不支持                                                                                                                                                                                                                                                                                                                                |

```ts
import { mountComponent } from '@lytjs/renderer';

export function mountComponent(
  comp: unknown,
  props: Record<string, unknown> | null | undefined,
  container: unknown,
): void;
```

### v-once / v-memo（Signal 模式语义）

Signal（Vapor）模式此前在 codegen 的指令分发里**没有这两条指令的分支**，
元素照常建立响应式 effect，"只渲染一次"与"依赖未变不重渲染"的语义完全丢失。
现在两条指令的语义均已落地：

| 指令             | 产物形态                                                     | 语义                                               |
| ---------------- | ------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------- | -------------------------- |
| 普通绑定         | `e(()=>x(_0,_c.msg));`                                       | 每次依赖变化都重新渲染                             |
| `v-once`         | `x(_0,_c.msg);`                                              | 去掉 effect 包裹，只渲染一次（并沿元素树向下传递） |
| `v-memo="[a,b]"` | `let \_memo_0=null;e(()=>{const \_d=[_c.a,_c.b];if(!\_memo_0 |                                                    | \_memo_0.some((v,i)=>v!==\_d[i])){\_memo_0=\_d;x(\_0,\_c.msg);}});` | 依赖数组未变化则不重新渲染 |

> 实现要点：`transformOnce` / `transformVMemo` 在 transform 阶段已经把指令
> **从 props 里摘掉了**，所以 codegen 不能再去 props 里找指令，而要读转换留下的痕迹：
> v-once 表现为元素 `codegenNode` 被替换成 `_hoisted_N` 引用；v-memo 的依赖信息
> 写在元素元数据里（可通过 `getMemoMeta()` 读取）。
