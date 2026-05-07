# @lytjs/shared-types

> 跨包共享类型定义，提供 RefLike、AppContext、VNode、Renderer、Component 等公共类型

## 安装

```bash
npm install @lytjs/shared-types
```

## 概述

`@lytjs/shared-types` 提取了多个子包之间共享的类型定义，避免循环依赖。所有类型均为纯类型导出（`export type`），不包含运行时代码。

## 类型定义

### RefLike

泛型 RefLike 接口，用于类型保护，避免从 `@lytjs/reactivity` 导入产生循环依赖

```typescript
import type { RefLike } from '@lytjs/shared-types';

interface RefLike<T = unknown> {
  readonly __v_isRef: true;
  value: T;
}

// 使用示例
function isRefLike<T>(val: unknown): val is RefLike<T> {
  return typeof val === 'object' && val !== null && '__v_isRef' in val;
}
```

### BaseAppConfig / BaseAppContext / Plugin

应用配置、上下文和插件的基础类型

```typescript
import type { BaseAppConfig, BaseAppContext, Plugin } from '@lytjs/shared-types';

// 基础应用配置
interface BaseAppConfig {
  errorHandler?: (err: Error, instance: unknown, info: string) => void;
  warnHandler?: (msg: string, instance: unknown, trace: string) => void;
  performanceTracer?: (startTag: string, endTag: string) => void;
  isNativeTag?: (tag: string) => boolean;
  [key: string]: unknown;
}

// 基础应用上下文
interface BaseAppContext<Config = BaseAppConfig> {
  config: Config;
  mixins?: unknown[];
  components?: Record<string, unknown>;
  directives?: Record<string, unknown>;
  provides?: Record<string | symbol, unknown>;
  version?: string;
}

// 应用插件
interface Plugin<T = Record<string, unknown>, App = unknown> {
  install: (app: App, options?: T) => void;
  name?: string;
}
```

### Props

VNode 属性类型

```typescript
import type { Props } from '@lytjs/shared-types';

type Props = Record<string, unknown>;
```

### ReactiveEffectRef / DebuggerEvent

响应式调试相关类型

```typescript
import type { ReactiveEffectRef, DebuggerEvent } from '@lytjs/shared-types';

// ReactiveEffect 的脱敏引用
interface ReactiveEffectRef {
  id: number;
  active: boolean;
}

// 调试事件（用于 onRenderTracked / onRenderTriggered）
interface DebuggerEvent {
  effect: ReactiveEffectRef;
  target: object;
  type: 'track' | 'trigger';
  key: string | symbol | undefined;
  newValue?: unknown;  // 仅 trigger 类型
  oldValue?: unknown;  // 仅 trigger 类型
}
```

### Renderer / Directive / DirectiveBinding

渲染器和指令相关类型

```typescript
import type { Renderer, Directive, DirectiveBinding, DirectiveArguments } from '@lytjs/shared-types';

// 渲染器接口
interface Renderer<VNode = unknown> {
  mount(vnode: VNode | null, container: Element): void;
  unmount(vnode: VNode | null): void;
  patch(oldVNode: VNode | null, newVNode: VNode | null, container: Element): void;
  move(vnode: VNode, container: Element, anchor: Element | null): void;
}

// 指令钩子接口
interface Directive<T = Element, VNode = unknown> {
  created?(el: T, binding: DirectiveBinding<VNode>, vnode: VNode, prevVNode: VNode | null): void;
  beforeMount?(el: T, binding: DirectiveBinding<VNode>, vnode: VNode, prevVNode: VNode | null): void;
  mounted?(el: T, binding: DirectiveBinding<VNode>, vnode: VNode, prevVNode: VNode | null): void;
  beforeUpdate?(el: T, binding: DirectiveBinding<VNode>, vnode: VNode, prevVNode: VNode | null): void;
  updated?(el: T, binding: DirectiveBinding<VNode>, vnode: VNode, prevVNode: VNode | null): void;
  beforeUnmount?(el: T, binding: DirectiveBinding<VNode>, vnode: VNode, prevVNode: VNode | null): void;
  unmounted?(el: T, binding: DirectiveBinding<VNode>, vnode: VNode, prevVNode: VNode | null): void;
}

// 指令绑定信息
interface DirectiveBinding<VNode = unknown> {
  instance: ComponentPublicInstance | null;
  value: unknown;
  oldValue: unknown;
  arg?: string;
  modifiers: Record<string, boolean>;
  dir: Directive<Element, VNode>;
}

// 指令参数数组
type DirectiveArguments = [Directive, unknown, string?, Record<string, boolean>?][];
```

