# @lytjs/component API 参考

`@lytjs/component` 是 LytJS 的组件系统核心包，提供了组件实例管理、Props/Emits/Slots 规范化、生命周期钩子以及内置组件（KeepAlive、Suspense、Transition、TransitionGroup、Teleport、ErrorBoundary）。

---

## ComponentOptions 接口

`ComponentOptions` 是定义组件的核心接口，包含组件的所有配置选项。

```ts
interface ComponentOptions<
  Props = Record<string, unknown>,
  RawBindings = Record<string, unknown>,
  D = Record<string, unknown>,
  C extends Record<string, unknown> = Record<string, unknown>,
> {
  /** 组件名称 */
  name?: string;

  /** Props 声明 */
  props?: Record<string, PropOptions<unknown>> & Props;

  /** 事件声明 */
  emits?: string[] | Record<string, (...args: unknown[]) => void>;

  /** 组合式 API setup 函数 */
  setup?: (props: Props, ctx: SetupContext) => RawBindings | RenderFunction | void;

  /** 渲染函数 */
  render?: RenderFunction;

  /** 响应式数据 */
  data?: () => D;

  /** 计算属性 */
  computed?: C;

  /** 侦听器 */
  watch?: Record<string, (...args: unknown[]) => void>;

  /** 方法 */
  methods?: Record<string, (...args: unknown[]) => unknown>;

  /** Provide 注入 */
  provide?: Record<string, unknown> | (() => Record<string, unknown>);

  /** Inject 注入 */
  inject?: Record<string, unknown>;

  /** 混入 */
  mixins?: ComponentOptions[];

  /** 继承 */
  extends?: ComponentOptions;

  // ===== 生命周期钩子 =====
  beforeCreate?(): void;
  created?(): void;
  beforeMount?(): void;
  mounted?(): void;
  beforeUpdate?(): void;
  updated?(): void;
  beforeUnmount?(): void;
  unmounted?(): void;
  activated?(): void;
  deactivated?(): void;

  /** 错误捕获钩子 */
  errorCaptured?(
    err: Error,
    instance: ComponentPublicInstance | null,
    info: string,
  ): boolean | void;

  /** 是否禁用 attrs 透传，默认 true */
  inheritAttrs?: boolean;
}
```

### PropOptions

```ts
interface PropOptions<T = unknown> {
  /** Prop 类型构造器 */
  type?: PropConstructor<T>;
  /** 是否必传 */
  required?: boolean;
  /** 默认值 */
  default?: T;
  /** 自定义校验函数 */
  validator?: (value: unknown) => boolean;
}
```

### SetupContext

```ts
interface SetupContext {
  /** 非 Prop 的属性 */
  attrs: Record<string, unknown>;
  /** 插槽 */
  slots: InternalSlots;
  /** 事件发射器 */
  emit: (event: string, ...args: unknown[]) => void;
  /** 暴露公共属性/方法 */
  expose?: (exposed?: Record<string, unknown>) => void;
}
```

---

## defineComponent()

定义一个组件。返回传入的 `ComponentOptions` 对象本身（提供 TypeScript 类型推导支持）。

### 签名

```ts
function defineComponent(options: ComponentOptions): ComponentOptions;
```

### 示例

```ts
import { defineComponent, ref, computed } from '@lytjs/component';

const Counter = defineComponent({
  name: 'Counter',
  props: {
    initialCount: { type: Number, default: 0 },
    step: { type: Number, default: 1 },
  },
  emits: ['update:count'],
  setup(props, { emit }) {
    const count = ref(props.initialCount);
    const doubled = computed(() => count.value * 2);

    function increment() {
      count.value += props.step;
      emit('update:count', count.value);
    }

    return { count, doubled, increment };
  },
  render() {
    return h('div', {}, [
      h('span', {}, `Count: ${this.count}`),
      h('span', {}, `Doubled: ${this.doubled}`),
      h('button', { onClick: () => this.increment() }, '+1'),
    ]);
  },
});
```

---

## defineFunctionalComponent()

定义一个函数式组件。函数式组件没有实例、没有状态、没有生命周期。

### 签名

