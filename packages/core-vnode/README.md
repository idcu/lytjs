# @lytjs/core-vnode

> LytJS 核心应用 API（VNode 渲染模式），适合传统模板渲染场景

## 安装

```bash
npm install @lytjs/core-vnode
```

## 与 @lytjs/core 的区别

| 特性 | @lytjs/core-vnode | @lytjs/core |
|------|-------------------|-------------|
| 渲染模式 | 仅 VNode | VNode + Signal 双模式 |
| 包体积 | 更小 | 完整功能 |
| 适用场景 | 传统模板应用 | 需要双模式切换的应用 |

## 核心 API

### createApp

创建 VNode 模式应用实例：

```typescript
import { createApp, defineComponent, ref, h } from '@lytjs/core-vnode';

const App = defineComponent({
  setup() {
    const count = ref(0);
    
    const increment = () => {
      count.value++;
    };
    
    return () => h('div', [
      h('p', `Count: ${count.value}`),
      h('button', { onClick: increment }, 'Increment')
    ]);
  }
});

const app = createApp(App);
app.mount('#app');
```

### 使用模板

```typescript
import { createApp, defineComponent, ref } from '@lytjs/core-vnode';

const App = defineComponent({
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <button @click="increment">Increment</button>
    </div>
  `,
  setup() {
    const count = ref(0);
    const increment = () => count.value++;
    return { count, increment };
  }
});

createApp(App).mount('#app');
```

### 生命周期钩子

```typescript
import {
  onMounted,
  onUnmounted,
  onUpdated,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onErrorCaptured,
} from '@lytjs/core-vnode';

const App = defineComponent({
  setup() {
    onMounted(() => {
      console.log('组件已挂载');
    });
    
    onUnmounted(() => {
      console.log('组件已卸载');
    });
    
    onErrorCaptured((err, instance, info) => {
      console.error('捕获到错误:', err, info);
      return false; // 阻止错误传播
    });
  }
});
```

### 内置组件

```typescript
import {
  KeepAlive,
  Suspense,
  Transition,
  TransitionGroup,
  Teleport,
  ErrorBoundary,
} from '@lytjs/core-vnode';

// KeepAlive 缓存组件
// Suspense 处理异步组件
// Transition/TransitionGroup 过渡动画
// Teleport 传送内容
// ErrorBoundary 错误边界
```

## 响应式 API

从 @lytjs/reactivity 重导出：

```typescript
import {
  // 基础响应式
  ref, reactive, computed, watch, watchEffect,
  // 工具函数
  toRef, toRefs, unref, toValue,
  // 类型守卫
  isRef, isReactive, isReadonly, isProxy,
} from '@lytjs/core-vnode';
```

## 组合式 API

```typescript
import {
  useSlots,
  useAttrs,
  useModel,
  useTemplateRef,
  useId,
  useCssModule,
  useCssVars,
} from '@lytjs/core-vnode';
```

## 类型定义

```typescript
import type {
  App,
  AppConfig,
  Component,
  ComponentOptions,
  ComponentPublicInstance,
  VNode,
  VNodeChildren,
} from '@lytjs/core-vnode';
```

## 相关包

- [@lytjs/core](../core) - 完整核心（支持双模式）
- [@lytjs/core-signal](../core-signal) - 仅 Signal 模式
- [@lytjs/vdom](../vdom) - 虚拟 DOM 实现
