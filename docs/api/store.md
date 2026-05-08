# @lytjs/store

> 基于 Signal 的状态管理，支持 Options Store 和 Setup Store 两种模式。

## 安装

```bash
pnpm add @lytjs/store
```

## 快速开始

```typescript
import { createPinia, defineStore } from '@lytjs/store';

// 创建 Pinia 实例
const pinia = createPinia();
app.use(pinia);

// 定义 Store (Options API)
const useCounter = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  actions: {
    increment() { this.count++; },
  },
});

// 使用 Store
const counter = useCounter();
counter.increment();
console.log(counter.doubleCount); // 2
```

## API

### `createPinia()`

创建 Pinia 实例。

### `defineStore(id, options)`

定义 Options Store。

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | Store 唯一标识 |
| `options.state` | `() => StateTree` | 初始状态工厂函数 |
| `options.getters` | `object` | 计算属性 |
| `options.actions` | `object` | 方法 |

### `defineStore(id, setup)`

定义 Setup Store（组合式函数风格）。

### `storeToRefs(store)`

从 Store 中提取响应式 refs。

## Store 实例方法

| 方法 | 说明 |
|------|------|
| `$patch(partial)` | 对象补丁更新 |
| `$patch(fn)` | 函数补丁更新 |
| `$reset()` | 重置到初始状态 |
| `$subscribe(callback)` | 订阅状态变化 |
| `$onAction(callback)` | 订阅 action 执行 |
| `$dispose()` | 清理 Store |

## Setup Store 示例

```typescript
const useCounter = defineStore('counter', () => {
  const count = ref(0);
  const doubleCount = computed(() => count.value * 2);
  function increment() { count.value++; }
  return { count, doubleCount, increment };
});
```
