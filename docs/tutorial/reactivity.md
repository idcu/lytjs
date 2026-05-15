# 响应式基础

LytJS 的响应式系统是其核心特性之一。**Signal 是官方推荐的响应式方式**，简单、高效、直观。

## Signal（推荐）

Signal 是 LytJS 响应式系统的基本单位，用于创建响应式数据。

### 创建 Signal

```typescript
import { signal } from '@lytjs/core';

// 创建基本类型 signal
const count = signal(0);
const name = signal('LytJS');
const isActive = signal(true);

// 创建对象类型 signal
const user = signal({
  name: '张三',
  age: 25,
});

// 创建数组类型 signal
const items = signal([1, 2, 3, 4, 5]);
```

### 读取和写入值

Signal 是一个函数，调用函数来读取和设置值：

```typescript
// 读取值
console.log(count()); // 0
console.log(name()); // 'LytJS'

// 设置值
count(10);
console.log(count()); // 10

name('New Name');
console.log(name()); // 'New Name'
```

### 响应式更新

当 signal 的值发生变化时，所有依赖该 signal 的地方都会自动更新：

```typescript
import { signal, effect } from '@lytjs/core';

const count = signal(0);

// 这个 effect 依赖于 count
effect(() => {
  console.log('Count changed:', count());
});

count(1); // 触发更新，打印 'Count changed: 1'
count(2); // 触发更新，打印 'Count changed: 2'
```

## Computed

Computed 用于创建计算属性，自动追踪依赖并缓存结果。

### 创建 Computed

```typescript
import { signal, computed } from '@lytjs/core';

const firstName = signal('张');
const lastName = signal('三');

// 创建计算属性
const fullName = computed(() => {
  return `${firstName()} ${lastName()}`;
});

console.log(fullName()); // '张 三'

// 修改依赖，computed 自动更新
firstName('李');
console.log(fullName()); // '李 三'
```

### Computed 的特点

1. **自动追踪依赖**：会自动追踪计算过程中使用的所有 signal
2. **懒执行**：只有访问 computed 时才会计算
3. **缓存结果**：依赖未变化时，直接返回缓存的结果

```typescript
const count = signal(0);

const double = computed(() => {
  console.log('Computing...');
  return count() * 2;
});

console.log(double()); // 打印 'Computing...', 返回 0
console.log(double()); // 不打印，直接返回缓存的 0
console.log(double()); // 不打印，直接返回缓存的 0

count(5);
console.log(double()); // 打印 'Computing...', 返回 10
```

## Effect

Effect 用于执行副作用操作，自动追踪依赖并响应变化。

### 基本用法

```typescript
import { signal, effect } from '@lytjs/core';

const name = signal('LytJS');

// 创建 effect
const stop = effect(() => {
  console.log('Name changed to:', name());
});

// 修改值，effect 自动执行
name('Vue'); // 打印 'Name changed to: Vue'
name('React'); // 打印 'Name changed to: React'

// 停止 effect
stop();
```

### Effect 的清理

Effect 返回一个停止函数，用于清理副作用：

```typescript
import { onCleanup } from '@lytjs/core';

effect(() => {
  const timer = setInterval(() => {
    console.log('Timer tick');
  }, 1000);

  // 清理函数
  onCleanup(() => {
    clearInterval(timer);
  });
});
```

### 手动停止

```typescript
const stop = effect(() => {
  document.title = `Count: ${count()}`;
});

// 在某个条件下停止
if (shouldStop) {
  stop();
}
```

## 批量更新

使用 batch 批量处理多个更新，减少不必要的渲染：

```typescript
import { signal, batch } from '@lytjs/core';

const x = signal(0);
const y = signal(0);

effect(() => {
  console.log(x(), y());
});

// 批量更新，只触发一次更新
batch(() => {
  x(10);
  y(20);
});
```

---

## Ref/Reactive（兼容选项）

如果你习惯 Vue 的语法，也可以使用 Ref/Reactive API。但在新项目中，**推荐使用 Signal**。

### Ref

```typescript
import { ref } from '@lytjs/core';

const count = ref(0);

// 读取和设置值
console.log(count.value); // 0
count.value = 10;
console.log(count.value); // 10
```

### Reactive

```typescript
import { reactive } from '@lytjs/core';

const state = reactive({
  name: 'LytJS',
  version: '1.0',
  features: ['Fast', 'Light', 'Zero Deps'],
});

// 直接修改属性
state.name = 'New Name';
state.features.push('New Feature');

// 自动追踪
effect(() => {
  console.log(state.name);
});
```

### Reactive 的特点

1. **深层响应式**：对象的所有嵌套属性都是响应式的
2. **不需要 `.value`**：像普通对象一样使用
3. **自动追踪**：所有属性访问都会被追踪

---

## 最佳实践

### ✅ 推荐做法

```typescript
// 1. 使用 signal 创建响应式状态
const count = signal(0);

// 2. 使用 computed 派生状态
const double = computed(() => count() * 2);

// 3. 在 effect 中处理副作用
effect(() => {
  document.title = `Count: ${count()}`;
});
```

### ❌ 避免做法

```typescript
// 避免：不必要的响应式
const CONFIG = signal({ fixed: true }) // 静态数据不需要响应式

// 避免：在 effect 中修改响应式状态（可能导致无限循环）
effect(() => {
  count(count() + 1) // 可能导致无限循环
})

// 避免：忘记清理 effect
effect(() => {
  const timer = setInterval(...)
  // 如果不清理，会导致内存泄漏
})
```

## 下一步

- 学习 [组件基础](./components.md) 了解如何在组件中使用响应式
- 阅读 [状态管理](./state-management.md) 学习更高级的状态管理
- 查看 [API 文档](../api/reactivity.md) 了解完整的 API
