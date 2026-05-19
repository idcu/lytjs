# @lytjs/component

> LytJS 组件系统，提供组件实例管理、Props/Emits/Slots、生命周期钩子、错误边界和内置组件

## 安装

```bash
npm install @lytjs/component
```

## 核心 API

### defineComponent

定义组件选项对象

```typescript
import { defineComponent } from '@lytjs/component';

const MyComponent = defineComponent({
  name: 'MyComponent',
  props: {
    title: String,
    count: { type: Number, default: 0 },
  },
  emits: ['update:count'],
  setup(props, { emit, slots }) {
    return () => h('div', props.title);
  },
});
```

### defineFunctionalComponent

定义函数式组件

```typescript
import { defineFunctionalComponent } from '@lytjs/component';

const FunctionalButton = defineFunctionalComponent((props, ctx) => {
  return h('button', props.text);
});
```

### createComponentInstance / setupComponent

创建和初始化组件实例

```typescript
import { createComponentInstance, setupComponent } from '@lytjs/component';

const instance = createComponentInstance(vnode, parent);
setupComponent(instance);
```

### provide / inject

依赖注入

```typescript
import { provide, inject } from '@lytjs/component';

// 父组件提供
provide('theme', 'dark');

// 子组件注入
const theme = inject('theme', 'light'); // 默认值 'light'
```

## 生命周期钩子

### 注册钩子

```typescript
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onErrorCaptured,
  onActivated,
  onDeactivated,
  onRenderTracked,
  onRenderTriggered,
} from '@lytjs/component';

export default defineComponent({
  setup() {
    onBeforeMount(() => {
      console.log('Before mount');
    });

    onMounted(() => {
      console.log('Mounted');
    });

    onBeforeUpdate(() => {
      console.log('Before update');
    });

    onUpdated(() => {
      console.log('Updated');
    });

    onBeforeUnmount(() => {
      console.log('Before unmount');
    });

    onUnmounted(() => {
      console.log('Unmounted');
    });

    onErrorCaptured((err, instance, info) => {
      console.error('Error captured:', err);
      return false; // 阻止错误继续传播
    });

    // KeepAlive 激活/停用
    onActivated(() => {
      console.log('Activated');
    });

    onDeactivated(() => {
      console.log('Deactivated');
    });

    // 调试钩子
    onRenderTracked((e) => {
      console.log('Render tracked:', e);
    });

    onRenderTriggered((e) => {
      console.log('Render triggered:', e);
    });
  },
});
```

### 内部钩子调用

```typescript
import {
  callLifecycleHook,
  callCreatedHook,
  callMountedHook,
  callUpdatedHook,
  callUnmountedHook,
  handleError,
} from '@lytjs/component';

// 手动调用生命周期钩子（内部使用）
callMountedHook(instance);

// 错误处理
handleError(err, instance, 'hook');
```

## 错误边界

ErrorBoundary 组件用于捕获子组件的渲染错误

### 基本用法

```typescript
import { ErrorBoundary } from '@lytjs/component';

const App = defineComponent({
  components: { ErrorBoundary },
  template: `
    <ErrorBoundary 
      :on-error="handleError"
      :fallback="FallbackComponent"
    >
      <MyComponent />
    </ErrorBoundary>
  `,
  methods: {
    handleError(err: Error, info: string) {
      console.error('Error:', err, 'Info:', info);
    },
  },
});
```

### Props

```typescript
interface ErrorBoundaryProps {
  /** 错误回调 */
  onError?: (error: Error, info: string) => void;
  /** 回退组件 */
  fallback?: ComponentOptions;
  /** 是否捕获异步 Promise 错误 */
  capturePromiseRejections?: boolean;
}
```

### 插槽用法

```typescript
<ErrorBoundary>
  <template #default>
    <MyComponent />
  </template>
  <template #fallback="{ error }">
    <div>Something went wrong: {{ error?.message }}</div>
  </template>
</ErrorBoundary>
```

### 异步错误捕获

```typescript
<ErrorBoundary :capture-promise-rejections="true">
  <AsyncComponent />
</ErrorBoundary>
```

## KeepAlive

内置缓存组件，用于缓存非活动组件实例

```typescript
import { KeepAlive } from '@lytjs/component';

// 基本用法
<KeepAlive>
  <component :is="currentComponent" />
</KeepAlive>

// 带 include/exclude
<KeepAlive include="ComponentA,ComponentB">
  <component :is="currentComponent" />
</KeepAlive>

<KeepAlive :exclude="/^Admin/">
  <component :is="currentComponent" />
</KeepAlive>

// 最大缓存数
<KeepAlive :max="10">
  <component :is="currentComponent" />
</KeepAlive>
```

### KeepAlive API

```typescript
import {
  KeepAlive,
  createKeepAliveInstance,
  matchesPattern,
  getCacheKey,
  cacheInstance,
  getCachedInstance,
  removeCachedInstance,
  activateInstance,
  deactivateInstance,
} from '@lytjs/component';

// 手动管理缓存
const key = getCacheKey(vnode);
cacheInstance(key, instance);
const cached = getCachedInstance(key);
removeCachedInstance(key);

// 激活/停用
activateInstance(instance);
deactivateInstance(instance);
```

## Suspense

异步组件边界，用于处理异步依赖

```typescript
import { Suspense } from '@lytjs/component';

<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  <template #fallback>
    <div>Loading...</div>
  </template>
</Suspense>
```

