# @lytjs/shared-types API 参考

`@lytjs/shared-types` 是 LytJS 的**共享类型定义包**，在整个框架中统一使用。这些类型在其他包中重复导出，但 `shared-types` 作为唯一真实来源（Single Source of Truth），确保类型定义的一致性。

---

## 概述

```
@lytjs/shared-types
     │
     ├── ref.ts          → RefLike
     ├── app-context.ts  → BaseAppConfig, BaseAppContext, Plugin
     ├── vnode.ts        → Props
     ├── debug.ts        → ReactiveEffectRef, DebuggerEvent
     ├── renderer.ts     → Renderer, Directive, DirectiveBinding
     └── component.ts    → SlotFunction, InternalSlots, ComponentPublicInstance
```

所有 LytJS 包都应从 `@lytjs/shared-types` 导入类型定义，而非自行定义。

---

## ref.ts

### RefLike

响应式引用的基础接口。

```ts
export interface RefLike<T = unknown> {
  value: T;
}
```

---

## app-context.ts

### BaseAppConfig

应用基础配置。

```ts
export interface BaseAppConfig {
  /** 全局错误处理器 */
  errorHandler?: (err: Error, instance: unknown, info: string) => void;
  /** 全局警告处理器 */
  warnHandler?: (msg: string, instance: unknown, trace: string) => void;
  /** 性能追踪器 */
  performanceTracer?: (startTag: string, endTag: string) => void;
  /** 是否为原生标签 */
  isNativeTag?: (tag: string) => boolean;
  /** 扩展配置项 */
  [key: string]: unknown;
}
```

---

### BaseAppContext

应用上下文（应用实例内部使用）。

```ts
export interface BaseAppContext<Config = BaseAppConfig> {
  /** 应用配置 */
  config: Config;
  /** 全局混入 */
  mixins?: unknown[];
  /** 已注册组件 */
  components?: Record<string, unknown>;
  /** 已注册指令 */
  directives?: Record<string, unknown>;
  /** provide 存储 */
  provides?: Record<string | symbol, unknown>;
  /** 版本号 */
  version?: string;
}
```

---

### Plugin

插件接口。

```ts
export interface Plugin<T = Record<string, unknown>, App = unknown> {
  /** 插件安装函数 */
  install: (app: App, options?: T) => void;
  /** 插件名称 */
  name?: string;
}
```

---

## vnode.ts

### Props

组件 Props 类型。

```ts
export interface Props {
  /** Props 键值对 */
  [key: string]: unknown;
}
```

---

## debug.ts

### ReactiveEffectRef

用于调试的 Effect 引用。

```ts
export interface ReactiveEffectRef {
  /** Effect ID */
  id: number;
  /** 是否启用 */
  enabled: boolean;
  /** 是否为 computed effect */
  computed?: boolean;
  /** 回调 */
  onTrigger?: (event: DebuggerEvent) => void;
  onTrack?: (event: DebuggerEvent) => void;
}
```

---

### DebuggerEvent

调试器事件。

```ts
export interface DebuggerEvent {
  /** 事件类型 */
  type: 'get' | 'set' | 'add' | 'delete' | 'clear' | 'iterate';
  /** 目标对象 */
  target: object;
  /** 属性名 */
  key: string | symbol | undefined;
  /** 旧值 */
  oldValue: unknown;
  /** 新值 */
  newValue: unknown;
}
```

---

## renderer.ts

### Renderer

渲染器接口。

```ts
export interface Renderer<HN = unknown, HE extends HN = HN> {
  /** 挂载 */
  mount(vnode: VNode, container: HE): void;
  /** 卸载 */
  unmount(vnode: VNode): void;
  /** 渲染/更新 */
  render?(vnode: VNode | null, container: HE): void;
  /** 移动 */
  move?(vnode: VNode, container: HE, anchor?: HN): void;
}
```

---

### Directive

指令定义。

```ts
export type Directive = (
  el: HostElement,
  binding: DirectiveBinding,
  vnode: VNode,
  oldVnode: VNode | null,
) => void;
```

---

### DirectiveBinding

指令绑定信息。

```ts
export interface DirectiveBinding {
  /** 指令参数（`:` 后的部分） */
  arg?: string;
  /** 指令修饰符 */
  modifiers?: Record<string, boolean>;
  /** 指令表达式值 */
  value: unknown;
  /** 旧值 */
  oldValue?: unknown;
}
```

---

### DirectiveArguments

指令参数（`v-xxx:arg.mod1.mod2="expression"`）。

```ts
export type DirectiveArguments = [
  name: string,
  arg?: string,
  modifiers?: Record<string, true>,
  value?: unknown,
];
```

---

## component.ts

### SlotFunction

插槽函数。

```ts
export type SlotFunction = (props?: unknown) => VNode | VNode[] | null;
```

---

### InternalSlots

内部插槽映射。

```ts
export interface InternalSlots {
  [name: string]: SlotFunction | undefined;
}
```

---

### ComponentPublicInstance

组件公开实例（用户可访问的 `this`）。