```ts
function defineFunctionalComponent(props: Record<string, unknown>, ctx: SetupContext): VNode;
```

### 示例

```ts
import { defineFunctionalComponent, h } from '@lytjs/component';

const Heading = (props: { level: number }, { slots }) => {
  return h(`h${props.level}`, {}, slots.default?.());
};
```

---

## createComponentInstance()

为 VNode 创建组件内部实例。这是组件系统的底层 API，通常不需要直接使用。

### 签名

```ts
function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
): ComponentInternalInstance;
```

---

## setupComponent()

设置组件实例，执行 setup 函数、初始化 props/slots/data 和生命周期。

### 签名

```ts
function setupComponent(instance: ComponentInternalInstance): void;
```

---

## createComponentPublicInstance()

创建组件的公共实例代理，用于模板和渲染函数中的 `this` 访问。

### 签名

```ts
function createComponentPublicInstance(
  instance: ComponentInternalInstance,
): ComponentPublicInstance;
```

---

## createAppContext()

创建应用上下文对象。

### 签名

```ts
function createAppContext(): AppContext;
```

---

## provide() / inject()

组件级别的依赖注入。

### 签名

```ts
function provide<T>(key: string | symbol, value: T): void;
function inject<T>(key: string | symbol): T | undefined;
```

### 示例

```ts
// 父组件
setup() {
  provide('theme', ref('dark'))
}

// 子组件
setup() {
  const theme = inject<Ref<string>>('theme')
}
```

---

## Props 相关

### normalizePropsOptions()

规范化 props 选项。

### 签名

```ts
function normalizePropsOptions(
  props: Record<string, unknown> | undefined,
): Record<string, PropOptions>;
```

### resolvePropValue()

根据 props 选项解析 prop 值（处理默认值和类型转换）。

### 签名

```ts
function resolvePropValue(
  options: PropOptions,
  props: Record<string, unknown>,
  key: string,
): unknown;
```

### validateType()

校验 prop 值是否符合声明的类型。

### 签名

```ts
function validateType(value: unknown, type: unknown): boolean;
```

---

## Emit 相关

### emit()

触发组件事件。

### 签名

```ts
function emit(instance: ComponentInternalInstance, event: string, ...args: unknown[]): void;
```

### normalizeEmitsOptions()

规范化 emits 选项。

### 签名

```ts
function normalizeEmitsOptions(
  emits: string[] | Record<string, unknown> | undefined,
): Record<string, unknown> | null;
```

### isEmitValid()

检查事件名是否在 emits 声明中。

### 签名

```ts
function isEmitValid(instance: ComponentInternalInstance, event: string): boolean;
```

---

## Slots 相关

### initSlots()

初始化组件插槽。

### 签名

```ts
function initSlots(instance: ComponentInternalInstance, children: VNodeChildren | undefined): void;
```

### normalizeSlotValue()

规范化插槽值。

### 签名

```ts
function normalizeSlotValue(value: unknown): VNode[];
```

---

## 生命周期钩子

### 注册钩子函数

以下函数用于在 `setup()` 中注册生命周期钩子：

```ts
function onMounted(hook: () => void): void;
function onUpdated(hook: () => void): void;
function onUnmounted(hook: () => void): void;
function onBeforeMount(hook: () => void): void;
function onBeforeUpdate(hook: () => void): void;
function onBeforeUnmount(hook: () => void): void;
function onErrorCaptured(
  hook: (err: Error, instance: ComponentPublicInstance | null, info: string) => boolean | void,
): void;
function onActivated(hook: () => void): void;
function onDeactivated(hook: () => void): void;
function onRenderTracked(hook: (e: DebuggerEvent) => void): void;
function onRenderTriggered(hook: (e: DebuggerEvent) => void): void;
```

### 手动调用钩子函数

以下函数用于组件系统内部手动调用生命周期钩子：

```ts
function callLifecycleHook(
  instance: ComponentInternalInstance,
  hook: keyof ComponentLifecycleState['lifecycle'],
): void;
function callCreatedHook(instance: ComponentInternalInstance): void;
function callMountedHook(instance: ComponentInternalInstance): void;
function callUpdatedHook(instance: ComponentInternalInstance): void;
function callUnmountedHook(instance: ComponentInternalInstance): void;
function handleError(err: unknown, instance: ComponentInternalInstance | null, info: string): void;
```

