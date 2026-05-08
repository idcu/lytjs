# @lytjs/core API 参考

`@lytjs/core` 是 LytJS 框架的核心包，提供了应用创建、组件定义、生命周期钩子、组合式 API 以及 Web Component 支持等核心功能。同时 re-export 了 `@lytjs/reactivity`、`@lytjs/vdom` 和 `@lytjs/compiler` 的常用 API。

::: tip 渲染模式
`@lytjs/core` 使用 VNode 渲染模式。如需使用 Signal 渲染模式，请使用 `@lytjs/core-signal` 包。详见 [渲染模式](../guide/rendering-modes)。
:::

## createApp()

创建一个应用实例，返回 `App` 对象。

### 签名

```ts
function createApp(
  rootComponent: Component,
  rootProps?: Record<string, unknown> | null,
  options?: AppOptions,
): App;
```

### 参数

| 参数            | 类型                              | 说明                                 |
| --------------- | --------------------------------- | ------------------------------------ |
| `rootComponent` | `Component`                       | 根组件，可以是组件选项对象或函数组件 |
| `rootProps`     | `Record<string, unknown> \| null` | 传递给根组件的 props，默认 `null`    |
| `options`       | `AppOptions`                      | 应用配置选项                         |

### AppOptions

```ts
interface AppOptions {
  /** 渲染模式：'vnode'（默认）使用虚拟 DOM diff，'signal' 使用细粒度 DOM 更新，'vapor' 是 'signal' 的别名 */
  rendererMode?: 'vnode' | 'signal' | 'vapor';
}
```

### App 实例方法

| 方法        | 签名                                                            | 说明                   |
| ----------- | --------------------------------------------------------------- | ---------------------- |
| `mount`     | `(rootContainer: string \| Element) => ComponentPublicInstance` | 挂载应用到 DOM         |
| `unmount`   | `() => void`                                                    | 卸载应用，清理所有资源 |
| `use`       | `(plugin: Plugin, ...options: unknown[]) => App`                | 安装插件               |
| `provide`   | `<T>(key: string \| symbol, value: T) => App`                   | 全局 provide           |
| `inject`    | `<T>(key: string \| symbol) => T \| undefined`                  | 全局 inject            |
| `component` | `(name: string, component: Component) => App`                   | 全局注册组件           |
| `directive` | `(name: string, directive: Directive) => App`                   | 全局注册指令           |
| `mixin`     | `(mixin: ComponentOptions) => App`                              | 全局混入               |

### 示例

```ts
import { createApp } from '@lytjs/core';

const app = createApp({
  render() {
    return h('div', {}, 'Hello LytJS');
  },
});

app.mount('#app');
```

使用 Signal 模式：

```ts
const app = createApp(
  {
    template: '<div>{{ message }}</div>',
    data() {
      return { message: 'Hello Signal Mode' };
    },
  },
  null,
  { rendererMode: 'signal' },
);

app.mount('#app');
```

---

## h() / createElement()

创建 VNode 的辅助函数。`createElement` 是 `h` 的别名。

### 签名

```ts
function h(
  type: string | Component | typeof Fragment | typeof Text | typeof Comment,
  props?: Record<string, unknown> | null,
  ...children: VNodeChildren[]
): VNode;
```

### 参数

| 参数       | 类型                                                                      | 说明                        |
| ---------- | ------------------------------------------------------------------------- | --------------------------- |
| `type`     | `string \| Component \| typeof Fragment \| typeof Text \| typeof Comment` | HTML 标签名、组件或特殊类型 |
| `props`    | `Record<string, unknown> \| null`                                         | 属性和事件                  |
| `children` | `VNodeChildren[]`                                                         | 子节点（可变参数）          |

### 示例

```ts
import { h, Fragment } from '@lytjs/core';

// 创建元素
h('div', { class: 'container' }, [h('h1', {}, '标题'), h('p', {}, '内容')]);

// 使用 Fragment
h(Fragment, null, [h('li', {}, 'A'), h('li', {}, 'B')]);
```

