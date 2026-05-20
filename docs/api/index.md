# API 参考

LytJS 框架的 API 参考文档，按包分类组织。

## 核心包

| 包名                              | 说明                                                               |
| --------------------------------- | ------------------------------------------------------------------ |
| [@lytjs/core](./core)             | 核心入口包，提供应用创建、组件定义、生命周期、组合式 API 等        |
| [@lytjs/reactivity](./reactivity) | 响应式系统，提供 Ref、Reactive、Computed、Watch、Effect、Signal 等 |
| [@lytjs/compiler](./compiler)     | 模板编译器，支持 VNode/Signal/SSR 三种代码生成模式                 |
| [@lytjs/renderer](./renderer)     | 渲染后端，提供 DOM/SSR/Signal 渲染和 Island Architecture           |
| [@lytjs/component](./component)   | 组件系统，提供组件实例管理、内置组件和生命周期                     |

## 构建变体

| 包名                            | 说明                                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| [独立构建变体](./core-variants) | `@lytjs/core-vnode` 和 `@lytjs/core-signal` 的 API 参考和迁移指南 |

## 基础设施包

| 包名                   | 说明                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `@lytjs/shared-types`  | 共享类型定义（VNode、组件、渲染器、App 上下文等）             |
| `@lytjs/host-contract` | 跨平台渲染接口定义（Host Contract）                           |
| `@lytjs/common-*`      | 30 个工具子包（constants、is、string、error、dom、events 等） |

## 平台与适配包

| 包名                 | 说明                                                       |
| -------------------- | ---------------------------------------------------------- |
| `@lytjs/adapter-web` | Web 平台适配器（DOM 渲染器、事件包装、属性补丁、水合支持） |
| `@lytjs/dom-runtime` | DOM 运行时工具（Signal 模式下的 DOM 操作 API）             |
| `@lytjs/dom`         | DOM 平台封装（Web Components 支持）                        |
| `@lytjs/vdom`        | 虚拟 DOM 和 diff 算法（VNode、PatchFlags、Block Tree）     |
| `@lytjs/web`         | Web 平台工具（CSS 变量、ResizeObserver、Web Components）   |

## 快速导航

### 响应式 API（新手推荐 Signal 优先）

| API              | 说明                        | 文档                                         |
| ---------------- | --------------------------- | -------------------------------------------- |
| `signal`         | 创建 Signal（新手推荐）     | [reactivity.md](./reactivity#signal)         |
| `computedSignal` | 创建计算 Signal（新手推荐） | [reactivity.md](./reactivity#computedsignal) |
| `ref`            | 创建响应式引用              | [reactivity.md](./reactivity#ref)            |
| `reactive`       | 创建响应式对象              | [reactivity.md](./reactivity#reactive)       |
| `computed`       | 创建计算属性                | [reactivity.md](./reactivity#computed)       |
| `watch`          | 侦听数据变化                | [reactivity.md](./reactivity#watch)          |
| `watchEffect`    | 自动追踪依赖                | [reactivity.md](./reactivity#watcheffect)    |
| `effect`         | 创建副作用                  | [reactivity.md](./reactivity#effect)         |

### 类型守卫

| API             | 说明                   | 文档                                        |
| --------------- | ---------------------- | ------------------------------------------- |
| `isRef`         | 判断是否为 Ref         | [reactivity.md](./reactivity#isref)         |
| `isShallowRef`  | 判断是否为浅层 Ref     | [reactivity.md](./reactivity#isshallowref)  |
| `isComputedRef` | 判断是否为计算属性 Ref | [reactivity.md](./reactivity#iscomputedref) |
| `isReactive`    | 判断是否为响应式代理   | [reactivity.md](./reactivity#isreactive)    |
| `isReadonly`    | 判断是否为只读代理     | [reactivity.md](./reactivity#isreadonly)    |
| `isProxy`       | 判断是否为代理         | [reactivity.md](./reactivity#isproxy)       |
| `isSignal`      | 判断是否为 Signal      | [reactivity.md](./reactivity#issignal)      |

### 渲染器 API

| API                          | 说明               | 文档                                                 |
| ---------------------------- | ------------------ | ---------------------------------------------------- |
| `createDOMRenderer`          | 创建 DOM 渲染器    | [renderer.md](./renderer#createdomrenderer)          |
| `createSignalRenderer`       | 创建 Signal 渲染器 | [renderer.md](./renderer#createsignalrenderer)       |
| `renderToString`             | SSR 字符串渲染     | [renderer.md](./renderer#rendertostring)             |
| `renderToStream`             | SSR 流式渲染       | [renderer.md](./renderer#rendertostream)             |
| `hydrateIsland`              | Island 水合        | [renderer.md](./renderer#hydrateisland)              |
| `hydrateIslandOnVisible`     | 可见时水合         | [renderer.md](./renderer#hydrateislandonvisible)     |
| `hydrateIslandOnIdle`        | 空闲时水合         | [renderer.md](./renderer#hydrateislandonidle)        |
| `hydrateIslandOnInteraction` | 交互时水合         | [renderer.md](./renderer#hydrateislandoninteraction) |
| `defineLazyComponent`        | 定义懒加载组件     | [renderer.md](./renderer#definelazycomponent)        |
| `preloadComponent`           | 预加载组件         | [renderer.md](./renderer#preloadcomponent)           |
| `prefetchComponent`          | 预取组件           | [renderer.md](./renderer#prefetchcomponent)          |

### 核心 API

| API                    | 说明                | 文档                                   |
| ---------------------- | ------------------- | -------------------------------------- |
| `createApp`            | 创建应用实例        | [core.md](./core#createapp)            |
| `h`                    | 创建 VNode          | [core.md](./core#h)                    |
| `defineComponent`      | 定义组件            | [core.md](./core#definecomponent)      |
| `defineAsyncComponent` | 定义异步组件        | [core.md](./core#defineasynccomponent) |
| `nextTick`             | 下一个 DOM 更新周期 | [core.md](./core#nexttick)             |
| `onMounted`            | 挂载完成钩子        | [core.md](./core#onmounted)            |
| `onUnmounted`          | 卸载完成钩子        | [core.md](./core#onunmounted)          |

## 按渲染模式分类

### VNode 模式（@lytjs/core / @lytjs/core-vnode）

- `h()` / `createVNode()` / `createElement()`
- `Fragment` / `Text` / `Comment`
- `cloneVNode()` / `mergeProps()`
- `withDirectives()` / `withMemo()`
- `resolveComponent()` / `resolveDirective()`
- `useSlots()` / `useAttrs()` / `useModel()`
- `defineCustomElement()`

### Signal 模式（@lytjs/core-signal）

- `signal()` / `computedSignal()` / `readonlySignal()`
- `set()` / `update()` / `valueOf()`
- `signalBatch()` / `signalUntrack()`
- DOM 运行时 API：`insert` / `remove` / `createElement` / `setText` / `setAttribute` / `addEventListener` 等

### 共享 API（两种模式都支持）

- `createApp` / `ref` / `reactive` / `computed`
- `watch` / `watchEffect` / `effect`
- `defineComponent` / `nextTick`
- 生命周期钩子：`onMounted` / `onUnmounted` / `onUpdated` 等
