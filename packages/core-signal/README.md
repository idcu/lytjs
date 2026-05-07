# @lytjs/core-signal

> LytJS 核心应用 API（Signal 渲染模式），适合细粒度响应式场景

## 安装

```bash
npm install @lytjs/core-signal
```

## 与 @lytjs/core 的区别

| 特性 | @lytjs/core-signal | @lytjs/core |
|------|--------------------|-------------|
| 渲染模式 | 仅 Signal | VNode + Signal 双模式 |
| 包体积 | 更小 | 完整功能 |
| 适用场景 | 细粒度响应式应用 | 需要双模式切换的应用 |
| 性能特点 | 细粒度更新 | 灵活选择 |

## 核心 API

### createApp

创建 Signal 模式应用实例：

```typescript
import { createApp, defineComponent, signal } from '@lytjs/core-signal';

const App = defineComponent({
  template: `
    <div>
      <p>Count: {{ count() }}</p>
      <button @click="increment">Increment</button>
    </div>
  `,
  setup() {
    const count = signal(0);
    
    const increment = () => {
      count.set(count() + 1);
    };
    
    return { count, increment };
  }
});

createApp(App).mount('#app');
```

### Signal API

```typescript
import { signal, computed, writableComputedSignal } from '@lytjs/core-signal';

// 创建 Signal
const count = signal(0);

// 读取值
console.log(count()); // 0

// 设置值
count.set(10);

// 通过 updater 更新
count.update(v => v + 1);

// 计算 Signal
const doubled = computed(() => count() * 2);

// 可写计算 Signal
const fullName = writableComputedSignal(
  () => `${firstName()} ${lastName()}`,
  (val) => {
    const [first, last] = val.split(' ');
    firstName.set(first);
    lastName.set(last);
  }
);
```

### 批处理

```typescript
import { signalBatch, signalUntrack } from '@lytjs/core-signal';

// 批量更新
signalBatch(() => {
  a.set(10);
  b.set(20);
  // 只触发一次通知
});

// 取消追踪
const value = signalUntrack(() => a());
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
} from '@lytjs/core-signal';

const App = defineComponent({
  setup() {
    onMounted(() => {
      console.log('组件已挂载');
    });
    
    onUnmounted(() => {
      console.log('组件已卸载');
    });
    
    return () => {
      // Signal 渲染函数
    };
  }
});
```

## 响应式 API

从 @lytjs/reactivity 重导出：

```typescript
import {
  // Signal
  signal, computed, writableComputedSignal, readonlySignal,
  set, update, valueOf,
  signalBatch, signalUntrack,
  // Ref（与 Signal 互操作）
  ref, reactive, computed as computedRef,
  watch, watchEffect,
} from '@lytjs/core-signal';
```

## Signal vs Ref

| 特性 | Signal | Ref |
|------|--------|-----|
| 读取 | `count()` | `count.value` |
| 写入 | `count.set()` | `count.value = ` |
| 更新 | `count.update()` | 手动更新 |
| 批量 | `signalBatch()` | `batch()` |
| 取消追踪 | `signalUntrack()` | `untrack()` |
| 适用 | 细粒度响应 | 对象响应式 |

## 类型定义

```typescript
import type {
  App,
  AppConfig,
  Component,
  ComponentOptions,
  ComponentPublicInstance,
  Signal,
  ComputedSignal,
  WritableComputedSignal,
} from '@lytjs/core-signal';
```

## 相关包

- [@lytjs/core](../core) - 完整核心（支持双模式）
- [@lytjs/core-vnode](../core-vnode) - 仅 VNode 模式
- [@lytjs/reactivity](../reactivity) - 响应式系统实现
