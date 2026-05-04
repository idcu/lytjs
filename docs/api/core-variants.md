# 独立构建变体 API 参考

LytJS 提供了三个核心入口包，分别针对不同的使用场景和渲染模式：

| 包名 | 渲染模式 | 说明 |
|------|---------|------|
| `@lytjs/core` | VNode + Signal | 完整功能，包含所有 API |
| `@lytjs/core-vnode` | 仅 VNode | VNode 模式专用，排除 Signal 相关代码 |
| `@lytjs/core-signal` | 仅 Signal | Signal 模式专用，排除 VDOM 相关代码 |

---

## @lytjs/core-vnode

VNode 渲染模式专用入口，只导入 VNode 相关的渲染器，完全排除 Signal 相关代码。

### 导出列表

#### 应用创建

| 导出 | 签名 | 说明 |
|------|------|------|
| `createApp` | `(rootComponent, rootProps?, options?) => App` | 创建应用实例（VNode 专用） |

#### VNode 辅助

| 导出 | 签名 | 说明 |
|------|------|------|
| `h` / `createElement` | `(type, props?, ...children) => VNode` | 创建 VNode |

#### 组件定义

| 导出 | 签名 | 说明 |
|------|------|------|
| `defineComponent` | `(options) => ComponentOptions` | 定义组件 |
| `defineAsyncComponent` | `(source) => Component` | 定义异步组件 |

#### 调度

| 导出 | 签名 | 说明 |
|------|------|------|
| `nextTick` | `(fn?) => Promise<void>` | 下一个 DOM 更新周期 |

#### 组件/指令解析

| 导出 | 签名 | 说明 |
|------|------|------|
| `resolveComponent` | `(name) => Component \| undefined` | 解析组件 |
| `resolveDirective` | `(name) => Directive \| undefined` | 解析指令 |

#### 指令辅助

| 导出 | 签名 | 说明 |
|------|------|------|
| `withDirectives` | `(vnode, directives) => VNode` | 应用指令 |
| `withMemo` | `(memo, render, cache, index) => VNode` | 缓存渲染 |

#### Composition API

| 导出 | 签名 | 说明 |
|------|------|------|
| `useSlots` | `() => InternalSlots` | 获取插槽 |
| `useAttrs` | `() => Record<string, unknown>` | 获取 attrs |
| `useModel` | `<T>(props, key) => WritableComputedRef<T>` | 双向绑定 |

#### Web Component

| 导出 | 签名 | 说明 |
|------|------|------|
| `defineCustomElement` | `(options, customOptions?) => CustomElementConstructor` | 定义 Custom Element |
| `useShadowRoot` | `() => ShadowRoot \| null` | 获取 Shadow Root |
| `useHost` | `() => HTMLElement \| null` | 获取宿主元素 |
| `useWebComponentSlots` | `(onChange) => void` | 监听 slot 变化 |
| `injectChildStyles` | `(styles) => void` | 注入子组件样式 |

#### 生命周期钩子

| 导出 | 签名 | 说明 |
|------|------|------|
| `onMounted` | `(hook) => void` | 挂载完成 |
| `onUnmounted` | `(hook) => void` | 卸载完成 |
| `onUpdated` | `(hook) => void` | 更新完成 |
| `onBeforeMount` | `(hook) => void` | 挂载前 |
| `onBeforeUnmount` | `(hook) => void` | 卸载前 |
| `onBeforeUpdate` | `(hook) => void` | 更新前 |
| `onErrorCaptured` | `(hook) => void` | 错误捕获 |
| `onRenderTracked` | `(hook) => void` | 依赖追踪（调试） |
| `onRenderTriggered` | `(hook) => void` | 依赖触发（调试） |

#### Re-export（不含 Signal）

| 导出 | 来源 | 说明 |
|------|------|------|
| `ref`, `reactive`, `computed`, `watch`, `watchEffect`, `effect` | `@lytjs/reactivity` | 基础响应式 API（不含 Signal） |
| `createVNode`, `Fragment`, `Text`, `Comment`, `cloneVNode`, `mergeProps` | `@lytjs/vdom` | VNode API |
| `compile` | `@lytjs/compiler` | 模板编译器 |

