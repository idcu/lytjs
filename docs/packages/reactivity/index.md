# @lytjs/reactivity

> LytJS 响应式系统，提供 ref、reactive、computed、watch、Signal 等核心响应式原语

## 安装

```bash
npm install @lytjs/reactivity
```

## 核心 API

### reactive / shallowReactive / readonly / shallowReadonly

创建响应式对象，支持深层/浅层响应和只读模式

```typescript
import { reactive, shallowReactive, readonly, shallowReadonly } from '@lytjs/reactivity';

const state = reactive({ count: 0 });
state.count++; // 自动追踪

const shallow = shallowReactive({ nested: { value: 1 } });
shallow.nested.value = 2; // 不会触发更新（浅层响应）
```

### ref / shallowRef

创建响应式引用，适用于基本类型值

```typescript
import { ref, shallowRef, isShallowRef } from '@lytjs/reactivity';

const count = ref(0);
count.value++;

const shallow = shallowRef({ nested: { value: 1 } });
// isShallowRef 类型守卫
if (isShallowRef(shallow)) {
  console.log('这是一个 ShallowRef');
}
```

### isShallowRef / isComputedRef

类型守卫函数，用于在运行时判断 Ref 类型

```typescript
import { ref, shallowRef, computed, isShallowRef, isComputedRef } from '@lytjs/reactivity';

const r = ref(0);
const sr = shallowRef({ a: 1 });
const c = computed(() => r.value * 2);

isShallowRef(r); // false
isShallowRef(sr); // true
isComputedRef(r); // false
isComputedRef(c); // true
```

### computed

创建计算属性，自动追踪依赖并缓存结果

```typescript
import { computed, ref } from '@lytjs/reactivity';

const count = ref(1);
const doubled = computed(() => count.value * 2);
console.log(doubled.value); // 2
```

### watch / watchEffect

侦听响应式数据变化并执行副作用

```typescript
import { watch, watchEffect, ref } from '@lytjs/reactivity';

const count = ref(0);

// 侦听特定源
watch(count, (newVal, oldVal) => {
  console.log(`count changed from ${oldVal} to ${newVal}`);
});

// 自动追踪依赖
watchEffect(() => {
  console.log(`count is ${count.value}`);
});
```

### effect

创建自定义响应式副作用

```typescript
import { effect, stop } from '@lytjs/reactivity';

const runner = effect(() => {
  // 副作用逻辑
});

// 停止副作用
stop(runner);
```

### toRef / toRefs / unref

响应式引用工具函数

```typescript
import { toRef, toRefs, unref } from '@lytjs/reactivity';

const state = reactive({ foo: 1, bar: 2 });
const { foo, bar } = toRefs(state);

const refFoo = toRef(state, 'foo');
const value = unref(refFoo); // 1
```

## Signal API

Signal 是一种独立的响应式原语，拥有独立的订阅/通知机制，同时桥接 effect 系统保持互操作性。

### signal

创建可写 Signal

```typescript
import { signal, computed } from '@lytjs/reactivity';

const count = signal(0);

// 读取值
console.log(count()); // 0

// 设置值
count.set(1);

// 通过 updater 更新
count.update((prev) => prev + 1);

// 停止所有订阅通知，释放资源
count.dispose();
```

### computed (Signal 版本)

创建计算 Signal，惰性求值、自动依赖追踪

```typescript
import { signal, computed } from '@lytjs/reactivity';

const count = signal(1);
const doubled = computed(() => count() * 2);

console.log(doubled()); // 2

// 停止计算信号的依赖追踪
doubled.dispose();
```

### writableComputedSignal

创建可写计算 Signal

```typescript
import { signal, writableComputedSignal } from '@lytjs/reactivity';

const firstName = signal('John');
const lastName = signal('Doe');

const fullName = writableComputedSignal(
  () => `${firstName()} ${lastName()}`,
  (val) => {
    const [first, last] = val.split(' ');
    firstName.set(first);
    lastName.set(last);
  },
);

fullName.set('Jane Smith');
```

### signalBatch / signalUntrack

Signal 批处理和取消追踪

```typescript
import { signal, signalBatch, signalUntrack } from '@lytjs/reactivity';

const a = signal(1);
const b = signal(2);

// 批量更新：多次 set 只触发一次通知
signalBatch(() => {
  a.set(10);
  b.set(20);
});

// 取消追踪：读取 signal 不建立依赖
const value = signalUntrack(() => a());
```

## Effect 批处理

### batch / batchAsync

批量执行多个响应式更新，减少不必要的重复计算

```typescript
import { batch, batchAsync, ref, effect } from '@lytjs/reactivity';

const a = ref(1);
const b = ref(2);

// 同步批处理
batch(() => {
  a.value = 10;
  b.value = 20;
  // 在 batch 结束前，effect 不会触发
});

// 异步批处理
await batchAsync(async () => {
  a.value = await fetchValue();
  b.value = await fetchOtherValue();
});
```

### batchScope

更细粒度的批处理控制

```typescript
import { batchScope, batchScopeAsync, batchScopeUntrack, isInBatchScope } from '@lytjs/reactivity';

// 带选项的批处理
batchScope(
  () => {
    // 检查是否在批处理作用域内
    if (isInBatchScope()) {
      console.log('当前在批处理作用域内');
    }
  },
  { flush: 'sync' },
);

// 异步批处理作用域
await batchScopeAsync(async () => {
  // 异步操作
});

// 取消追踪的批处理
batchScopeUntrack(() => {
  // 内部的响应式读取不会建立依赖
});
```

### 嵌套批处理行为

`batch()` 支持嵌套调用，使用栈追踪状态

```typescript
import { batch, effect } from '@lytjs/reactivity';

batch(() => {
  // 追踪已暂停
  batch(() => {
    // 追踪仍处于暂停状态
  });
  // 内层 batch 结束后，追踪仍处于暂停状态（由外层 batch 控制）
});
// 外层 batch 结束后，追踪恢复正常
```

## 边界行为与已知限制

### `signal()` 的 undefined 参数歧义

`signal()` 通过 `arguments.length` 来区分读取操作和写入操作。当传入 `undefined` 作为参数时，由于 `arguments.length > 0` 为 `true`，它会被视为**写入操作**。

```typescript
import { signal } from '@lytjs/reactivity';

const sig = signal<number | undefined>(42);
sig(undefined); // 写入操作：将值设为 undefined
sig(); // 读取操作：返回 undefined
```

### `computedSignal.dispose()` 方法

调用 `dispose()` 后：

- 计算信号不再自动追踪依赖变化
- 后续访问将返回最后一次缓存的值
- 依赖该计算信号的其他 effect 不会再因依赖变化而被触发

## DevTools 集成

在开发环境下，响应式系统会自动初始化 DevTools 全局对象：

```typescript
// 浏览器控制台
window.__LYTJS_DEVTOOLS__.getSignals();
window.__LYTJS_DEVTOOLS__.getEffects();
window.__LYTJS_DEVTOOLS__.onSignalChange((id, value) => {
  console.log('Signal changed:', id, value);
});
```

## 子路径入口

```typescript
// Effect Scope
import { effectScope, getCurrentScope, onScopeDispose } from '@lytjs/reactivity/scope';

// 异步计算
import { asyncComputed, useAsyncState } from '@lytjs/reactivity/async';
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/component](../component) - 组件系统，依赖响应式系统
- [@lytjs/common](../common) - 公共工具库