### SlotFunction / InternalSlots / ComponentPublicInstance / ComponentInternalInstance / ComponentOptionsBase

组件相关类型

```typescript
import type {
  SlotFunction,
  InternalSlots,
  ComponentPublicInstance,
  ComponentInternalInstance,
  ComponentOptionsBase,
} from '@lytjs/shared-types';

// 插槽函数
type SlotFunction<Props = Record<string, unknown>> = (props?: Props) => unknown[];

// 内部插槽映射
type InternalSlots<SlotProps = Record<string, unknown>> = Record<string, SlotFunction<SlotProps> | undefined>;

// 组件公共实例（$data, $props, $el, $emit 等）
interface ComponentPublicInstance<Props, Data> {
  $data: Data;
  $props: Props;
  $el: Element | null;
  $options: Record<string, unknown>;
  $refs: Record<string, Element | ComponentPublicInstance | null>;
  $slots: InternalSlots;
  $emit: (event: string, ...args: unknown[]) => void;
  $forceUpdate: () => void;
  $nextTick: () => Promise<void>;
  $parent?: ComponentPublicInstance | null;
  $root?: ComponentPublicInstance | null;
  $attrs?: Record<string, unknown>;
  $provides?: Record<string | symbol, unknown>;
}

// 组件内部实例（最小接口，用于跨包引用）
interface ComponentInternalInstance {
  uid: number;
  props: Record<string, unknown>;
  attrs: Record<string, unknown>;
  slots: InternalSlots;
  refs: Record<string, unknown>;
  vnode: { el: unknown };
  type: Record<string, unknown>;
  ctx: Record<string, unknown>;
  setupState: Record<string, unknown>;
  emit: (event: string, ...args: unknown[]) => void;
  parent: ComponentInternalInstance | null;
  root: ComponentInternalInstance;
  isMounted?: boolean;
  isUnmounted?: boolean;
  subTree?: { el: unknown } | null;
  update?: () => void;
  exposed?: Record<string, unknown> | null;
  lifecycle?: {
    beforeMount: Set<(...args: unknown[]) => void>;
    mounted: Set<(...args: unknown[]) => void>;
    beforeUpdate: Set<(...args: unknown[]) => void>;
    updated: Set<(...args: unknown[]) => void>;
    beforeUnmount: Set<(...args: unknown[]) => void>;
    unmounted: Set<(...args: unknown[]) => void>;
  };
}

// 组件选项基础接口
interface ComponentOptionsBase {
  name?: string;
  props?: Record<string, unknown>;
  data?: () => Record<string, unknown>;
  computed?: Record<string, unknown>;
  methods?: Record<string, (...args: unknown[]) => unknown>;
  watch?: Record<string, unknown>;
  render?: (...args: unknown[]) => unknown;
  setup?: (...args: unknown[]) => unknown;
  emits?: string[] | Record<string, unknown>;
  components?: Record<string, unknown>;
  directives?: Record<string, unknown>;
  // 生命周期钩子
  beforeCreate?: () => void;
  created?: () => void;
  beforeMount?: () => void;
  mounted?: () => void;
  beforeUpdate?: () => void;
  updated?: () => void;
  beforeUnmount?: () => void;
  unmounted?: () => void;
  errorCaptured?: (err: Error, instance: ComponentPublicInstance, info: string) => boolean | void;
  renderTracked?: (...args: unknown[]) => void;
  renderTriggered?: (...args: unknown[]) => void;
}
```

## 完整导出

```typescript
import type {
  RefLike,
  BaseAppConfig,
  BaseAppContext,
  Plugin,
  Props,
  ReactiveEffectRef,
  DebuggerEvent,
  Renderer,
  Directive,
  DirectiveBinding,
  DirectiveArguments,
  SlotFunction,
  InternalSlots,
  ComponentPublicInstance,
  ComponentInternalInstance,
  ComponentOptionsBase,
} from '@lytjs/shared-types';
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口
- [@lytjs/reactivity](../reactivity) - 响应式系统
- [@lytjs/component](../component) - 组件系统
- [@lytjs/renderer](../renderer) - 渲染器实现