### 使用场景

- 只使用 VNode 渲染模式的项目
- 需要最小化包体积的场景
- 不需要 Signal 细粒度更新的应用

---

## @lytjs/core-signal

Signal 渲染模式专用入口，只导入 Signal 相关的渲染器，完全排除 VDOM 相关代码。

### 导出列表

#### 应用创建

| 导出 | 签名 | 说明 |
|------|------|------|
| `createApp` | `(rootComponent, rootProps?, options?) => App` | 创建应用实例（Signal 专用） |

#### 组件定义

| 导出 | 签名 | 说明 |
|------|------|------|
| `defineComponent` | `(options) => ComponentOptions` | 定义组件 |

#### 调度

| 导出 | 签名 | 说明 |
|------|------|------|
| `nextTick` | `(fn?) => Promise<void>` | 下一个 DOM 更新周期 |

#### 生命周期钩子

| 导出 | 签名 | 说明 |
|------|------|------|
| `onMounted` | `(hook) => void` | 挂载完成 |
| `onUnmounted` | `(hook) => void` | 卸载完成 |
| `onBeforeMount` | `(hook) => void` | 挂载前 |
| `onBeforeUnmount` | `(hook) => void` | 卸载前 |
| `onErrorCaptured` | `(hook) => void` | 错误捕获 |

#### Re-export（包含 Signal）

| 导出 | 来源 | 说明 |
|------|------|------|
| `ref`, `reactive`, `computed`, `watch`, `watchEffect`, `effect` | `@lytjs/reactivity` | 基础响应式 API |
| `signal`, `computedSignal`, `readonlySignal` | `@lytjs/reactivity` | Signal API |
| `set`, `update`, `valueOf` | `@lytjs/reactivity` | Signal 操作函数 |
| `signalBatch`, `signalUntrack` | `@lytjs/reactivity` | Signal 批量/取消追踪 |
| `compile` | `@lytjs/compiler` | 模板编译器 |

#### DOM 运行时（Signal 模式核心）

以下 API 从 `@lytjs/dom-runtime` 导出，是 Signal 模式下直接操作 DOM 的核心函数：

| 导出 | 签名 | 说明 |
|------|------|------|
| `insert` | `(parent, child, anchor?) => void` | 插入 DOM 节点 |
| `remove` | `(child) => void` | 移除 DOM 节点 |
| `createTemplate` | `(html) => HTMLTemplateElement` | 创建模板元素 |
| `createElement` | `(tag) => Element` | 创建元素 |
| `createTextNode` | `(text) => Text` | 创建文本节点 |
| `setText` | `(node, text) => void` | 设置文本内容 |
| `setHTML` | `(el, html) => void` | 设置 innerHTML |
| `setAttribute` | `(el, key, value) => void` | 设置 HTML 属性 |
| `removeAttribute` | `(el, key) => void` | 移除 HTML 属性 |
| `setProperty` | `(el, key, value) => void` | 设置 DOM 属性 |
| `setStyle` | `(el, key, value) => void` | 设置样式 |
| `setClass` | `(el, value) => void` | 设置 className |
| `toggleClass` | `(el, value, force?) => void` | 切换 class |
| `addEventListener` | `(el, event, handler) => void` | 添加事件监听 |
| `createEventHandler` | `(el, event, handler) => EventListener` | 创建事件处理器 |
| `reconcileArray` | `(parent, oldArr, newArr, options?) => void` | 数组调和 |
| `bindEffect` | `(fn) => void` | 绑定 effect |
| `batchDOM` | `(fn) => void` | 批量 DOM 操作 |
| `onCleanup` | `(fn) => void` | 注册清理回调 |
| `runCleanups` | `() => void` | 执行清理回调 |
| `createCleanupScope` | `() => () => void` | 创建清理作用域 |

### 使用场景

- 只使用 Signal 渲染模式的项目
- 追求极致运行时性能的场景
- 不需要 VNode diff 的轻量应用

---

## 与 @lytjs/core 的区别

### 功能对比

