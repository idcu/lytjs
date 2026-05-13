# Store 状态管理

@lytjs/store 是 LytJS 官方状态管理库，灵感来自 Pinia。

## 安装

```bash
pnpm add @lytjs/store
```

## 基础用法

### 创建 Store

```typescript
import { createPinia, defineStore } from '@lytjs/store';

// 创建 Pinia 实例
const pinia = createPinia();

// 定义 Store
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
  
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  
  actions: {
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    },
  },
});
```

### 使用 Store

```typescript
const counter = useCounterStore(pinia);

// 访问状态
console.log(counter.count);

// 调用 action
counter.increment();

// 订阅状态变化
counter.$subscribe((mutation, state) => {
  console.log('State changed:', state);
});
```

## Setup 语法

```typescript
const useCounterStore = defineStore('counter', () => {
  const count = signal(0);
  const doubleCount = computed(() => count() * 2);
  
  function increment() {
    count.set(count() + 1);
  }
  
  return { count, doubleCount, increment };
});
```

## API

- `createPinia()` - 创建 Pinia 实例
- `defineStore(id, options)` - 定义 Store
- `store.$patch(partial)` - 批量更新状态
- `store.$reset()` - 重置状态
- `store.$subscribe(callback)` - 订阅状态变化
- `store.$onAction(callback)` - 监听 action 调用

## 完整示例

查看 [Counter 示例](/examples/counter) 了解完整用法。