### 实例管理

```ts
function setCurrentInstance(
  instance: ComponentInternalInstance | null,
): ComponentInternalInstance | null;
function getCurrentInstance(): ComponentInternalInstance | null;
```

---

## 内置组件

### KeepAlive

缓存组件实例，避免重复创建和销毁。

#### KeepAliveProps

```ts
interface KeepAliveProps {
  /** 包含的组件名称（字符串或正则表达式） */
  include?: string | RegExp | Array<string | RegExp>;
  /** 排除的组件名称 */
  exclude?: string | RegExp | Array<string | RegExp>;
  /** 最大缓存数量 */
  max?: number;
}
```

#### 示例

```ts
import { KeepAlive, h } from '@lytjs/component';

// 在渲染函数中使用
h(KeepAlive, { max: 10 }, () => h(currentComponent));
```

#### KeepAlive 内部 API

| 函数                                 | 说明                |
| ------------------------------------ | ------------------- |
| `createKeepAliveInstance()`          | 创建 KeepAlive 实例 |
| `matchesPattern(name, pattern)`      | 匹配缓存模式        |
| `cacheInstance(key, instance)`       | 缓存组件实例        |
| `getCachedInstance(key)`             | 获取缓存的实例      |
| `removeCachedInstance(key)`          | 移除缓存的实例      |
| `activateInstance(vnode, container)` | 激活缓存的实例      |
| `deactivateInstance(vnode)`          | 停用实例            |

---

### Suspense

异步边界组件，用于处理异步依赖（如异步组件加载、异步数据获取）。

#### SuspenseProps

```ts
interface SuspenseProps {
  /** 默认内容（异步加载完成后显示） */
  default?: SlotFunction;
  /** 加载中显示的 fallback 内容 */
  fallback?: SlotFunction;
  /** 超时时间（毫秒） */
  timeout?: number;
}
```

#### SuspenseAsyncState

```ts
interface SuspenseAsyncState {
  /** 是否处于 pending 状态 */
  isPending: boolean;
  /** 错误信息 */
  error: unknown;
  /** 异步内容 */
  content: unknown;
}
```

#### 示例

```ts
import { Suspense, h } from '@lytjs/component';

h(
  Suspense,
  {
    fallback: () => h('div', {}, 'Loading...'),
  },
  {
    default: () => h(AsyncComponent),
  },
);
```

#### Suspense 内部 API

| 函数                                     | 说明                      |
| ---------------------------------------- | ------------------------- |
| `createSuspenseInstance()`               | 创建 Suspense 实例        |
| `createSuspenseBoundary()`               | 创建 Suspense 边界        |
| `registerAsyncChild(boundary, instance)` | 注册异步子组件            |
| `isSuspensePending(boundary)`            | 检查是否处于 pending 状态 |
| `getSuspenseError(boundary)`             | 获取错误信息              |
| `resolveSuspense(boundary)`              | 解析 Suspense             |
| `abortSuspense(boundary)`                | 中止 Suspense             |

---

### Transition

过渡动画组件，用于在元素或组件进入/离开时应用 CSS 过渡效果。

#### TransitionComponentProps

```ts
interface TransitionComponentProps {
  /** 过渡的 CSS 类名前缀，默认 'v' */
  name?: string;
  /** 是否在初始渲染时应用过渡，默认 false */
  appear?: boolean;
  /** CSS 过渡模式：'out-in' 或 'in-out' */
  mode?: 'out-in' | 'in-out';
  /** 进入过渡持续时间（毫秒） */
  duration?: number | { enter: number; leave: number };
  /** 是否跳过 CSS 检测 */
  css?: boolean;
  /** 是否使用 JavaScript 钩子 */
  type?: 'transition' | 'animation';
  /** 进入前钩子 */
  onBeforeEnter?: (el: Element) => void;
  /** 进入时钩子 */
  onEnter?: (el: Element, done: () => void) => void;
  /** 进入后钩子 */
  onAfterEnter?: (el: Element) => void;
  /** 进入取消钩子 */
  onEnterCancelled?: (el: Element) => void;
  /** 离开前钩子 */
  onBeforeLeave?: (el: Element) => void;
  /** 离开时钩子 */
  onLeave?: (el: Element, done: () => void) => void;
  /** 离开后钩子 */
  onAfterLeave?: (el: Element) => void;
  /** 离开取消钩子 */
  onLeaveCancelled?: (el: Element) => void;
}
```

