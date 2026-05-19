# @lytjs/core

> LytJS 框架核心入口，整合响应式、编译器、虚拟 DOM、渲染器和组件系统

## 安装

```bash
npm install @lytjs/core
```

## 核心 API

### createApp

创建应用实例，挂载根组件

```typescript
import { createApp, defineComponent } from '@lytjs/core';

const RootComponent = defineComponent({
  setup() {
    const count = ref(0);
    return () => h('div', count.value);
  },
});

const app = createApp(RootComponent);
app.mount('#app');
```

### h / createElement

创建虚拟节点（JSX 工厂函数）

```typescript
import { h } from '@lytjs/core';

// 创建元素
const div = h('div', { class: 'container' }, 'Hello');

// 创建组件
const component = h(MyComponent, { prop: 'value' });

// 嵌套子节点
const nested = h('div', null, [h('span', null, 'Child 1'), h('span', null, 'Child 2')]);
```

### defineComponent / defineAsyncComponent

定义组件和异步组件

```typescript
import { defineComponent, defineAsyncComponent } from '@lytjs/core';

// 同步组件
const MyComponent = defineComponent({
  name: 'MyComponent',
  props: {
    title: String,
  },
  setup(props) {
    return () => h('div', props.title);
  },
});

// 异步组件
const AsyncComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'));
```

### nextTick

在下一个 DOM 更新周期后执行回调

```typescript
import { nextTick, ref } from '@lytjs/core';

const count = ref(0);
count.value++;

// 等待 DOM 更新
await nextTick();
// 或使用回调
nextTick(() => {
  console.log('DOM updated');
});
```

## 响应式 API

从 @lytjs/reactivity 重导出

```typescript
import {
  ref,
  reactive,
  shallowRef,
  shallowReactive,
  readonly,
  shallowReadonly,
  computed,
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect,
  effect,
  stop,
  toRef,
  toRefs,
  unref,
  toValue,
  customRef,
  isRef,
  isReactive,
  isReadonly,
  isProxy,
  toRaw,
  markRaw,
  triggerRef,
  provide,
  inject,
  // Signal API
  signal,
  computed as signalComputed,
  writableComputedSignal,
  readonlySignal,
  set,
  update,
  valueOf,
  signalBatch,
  signalUntrack,
  // 类型守卫
  isShallowRef,
  isComputedRef,
} from '@lytjs/core';
```

## 生命周期钩子

```typescript
import {
  onMounted,
  onUnmounted,
  onUpdated,
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount,
  onErrorCaptured,
  onActivated,
  onDeactivated,
  onRenderTracked,
  onRenderTriggered,
} from '@lytjs/core';
```

## 编译 API

从 @lytjs/compiler 重导出

```typescript
import { compile, parse, transform, generate } from '@lytjs/core';

const { code, ast } = compile('<div>{{ message }}</div>');
```

## 内置组件

```typescript
import {
  KeepAlive,
  Suspense,
  Transition,
  TransitionGroup,
  Teleport,
  ErrorBoundary,
} from '@lytjs/core';
```

### KeepAlive

缓存非活动组件实例

```typescript
import { KeepAlive, ref } from '@lytjs/core';

const current = ref('ComponentA');

<KeepAlive include="ComponentA,ComponentB" :max="10">
  <component :is="current" />
</KeepAlive>
```

### Suspense

处理异步组件加载

```typescript
import { Suspense, defineAsyncComponent } from '@lytjs/core';

const AsyncComponent = defineAsyncComponent(() => import('./Heavy.vue'));

<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  <template #fallback>
    <div>Loading...</div>
  </template>
</Suspense>
```

### Transition / TransitionGroup

过渡动画

```typescript
import { Transition, TransitionGroup } from '@lytjs/core';

<Transition name="fade" mode="out-in">
  <div :key="id">Content</div>
</Transition>

<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</TransitionGroup>
```

### Teleport

传送内容到指定位置

```typescript
import { Teleport } from '@lytjs/core';

<Teleport to="body">
  <div class="modal">Modal content</div>
</Teleport>
```

### ErrorBoundary

错误边界，捕获子组件错误

```typescript
import { ErrorBoundary } from '@lytjs/core';

<ErrorBoundary :on-error="handleError" :capture-promise-rejections="true">
  <MyComponent />
  <template #fallback="{ error }">
    <div>Error: {{ error?.message }}</div>
  </template>
</ErrorBoundary>
```

## 渲染 API

```typescript
import {
  createRenderer,
  createDOMRenderer,
  renderToString,
  renderToStream,
  createSignalRenderer,
  createVaporRenderer,
  createVaporApp,
  defineVaporComponent,
} from '@lytjs/core';
```

## 工具函数

```typescript
import {
  mergeProps,
  cloneVNode,
  normalizeClass,
  normalizeStyle,
  normalizeProps,
} from '@lytjs/core';
```

## 类型定义

```typescript
import type {
  // 组件类型
  ComponentOptions,
  ComponentPublicInstance,
  ComponentInternalInstance,
  SetupContext,
  PropOptions,
  // VNode 类型
  VNode,
  VNodeTypes,
  VNodeChildren,
  // 响应式类型
  Ref,
  ShallowRef,
  ComputedRef,
  ReactiveEffectRunner,
  WatchOptions,
  WatchCallback,
  WatchHandle,
  // 编译类型
  CompilerOptions,
  CodegenResult,
  // 渲染类型
  RendererOptions,
  RendererPlugin,
} from '@lytjs/core';
```

## 子包

@lytjs/core 整合以下子包：

| 包名                               | 说明             |
| ---------------------------------- | ---------------- |
| [@lytjs/reactivity](../reactivity) | 响应式系统       |
| [@lytjs/vdom](../vdom)             | 虚拟 DOM 实现    |
| [@lytjs/compiler](../compiler)     | 模板编译器       |
| [@lytjs/renderer](../renderer)     | DOM/SSR 渲染后端 |
| [@lytjs/component](../component)   | 组件系统         |
| [@lytjs/common](../common)         | 公共工具库       |

## 相关包

- [@lytjs/adapter-web](../adapter-web) - Web 平台适配器
- [@lytjs/host-contract](../host-contract) - 渲染器宿主抽象
