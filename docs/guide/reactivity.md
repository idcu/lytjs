# 响应式系统

LytJS 提供了一套基于 Proxy 的响应式系统，能够自动追踪依赖并在数据变化时触发更新。系统支持两种响应式原语：**Ref 系列**和 **Signal 系列**。

## reactive

使用 `reactive` 创建响应式对象。对响应式对象的属性进行读写会自动被追踪。

```typescript
import { reactive } from '@lytjs/reactivity';

const state = reactive({
  count: 0,
  message: 'hello',
});

state.count++;
console.log(state.message); // "hello"
```

## ref

`ref` 用于创建一个包含单个值的响应式引用。在 JS 中通过 `.value` 访问，在模板中会自动解包。

```typescript
import { ref } from '@lytjs/reactivity';

const count = ref(0);
count.value++;

console.log(count.value); // 1
```

## computed

`computed` 创建一个计算属性，只有在其依赖发生变化时才会重新计算。

```typescript
import { ref, computed } from '@lytjs/reactivity';

const firstName = ref('张');
const lastName = ref('三');

const fullName = computed(() => `${firstName.value}${lastName.value}`);

console.log(fullName.value); // "张三"
```

## watch

`watch` 用于观察响应式数据的变化并执行副作用。

```typescript
import { ref, watch } from '@lytjs/reactivity';

const count = ref(0);

watch(
  () => count.value,
  (newVal, oldVal) => {
    console.log(`count 从 ${oldVal} 变为 ${newVal}`);
  },
);

count.value++; // 控制台输出: count 从 0 变为 1
```

## watchEffect

`watchEffect` 会立即执行回调函数，并自动追踪其中使用的响应式依赖。

```typescript
import { ref, watchEffect } from '@lytjs/reactivity';

const count = ref(0);

watchEffect(() => {
  console.log(`当前 count: ${count.value}`);
});
// 立即输出: 当前 count: 0
```

## Signal API

Signal 是一种独立的响应式原语，拥有独立的订阅/通知机制，同时桥接 effect 系统保持互操作性。Signal 模式下可以实现更细粒度的更新。

### signal()

创建一个可写信号：

```typescript
import { signal, effect } from '@lytjs/reactivity';

const count = signal(0);

// 读取值
console.log(count()); // 0

// 设置值
count.set(1);

// 通过 updater 函数更新
count.update((prev) => prev + 1);
console.log(count()); // 2

// 在 effect 中自动追踪
effect(() => {
  console.log('count:', count());
});
```

### computedSignal()

创建一个计算信号（只读）：

```typescript
import { signal, computedSignal } from '@lytjs/reactivity';

const count = signal(5);
const doubled = computedSignal(() => count() * 2);

console.log(doubled()); // 10

count.set(10);
console.log(doubled()); // 20
```

### readonlySignal()

创建一个只读信号：

```typescript
import { signal, readonlySignal } from '@lytjs/reactivity';

const writable = signal(0);
const readonly = readonlySignal(writable);

console.log(readonly()); // 0
// readonly.set(1); // 错误：readonly 没有 set 方法
```

### Signal 辅助函数

```typescript
import { signal, set, update, valueOf } from '@lytjs/reactivity';

const count = signal(0);

// set 函数设置值
set(count, 10);

// update 函数更新值
update(count, (prev) => prev + 1);

// valueOf 获取当前值
console.log(valueOf(count)); // 11
```

### Signal 批处理

使用 `signalBatch` 批量更新多个 Signal，只触发一次更新：

```typescript
import { signal, computedSignal, signalBatch, effect } from '@lytjs/reactivity';

const a = signal(1);
const b = signal(2);
const sum = computedSignal(() => a() + b());

effect(() => {
  console.log('sum:', sum());
});
// 输出: sum: 3

// 不使用批处理：会触发两次更新
a.set(10); // 输出: sum: 12
b.set(20); // 输出: sum: 30

// 使用批处理：只触发一次更新
signalBatch(() => {
  a.set(100);
  b.set(200);
});
// 输出: sum: 300（只触发一次）
```

### signalUntrack

在不需要追踪依赖的情况下读取 Signal：

```typescript
import { signal, computedSignal, signalUntrack } from '@lytjs/reactivity';

const a = signal(1);
const b = signal(2);

// computed 不依赖 b，但需要读取 b 的值
const result = computedSignal(() => {
  const bValue = signalUntrack(() => b());
  return a() + bValue;
});

// 只有 a 变化时才会重新计算
a.set(10); // 重新计算
b.set(20); // 不会重新计算
```

## Effect 批处理

LytJS 提供了多种批处理机制，用于优化性能和减少不必要的更新。