| 特性 | `@lytjs/core` | `@lytjs/core-vnode` | `@lytjs/core-signal` |
|------|:---:|:---:|:---:|
| VNode 渲染 | Y | Y | N |
| Signal 渲染 | Y | N | Y |
| `h()` / `createElement()` | Y | Y | N |
| `defineAsyncComponent()` | Y | Y | N |
| `resolveComponent()` / `resolveDirective()` | Y | Y | N |
| `withDirectives()` / `withMemo()` | Y | Y | N |
| `useSlots()` / `useAttrs()` / `useModel()` | Y | Y | N |
| Web Component API | Y | Y | N |
| 完整生命周期钩子 | Y | Y | 部分 |
| Signal API | Y | N | Y |
| DOM 运行时 API | N | N | Y |
| 响应式 API（ref/reactive/computed/watch） | Y | Y | Y |
| 模板编译器 | Y | Y | Y |

### 体积对比

| 包名 | 预估体积 (min+gzip) | 说明 |
|------|:---:|------|
| `@lytjs/core` | ~15-18 KB | 完整功能，包含 VNode + Signal |
| `@lytjs/core-vnode` | ~12-14 KB | 排除 Signal 相关代码 |
| `@lytjs/core-signal` | ~8-10 KB | 排除 VDOM 相关代码，最轻量 |

> 体积数据为预估值，实际大小取决于构建配置和 tree-shaking 效果。

---

## 迁移指南

### 从 @lytjs/core 迁移到 @lytjs/core-vnode

如果你确定不需要 Signal 渲染模式，可以切换到 `@lytjs/core-vnode`：

```diff
- import { createApp, h, ref, signal } from '@lytjs/core'
+ import { createApp, h, ref } from '@lytjs/core-vnode'
```

需要注意：
- `signal`、`computedSignal`、`readonlySignal` 等 Signal API 不可用
- `createApp` 的 `rendererMode` 选项只支持 `'vnode'`，不支持 `'signal'` 或 `'vapor'`
- 其他 API 保持完全兼容

### 从 @lytjs/core 迁移到 @lytjs/core-signal

如果你确定只使用 Signal 渲染模式：

```diff
- import { createApp, h, ref, defineAsyncComponent } from '@lytjs/core'
+ import { createApp, ref, signal } from '@lytjs/core-signal'
```

需要注意：
- `h()`、`createElement()` 不可用（Signal 模式使用模板编译）
- `defineAsyncComponent()` 不可用
- `resolveComponent()`、`resolveDirective()` 不可用
- `withDirectives()`、`withMemo()` 不可用
- `useSlots()`、`useAttrs()`、`useModel()` 不可用
- Web Component API 不可用
- 生命周期钩子只有 `onMounted`、`onUnmounted`、`onBeforeMount`、`onBeforeUnmount`、`onErrorCaptured`
- 组件必须使用 `template` 字符串，不能使用渲染函数
- 可以使用 `@lytjs/dom-runtime` 的 API 进行底层 DOM 操作

### 从 @lytjs/core-vnode 迁移到 @lytjs/core-signal

这是一个较大的变更，需要重写组件的渲染逻辑：

```diff
- // VNode 模式
- import { createApp, h, ref } from '@lytjs/core-vnode'
+ // Signal 模式
+ import { createApp, ref, signal } from '@lytjs/core-signal'

- const app = createApp({
-   setup() {
-     const count = ref(0)
-     return { count }
-   },
-   render() {
-     return h('div', {}, [
-       h('span', {}, String(this.count)),
-       h('button', { onClick: () => this.count++ }, '+1')
-     ])
-   }
- })
+ const app = createApp({
+   template: '<div><span>{{ count }}</span><button @click="increment">+1</button></div>',
+   setup() {
+     const count = ref(0)
+     function increment() { count.value++ }
+     return { count, increment }
+   }
+ })
```

---

## 选择建议

- **不确定用哪个**：使用 `@lytjs/core`，它包含所有功能，是最安全的选择
- **追求最小体积 + VNode 模式**：使用 `@lytjs/core-vnode`
- **追求极致性能 + Signal 模式**：使用 `@lytjs/core-signal`
- **需要 Web Component 支持**：使用 `@lytjs/core` 或 `@lytjs/core-vnode`
- **需要异步组件**：使用 `@lytjs/core` 或 `@lytjs/core-vnode`