---

## defineComponent()

定义一个组件。返回传入的 `ComponentOptions` 对象本身（类型标注辅助）。

### 签名

```ts
function defineComponent(options: ComponentOptions): ComponentOptions;
```

### 示例

```ts
import { defineComponent, ref } from '@lytjs/core';

const MyComponent = defineComponent({
  name: 'MyComponent',
  props: {
    title: { type: String, required: true },
  },
  setup(props) {
    const count = ref(0);
    return { count };
  },
  render() {
    return h('div', {}, `${this.title}: ${this.count}`);
  },
});
```

---

## defineAsyncComponent()

定义一个异步组件，支持加载状态、错误处理和超时重试。

### 签名

```ts
function defineAsyncComponent(source: AsyncComponentLoader | AsyncComponentOptions): Component;
```

### 参数

| 参数     | 类型                                            | 说明                     |
| -------- | ----------------------------------------------- | ------------------------ |
| `source` | `AsyncComponentLoader \| AsyncComponentOptions` | 异步加载器函数或配置对象 |

### AsyncComponentOptions

```ts
interface AsyncComponentOptions {
  /** 异步加载函数，返回 Promise<Component> */
  loader: AsyncComponentLoader;
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

### 示例

```ts
const AsyncComp = defineAsyncComponent({
  loader: () => import('./MyComponent.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,
  timeout: 3000,
  onError(error, retry, fail, attempts) {
    if (attempts <= 3) retry();
    else fail();
  },
});
```

---

## nextTick()

在下一个 DOM 更新周期之后执行回调。

### 签名

```ts
function nextTick(fn?: () => void): Promise<void>;
```

### 示例

```ts
import { nextTick, ref } from '@lytjs/core';

const count = ref(0);
count.value++;
await nextTick();
// DOM 已更新
```

---

## resolveComponent()

从当前组件实例或全局注册中解析组件。

### 签名

```ts
function resolveComponent(name: string): Component | undefined;
```

### 示例

```ts
import { resolveComponent, h } from '@lytjs/core';

// 在渲染函数中使用
const MyButton = resolveComponent('MyButton');
if (MyButton) {
  return h(MyButton, { label: 'Click' });
}
```

---

## resolveDirective()

从当前组件实例或全局注册中解析指令。

### 签名

```ts
function resolveDirective(name: string): Directive | undefined;
```

---

## withDirectives()

将指令应用到 VNode 上。

### 签名

```ts
function withDirectives(vnode: VNode, directives: DirectiveArguments): VNode;
```

### DirectiveArguments 格式

```ts
type DirectiveArguments = Array<
  [Directive, unknown, string | undefined, Record<string, boolean> | undefined]
>;
```

### 示例

```ts
import { withDirectives, resolveDirective, h, ref } from '@lytjs/core';

const focus = resolveDirective('focus');
const visible = ref(true);

withDirectives(h('input', { type: 'text' }), [[focus, visible]]);
```

---

## withMemo()

带缓存的渲染辅助函数，用于优化渲染性能。

### 签名

```ts
function withMemo(memo: unknown[], render: () => VNode, cache: MemoEntry[], index: number): VNode;
```

### 示例

```ts
const _cache: MemoEntry[] = [];
const vnode = withMemo([dep1, dep2], () => h('div', {}, expensiveContent), _cache, 0);
```

---

## useSlots()

获取当前组件的 slots 对象。必须在 `setup()` 中调用。

### 签名

```ts
function useSlots(): InternalSlots;
```

### 示例

```ts
import { useSlots, h } from '@lytjs/core'

setup() {
  const slots = useSlots()
  return () => h('div', {}, slots.default ? slots.default() : 'No content')
}
```

---

## useAttrs()

获取当前组件的 fallthrough attributes。必须在 `setup()` 中调用。

### 签名

```ts
function useAttrs(): Record<string, unknown>;
```

### 示例

```ts
setup() {
  const attrs = useAttrs()
  console.log(attrs.class, attrs.style)
}
```

---

## useModel()

双向绑定的组合式 API 版本，用于替代 `v-model`。

### 签名

```ts
function useModel<T>(props: Record<string, T | undefined>, key: string): WritableComputedRef<T>;
```

### 示例

```ts
import { useModel } from '@lytjs/core';

const MyInput = defineComponent({
  props: { modelValue: String },
  setup(props) {
    const model = useModel(props, 'modelValue');
    return { model };
  },
  template: '<input v-model="model" />',
});
```

---

## defineCustomElement()

将 LytJS 组件包装为 Web Component（Custom Element）。

### 签名

```ts
function defineCustomElement(
  componentOptions: ComponentOptions,
  options?: DefineCustomElementOptions,
): CustomElementConstructor;
```

### DefineCustomElementOptions

```ts
interface DefineCustomElementOptions {
  /** 是否使用 Shadow DOM，默认 true */
  shadowRoot?: boolean;
  /** Custom Element 标签名，默认使用组件 name 转换为 kebab-case */
  name?: string;
  /** 注入到 Shadow DOM 的 CSS 样式 */
  css?: string;
}
```

### 示例

```ts
import { defineCustomElement } from '@lytjs/core';

const MyElement = defineCustomElement(
  {
    name: 'MyElement',
    props: { count: { type: Number, default: 0 } },
    setup(props) {
      return { count: props.count };
    },
    template: '<span>Count: {{ count }}</span>',
  },
  {
    shadowRoot: true,
    css: ':host { display: block; padding: 8px; }',
  },
);
```

---

## useShadowRoot()

在 `setup()` 中获取当前 Custom Element 的 Shadow Root。

### 签名

```ts
function useShadowRoot(): ShadowRoot | null;
```

---

## useHost()

在 `setup()` 中获取当前 Custom Element 的宿主元素。

### 签名

```ts
function useHost(): HTMLElement | null;
```

---

## useWebComponentSlots()

注册 slot 变化回调，当 Light DOM slot 内容发生变化时触发。

### 签名

```ts
function useWebComponentSlots(onChange: () => void): void;
```

---

## injectChildStyles()

向 Shadow DOM 注入子组件样式。

### 签名

```ts
function injectChildStyles(styles: string): void;
```

---

## 生命周期钩子

以下生命周期钩子必须在 `setup()` 中同步调用。

### onMounted()

组件挂载完成后调用。

```ts
function onMounted(hook: () => void): void;
```

### onUpdated()

组件更新完成后调用。

```ts
function onUpdated(hook: () => void): void;
```

### onUnmounted()

组件卸载完成后调用。

```ts
function onUnmounted(hook: () => void): void;
```

### onBeforeMount()

组件挂载前调用。

```ts
function onBeforeMount(hook: () => void): void;
```

### onBeforeUpdate()

组件更新前调用。

```ts
function onBeforeUpdate(hook: () => void): void;
```

### onBeforeUnmount()

组件卸载前调用。

```ts
function onBeforeUnmount(hook: () => void): void;
```

### onErrorCaptured()

捕获后代组件的错误。

```ts
function onErrorCaptured(
  hook: (err: Error, instance: ComponentPublicInstance | null, info: string) => boolean | void,
): void;
```

### onRenderTracked()

响应式依赖被追踪时调用（仅开发模式）。

```ts
function onRenderTracked(hook: (e: DebuggerEvent) => void): void;
```

### onRenderTriggered()

响应式依赖触发重新渲染时调用（仅开发模式）。

```ts
function onRenderTriggered(hook: (e: DebuggerEvent) => void): void;
```

### 生命周期示例

```ts
import { onMounted, onUnmounted, ref } from '@lytjs/core'

setup() {
  const count = ref(0)

  onMounted(() => {
    console.log('组件已挂载')
  })

  onUnmounted(() => {
    console.log('组件已卸载')
  })

  return { count }
}
```

---

## Re-export 的 Reactivity API

`@lytjs/core` 重新导出了以下 `@lytjs/reactivity` 的常用 API：

### 响应式原语

- `ref` / `reactive` / `computed` / `readonly`
- `shallowRef` / `shallowReactive` / `shallowReadonly`

### 侦听器

- `watch` / `watchEffect` / `watchPostEffect` / `watchSyncEffect`

### 副作用

- `effect` / `stop`

### 工具函数

- `unref` / `toRef` / `toRefs` / `isRef` / `isProxy` / `isReactive` / `isReadonly`
- `isShallowRef` / `isComputedRef` / `isSignal`
- `toRaw` / `markRaw`

### 批处理

- `batch` / `batchAsync` / `untrack`

### Effect Scope

- `effectScope` / `getCurrentScope` / `onScopeDispose`

详细文档请参阅 [reactivity.md](./reactivity.md)。

---

## Re-export 的 VDOM API

`@lytjs/core` 重新导出了以下 `@lytjs/vdom` 的常用 API：

### VNode 创建

- `createVNode` / `cloneVNode` / `mergeProps`

### 内置组件

- `Fragment` / `Text` / `Comment`

详细文档请参阅 [vdom.md](./vdom.md)（如需完整 VDOM API 文档）。

---

## Re-export 的 Compiler API

- `compile` - 编译模板字符串为渲染函数代码

详细文档请参阅 [compiler.md](./compiler.md)。

---

## 与 Signal 模式的差异

`@lytjs/core`（VNode 模式）与 `@lytjs/core-signal`（Signal 模式）的主要差异：

| 特性                        | @lytjs/core   | @lytjs/core-signal |
| --------------------------- | ------------- | ------------------ |
| 渲染机制                    | 虚拟 DOM diff | 细粒度响应式绑定   |
| `h()` 函数                  | 支持          | 不支持             |
| `signal()`                  | 不支持        | 支持               |
| `computedSignal()`          | 不支持        | 支持               |
| `ref()` / `reactive()`      | 支持          | 支持               |
| `watch()` / `watchEffect()` | 支持          | 支持               |
| 生命周期钩子                | 支持          | 支持               |

详见 [渲染模式](../guide/rendering-modes) 和 [独立构建变体](./core-variants)。

---

## 配置系统

### ConfigManager

全局配置管理器，提供配置的读取、写入、监听和预设功能。

```ts
class ConfigManager {
  /** 获取配置值 */
  get<T = unknown>(path: string, defaultValue?: T): T | undefined;

  /** 设置配置值 */
  set<T = unknown>(path: string, value: T): boolean;

  /** 批量设置配置 */
  setMultiple(config: Record<string, unknown>, merge?: boolean): void;

  /** 检查配置是否存在 */
  has(path: string): boolean;

  /** 删除配置 */
  delete(path: string): boolean;

  /** 深度合并配置 */
  merge(config: Record<string, unknown>, deep?: boolean): void;

  /** 获取全部配置 */
  getAll(): Record<string, unknown>;

  /** 重置配置 */
  reset(newConfig?: Record<string, unknown>): void;

  /** 清空配置 */
  clear(): void;

  /** 监听配置变化 */
  watch<T = unknown>(path: string, callback: ConfigChangeCallback<T>): () => void;

  /** 设置是否可变 */
  setMutable(mutable: boolean): void;

  /** 检查是否可变 */
  isMutable(): boolean;
}
```

### getGlobalConfig()

获取全局配置管理器实例。

```ts
function getGlobalConfig(): ConfigManager;
```

### setGlobalConfig()

设置全局配置管理器实例。

```ts
function setGlobalConfig(config: ConfigManager): void;
```

### getConfig() / setConfig() / watchConfig()

便捷的配置访问方法。

```ts
function getConfig<T = unknown>(path: string, defaultValue?: T): T | undefined;
function setConfig<T = unknown>(path: string, value: T): boolean;
function watchConfig<T = unknown>(path: string, callback: ConfigChangeCallback<T>): () => void;
```

### configPresets

内置配置预设。

```ts
const configPresets: {
  /** 开发环境预设 */
  development: Record<string, unknown>;
  /** 生产环境预设 */
  production: Record<string, unknown>;
};
```

### applyConfigPreset()

应用配置预设。

```ts
function applyConfigPreset(preset: Record<string, unknown>): void;
```

---

## 集成工具

### registerIntegrations()

注册全局集成（HTTP 客户端、缓存、安全工具等）。

```ts
function registerIntegrations(integrations: Record<string, unknown>): void;
```

### getHttpClient()

获取全局 HTTP 客户端实例。

```ts
function getHttpClient(): HttpClient;
```

### getQueryUtils()

获取全局查询工具。

```ts
function getQueryUtils(): QueryUtils;
```

### getSecurityUtils()

获取全局安全工具。

```ts
function getSecurityUtils(): SecurityUtils;
```

### getCacheUtils()

获取全局缓存工具。

```ts
function getCacheUtils(): CacheUtils;
```

### safeEscapeHtml()

安全 HTML 转义。

```ts
function safeEscapeHtml(str: string): string;
```

### safeParseQueryString()

安全解析查询字符串。

```ts
function safeParseQueryString(query: string): Record<string, string>;
```

---

## 其他 Composition API

### useTemplateRef()

获取模板中定义了 `ref` 属性的元素。

```ts
function useTemplateRef<T = Element>(key: string): Ref<T | null>;
```

**示例：**

```ts
import { useTemplateRef } from '@lytjs/core'

setup() {
  const inputRef = useTemplateRef<HTMLInputElement>('my-input')

  onMounted(() => {
    inputRef.value?.focus()
  })

  return { inputRef }
}
```

```html
<template>
  <input ref="my-input" />
</template>
```

---

### defineModel()

定义双向绑定的模型（Composition API 风格的 v-model）。

```ts
function defineModel<T>(options?: ModelOptions<T>): ModelReturn<T>;
```

**示例：**

```ts
import { defineModel } from '@lytjs/core'

props: {
  modelValue: Number
},
setup(props) {
  const model = defineModel({ type: Number })

  // 修改 model.value 会触发 update:modelValue
  model.value = 123
}
```

---

### useId()

生成唯一的组件 ID。

```ts
function useId(): string;
```

---

### useCssModule()

获取当前组件的 CSS Module。

```ts
function useCssModule(): Record<string, string>;
```

---

### useCssVars()

设置 CSS 变量（自动响应式更新）。

```ts
function useCssVars(callback: (vars: Record<string, Ref<string>>) => Record<string, string>): void;
```

---

### onActivated() / onDeactivated()

KeepAlive 激活/停用钩子。

```ts
function onActivated(callback: () => void): void;
function onDeactivated(callback: () => void): void;
```

---

### resolveDynamicComponent()

解析动态组件。

```ts
function resolveDynamicComponent(component: string | Component): Component;
```

---

## App 实例属性

### App.config

应用配置对象。

```ts
interface AppConfig extends BaseAppConfig {
  performance: boolean;
  globalProperties: Record<string, unknown>;
  isCustomElement?: (tag: string) => boolean;
  compilerOptions?: Record<string, unknown>;
}
```

### App.globalProperties

全局属性，会被混入每个组件实例。

```ts
app.config.globalProperties.$myPlugin = myPlugin;
// 在组件中: this.$myPlugin
```

### App.errorHandler

全局错误处理器。

```ts
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err);
  console.error('Component:', instance);
  console.error('Info:', info);
};
```

### App.warnHandler

全局警告处理器。

```ts
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Warning:', msg);
};
```

---

## 扩展阅读

- [响应式系统](../guide/reactivity) - 深入理解响应式原理
- [组合式 API](../guide/composition-api) - setup 和 Composition API 最佳实践
- [组件](../guide/component) - 组件定义和使用
- [渲染模式](../guide/rendering-modes) - VNode 与 Signal 模式对比