### Suspense API

```typescript
import {
  Suspense,
  createSuspenseInstance,
  createSuspenseBoundary,
  registerAsyncChild,
  isSuspensePending,
  getSuspenseError,
  resolveSuspense,
  abortSuspense,
  linkSuspenseBoundary,
} from '@lytjs/component';

// 手动管理 Suspense
const suspense = createSuspenseBoundary();
registerAsyncChild(suspense, asyncComponent);

if (isSuspensePending(suspense)) {
  // 等待中
}

resolveSuspense(suspense);
abortSuspense(suspense);
```

## Transition / TransitionGroup

过渡动画组件

```typescript
import { Transition, TransitionGroup } from '@lytjs/component';

// 单元素过渡
<Transition name="fade" mode="out-in">
  <div :key="current">Content</div>
</Transition>

// 列表过渡
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">{{ item.text }}</li>
</TransitionGroup>
```

## Teleport

传送门组件，将内容渲染到指定位置

```typescript
import { Teleport } from '@lytjs/component';

<Teleport to="body">
  <div class="modal">Modal content</div>
</Teleport>

<Teleport to="#modals" :disabled="isMobile">
  <div>Conditional teleport</div>
</Teleport>
```

## 异步组件

### defineAsyncComponent

定义异步加载的组件

```typescript
import { defineAsyncComponent } from '@lytjs/component';

const AsyncComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,
  timeout: 10000,
  onError(error, retry, fail) {
    if (error.name === 'ChunkError') {
      retry();
    } else {
      fail();
    }
  },
});
```

### 预加载

```typescript
import {
  preloadComponents,
  preloadComponent,
  isComponentPreloaded,
  clearPreloadCache,
} from '@lytjs/component';

// 预加载单个组件
await preloadComponent(AsyncComponent);

// 预加载多个组件
await preloadComponents([ComponentA, ComponentB]);

// 检查是否已预加载
if (isComponentPreloaded(AsyncComponent)) {
  // 已预加载
}

// 清除预加载缓存
clearPreloadCache();
```

## Props / Emits / Slots

### Props

```typescript
import { normalizePropsOptions, resolvePropValue, validateType } from '@lytjs/component';

// 规范化 props 选项
const normalized = normalizePropsOptions(componentOptions.props);

// 解析 prop 值
const value = resolvePropValue(propOptions, rawValue);

// 类型验证
if (validateType(String, value)) {
  // 类型正确
}
```

### Emits

```typescript
import { emit, normalizeEmitsOptions, isEmitValid } from '@lytjs/component';

// 发射事件
emit(instance, 'update:modelValue', newValue);

// 规范化 emits 选项
const normalized = normalizeEmitsOptions(componentOptions.emits);

// 检查事件是否有效
if (isEmitValid(instance, 'click')) {
  // 事件有效
}
```

### Slots

```typescript
import { initSlots, normalizeSlotValue } from '@lytjs/component';

// 初始化插槽
initSlots(instance, children);

// 规范化插槽值
const normalized = normalizeSlotValue(slotValue);
```

## Signal State 适配器

使 Signal 可以与组件协作

```typescript
import { createSignalState, createComputedState } from '@lytjs/component';

// 创建 Signal 状态
const state = createSignalState(signal(0));

// 创建计算状态
const computed = createComputedState(() => props.count * 2);
```

## 递归深度限制

组件系统内置递归深度限制，防止无限递归导致的栈溢出：

- 组件渲染递归深度限制
- KeepAlive 缓存递归深度限制
- Suspense 边界嵌套深度限制

当超过限制时，会输出警告并停止递归。

## 类型定义

```typescript
import type {
  ComponentOptions,
  ComponentInternalInstance,
  ComponentPublicInstance,
  ComponentIdentity,
  ComponentLifecycleState,
  ComponentRenderState,
  ComponentContextState,
  ComponentParentState,
  SetupContext,
  InternalSlots,
  AppContext,
  PropOptions,
  RenderFunction,
  SlotFunction,
  KeepAliveProps,
  SuspenseProps,
  SuspenseAsyncState,
  TeleportProps,
  ErrorBoundaryProps,
  TransitionComponentProps,
  TransitionGroupComponentProps,
  AsyncComponentLoader,
  AsyncComponentOptions,
  AsyncComponentState,
} from '@lytjs/component';
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/reactivity](../reactivity) - 响应式系统，组件状态管理的基础
- [@lytjs/vdom](../vdom) - 虚拟 DOM，组件渲染的基础

## 依赖版本

- [@lytjs/shared-types](https://www.npmjs.com/package/@lytjs/shared-types): ^6.4.0
- [@lytjs/reactivity](https://www.npmjs.com/package/@lytjs/reactivity): ^6.4.0
- [@lytjs/vdom](https://www.npmjs.com/package/@lytjs/vdom): ^6.4.0
- [@lytjs/common-vnode](https://www.npmjs.com/package/@lytjs/common-vnode): ^6.4.0
- [@lytjs/common-is](https://www.npmjs.com/package/@lytjs/common-is): ^6.4.0
- [@lytjs/common-scheduler](https://www.npmjs.com/package/@lytjs/common-scheduler): ^6.4.0
- [@lytjs/common-error](https://www.npmjs.com/package/@lytjs/common-error): ^6.4.0
- [@lytjs/common-string](https://www.npmjs.com/package/@lytjs/common-string): ^6.4.0