#### 示例

```ts
import { Transition, h } from '@lytjs/component';

h(Transition, { name: 'fade', mode: 'out-in' }, () => h(show ? ComponentA : ComponentB));
```

```css
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

---

### TransitionGroup

列表过渡组件，用于在 `v-for` 列表项的添加/移除/移动时应用过渡效果。

#### TransitionGroupComponentProps

```ts
interface TransitionGroupComponentProps extends TransitionComponentProps {
  /** 是否在移动时应用过渡，默认 false */
  moveClass?: string;
  /** 标签名，默认不渲染包裹元素 */
  tag?: string;
}
```

#### 示例

```ts
import { TransitionGroup, h } from '@lytjs/component';

h(TransitionGroup, { name: 'list', tag: 'ul' }, () =>
  items.value.map((item) => h('li', { key: item.id }, item.text)),
);
```

---

### Teleport

传送门组件，将组件内容渲染到 DOM 中的其他位置。

#### TeleportProps

```ts
interface TeleportProps {
  /** 目标容器（CSS 选择器或 DOM 元素） */
  to: string | Element;
  /** 是否禁用传送，默认 false */
  disabled?: boolean;
}
```

#### 示例

```ts
import { Teleport, h } from '@lytjs/component';

h(Teleport, { to: 'body' }, () => h(ModalComponent));
```

---

### ErrorBoundary

错误边界组件，捕获子组件树中的渲染错误并显示 fallback 内容。

#### ErrorBoundaryProps

```ts
interface ErrorBoundaryProps {
  /** 默认内容（正常渲染时显示） */
  default?: SlotFunction;
  /** 错误时显示的 fallback 内容 */
  fallback?: SlotFunction | ((error: Error) => VNode);
  /** 捕获到错误时的回调 */
  onError?: (error: Error, instance: ComponentPublicInstance | null, info: string) => void;
}
```

#### 示例

```ts
import { ErrorBoundary, h } from '@lytjs/component';

h(
  ErrorBoundary,
  {
    fallback: () => h('div', {}, 'Something went wrong'),
    onError(error) {
      console.error('Caught:', error);
    },
  },
  {
    default: () => h(PotentiallyBuggyComponent),
  },
);
```

---

## Signal State 适配器

### createSignalState()

将 Signal 适配为组件可使用的状态对象。

### 签名

```ts
function createSignalState<T extends Record<string, unknown>>(
  signals: Record<keyof T, WritableSignal<T[keyof T]>>,
): Record<string, Signal<T[keyof T]>>;
```

### createComputedState()

将计算信号适配为组件可使用的状态对象。

### 签名

```ts
function createComputedState<T extends Record<string, unknown>>(
  signals: Record<keyof T, ComputedSignal<T[keyof T]>>,
): Record<string, Signal<T[keyof T]>>;
```

---

## 类型导出

| 类型                        | 说明                            |
| --------------------------- | ------------------------------- |
| `ComponentOptions`          | 组件选项接口                    |
| `ComponentInternalInstance` | 组件内部实例                    |
| `ComponentPublicInstance`   | 组件公共实例（模板中的 `this`） |
| `ComponentIdentity`         | 组件身份标识                    |
| `ComponentLifecycleState`   | 组件生命周期状态                |
| `ComponentRenderState`      | 组件渲染状态                    |
| `ComponentContextState`     | 组件上下文状态                  |
| `ComponentParentState`      | 组件层级关系                    |
| `SetupContext`              | setup 函数的上下文              |
| `InternalSlots`             | 内部插槽类型                    |
| `AppContext`                | 应用上下文                      |
| `PropOptions`               | Prop 选项                       |
| `RenderFunction`            | 渲染函数类型                    |
| `SlotFunction`              | 插槽函数类型                    |