### batch()

`batch` 用于合并多个响应式更新，只在最后统一触发一次副作用：

```typescript
import { ref, effect, batch } from '@lytjs/reactivity';

const a = ref(0);
const b = ref(0);
let updateCount = 0;

effect(() => {
  updateCount++;
  console.log(`a=${a.value}, b=${b.value}`);
});
// 输出: a=0, b=0

// 不使用 batch：触发两次更新
a.value = 1; // 输出: a=1, b=0
b.value = 2; // 输出: a=1, b=2
console.log('updateCount:', updateCount); // 3

// 使用 batch：只触发一次更新
batch(() => {
  a.value = 10;
  b.value = 20;
});
// 输出: a=10, b=20（只触发一次）
```

### batchAsync()

异步版本的批处理：

```typescript
import { ref, effect, batchAsync } from '@lytjs/reactivity';

const data = ref([]);

effect(() => {
  console.log('data length:', data.value.length);
});

await batchAsync(async () => {
  const result = await fetch('/api/data');
  data.value = await result.json();
});
// 只在数据更新完成后触发一次 effect
```

### untrack()

在不追踪依赖的情况下执行函数：

```typescript
import { ref, computed, untrack } from '@lytjs/reactivity';

const a = ref(1);
const b = ref(2);

// 计算属性不依赖 b
const sum = computed(() => {
  // 读取 b 但不追踪依赖
  const bValue = untrack(() => b.value);
  return a.value + bValue;
});

console.log(sum.value); // 3

a.value = 10;
console.log(sum.value); // 12（重新计算）

b.value = 20;
console.log(sum.value); // 12（未重新计算，因为 b 未被追踪）
```

## 类型守卫

LytJS 提供了完整的类型守卫函数，用于在运行时判断响应式类型。

### Ref 类型守卫

```typescript
import { ref, shallowRef, computed, isRef, isShallowRef, isComputedRef } from '@lytjs/reactivity';

const count = ref(0);
const shallow = shallowRef({ count: 0 });
const doubled = computed(() => count.value * 2);

// isRef：判断是否为 Ref
console.log(isRef(count)); // true
console.log(isRef(doubled)); // true

// isShallowRef：判断是否为浅层 Ref
console.log(isShallowRef(count)); // false
console.log(isShallowRef(shallow)); // true

// isComputedRef：判断是否为计算属性 Ref
console.log(isComputedRef(count)); // false
console.log(isComputedRef(doubled)); // true
```

### Reactive 类型守卫

```typescript
import {
  reactive,
  shallowReactive,
  readonly,
  isReactive,
  isReadonly,
  isProxy,
} from '@lytjs/reactivity';

const state = reactive({ count: 0 });
const shallow = shallowReactive({ count: 0 });
const readonlyState = readonly(state);

// isReactive：判断是否为响应式代理
console.log(isReactive(state)); // true
console.log(isReactive(shallow)); // true
console.log(isReactive(readonlyState)); // true

// isReadonly：判断是否为只读代理
console.log(isReadonly(state)); // false
console.log(isReadonly(readonlyState)); // true

// isProxy：判断是否为任何类型的代理
console.log(isProxy(state)); // true
console.log(isProxy(readonlyState)); // true
```

### Signal 类型守卫

```typescript
import { signal, computedSignal, isSignal } from '@lytjs/reactivity';

const count = signal(0);
const doubled = computedSignal(() => count() * 2);

// isSignal：判断是否为 Signal
console.log(isSignal(count)); // true
console.log(isSignal(doubled)); // true
console.log(isSignal(ref(0))); // false
```

### 实际应用示例

```typescript
import {
  ref,
  reactive,
  computed,
  signal,
  isRef,
  isReactive,
  isSignal,
  unref,
} from '@lytjs/reactivity';

// 工具函数：解包任意响应式值
function unwrap<T>(value: T): T {
  if (isSignal(value)) {
    return value();
  }
  if (isRef(value)) {
    return value.value;
  }
  return value;
}

// 工具函数：安全访问响应式对象属性
function getProperty<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  if (isReactive(obj)) {
    return obj[key];
  }
  return obj[key];
}

// 使用示例
const count = ref(0);
const state = reactive({ name: 'LytJS' });
const sig = signal(42);

console.log(unwrap(count)); // 0
console.log(unwrap(sig)); // 42
console.log(unwrap('plain')); // 'plain'
```

## 下一步

- [API 参考：响应式系统](../api/reactivity) - 查看完整的响应式 API 文档
- [渲染模式](./rendering-modes) - 了解 VNode 和 Signal 模式的详细区别
- [组件系统](./component) - 学习如何在组件中使用响应式数据