```ts
export interface ComponentPublicInstance {
  /** 组件根元素 */
  $el: HostElement | null;
  /** 组件根 VNode */
  $vnode: VNode | null;
  /** 组件根元素子节点 */
  $root: ComponentPublicInstance;
  /** 父组件实例 */
  $parent: ComponentPublicInstance | null;
  /** 子组件实例数组 */
  $children: ComponentPublicInstance[];
  /** props */
  $props: Props;
  /** 插槽 */
  $slots: InternalSlots;
  /** 非继承 attrs */
  $attrs: Props;
  /** emit */
  $emit: (event: string, ...args: unknown[]) => void;
  /** 强制更新 */
  $forceUpdate(): void;
  /** 下一更新周期执行 */
  $nextTick(fn: () => void): Promise<void>;
  /** 卸载 */
  $destroy(): void;
  /** 访问 ref */
  $refs: Record<string, unknown>;
  /** 是否已挂载 */
  $isMounted: boolean;
  /** 是否已卸载 */
  $isUnmounted: boolean;
  /** 是否正在更新 */
  $isUpdating: boolean;
  /** 数据代理 */
  [key: string]: unknown;
}
```

---

### ComponentInternalInstance

组件内部实例（框架内部使用）。

```ts
export interface ComponentInternalInstance {
  /** 唯一 ID */
  uid: number;
  /** 组件类型 */
  type: ComponentTypes;
  /** 父实例 */
  parent: ComponentInternalInstance | null;
  /** 根实例 */
  root: ComponentInternalInstance;
  /** 公开实例代理 */
  proxy: ComponentPublicInstance | null;
  /** 内部上下文 */
  context: Record<string, unknown>;
  /** 应用上下文 */
  appContext: BaseAppContext;
  /** 响应式状态 */
  state: Record<string, unknown>;
  /** 组件 props */
  props: Props;
  /** 组件 emits */
  emitsOptions?: Record<string, Function | null>;
  /** 组件 slots */
  slots: InternalSlots;
  /** 非继承 attrs */
  attrs: Props;
  /** setup 返回结果 */
  setupState: unknown;
  /** setup 上下文 */
  setupContext?: Record<string, unknown>;
  /** 是否已挂载 */
  isMounted: boolean;
  /** 是否正在卸载 */
  isUnmounted: boolean;
  /** 是否为 KeepAlive 激活状态 */
  isAlive: boolean;
  /** 生命周期钩子 */
  bm: Function[] | null; // beforeMount
  m: Function[] | null; // mounted
  bu: Function[] | null; // beforeUpdate
  u: Function[] | null; // updated
  um: Function[] | null; // unmounted
  bum: Function[] | null; // beforeUnmount
  /** KeepAlive 缓存 */
  keepAliveCtx?: {
    keepAliveId: symbol;
    shapeFlag: number;
    cache: Map<string, ComponentInternalInstance>;
    keys: Map<string, string | number>;
  };
}
```

---

### ComponentOptionsBase

组件选项式 API 定义（用于 `defineComponent` 的选项参数）。

```ts
export interface ComponentOptionsBase<
  Props = Props,
  RawBindings = unknown,
  D = unknown,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions,
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
> {
  /** 组件名称 */
  name?: string;
  /** 组件 props 定义 */
  props?: PropsOptions<Props>;
  /** 组件 emits */
  emits?: EmitsOptions;
  /** 组件混入 */
  mixins?: Mixin[];
  /** 组件扩展 */
  extends?: Extends;
  /** data */
  data?: (this: Props & RawBindings & D) => D;
  /** computed */
  computed?: C;
  /** methods */
  methods?: M;
  /** beforeCreate */
  beforeCreate?: Function;
  /** created */
  created?: Function;
  /** beforeMount */
  beforeMount?: Function;
  /** mounted */
  mounted?: Function;
  /** beforeUpdate */
  beforeUpdate?: Function;
  /** updated */
  updated?: Function;
  /** beforeUnmount */
  beforeUnmount?: Function;
  /** unmounted */
  unmounted?: Function;
  /** render */
  render?: (this: ComponentPublicInstance, h: CreateElement) => VNode;
  /** setup */
  setup?: (
    this: ComponentPublicInstance,
    props: Props,
    ctx: SetupContext,
  ) => RawBindings | (() => VNode) | null;
}
```

---

## 使用方式

### 导入类型

```ts
// 推荐：从 shared-types 导入
import type {
  RefLike,
  Plugin,
  ComponentPublicInstance,
  ComponentInternalInstance,
  Directive,
  DirectiveBinding,
  Props,
  Renderer,
} from '@lytjs/shared-types';

// 不推荐：在各包中重复定义
```

### 类型扩展

```ts
import type { ComponentPublicInstance } from '@lytjs/shared-types';

// 扩展组件实例类型
declare module '@lytjs/shared-types' {
  interface ComponentPublicInstance {
    $myPlugin?: MyPlugin;
    $store?: Store;
  }
}
```

---

## 约束

**禁止在其他包中定义与 shared-types 冲突的类型**。如果需要某个类型，应该：

1. 在 `@lytjs/shared-types` 中定义
2. 其他包从 `@lytjs/shared-types` 重新导出

这确保了整个框架的类型一致性。
