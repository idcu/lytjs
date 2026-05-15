# @lytjs/store API 参考

## 安装

```bash
pnpm add @lytjs/store
```

## 基础用法

### Options Store 语法

```typescript
import { defineStore } from '@lytjs/store';

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++;
    },
  },
});
```

### Setup Store 语法

```typescript
import { defineStore } from '@lytjs/store';
import { signal, computed } from '@lytjs/reactivity';

const useCounterStore = defineStore('counter', () => {
  const count = signal(0);
  const doubleCount = computed(() => count.value * 2);

  function increment() {
    count.value++;
  }

  return { count, doubleCount, increment };
});
```

## API

### defineStore(id, options)

创建 Store 定义。

**Options Store 选项：**

- `state` - 返回初始状态的函数
- `getters` - 计算属性
- `actions` - 方法

**Setup Store 选项：**

- 接受返回 Store 属性的 setup 函数

### createPinia()

创建 Pinia 实例。

### storeToRefs(store)

从 Store 中提取 refs，保持响应式。

### useStore()

返回 Store 实例。

## Store 实例

### $id

Store 唯一标识符。

### $state

响应式状态对象。

### $patch(partialOrMutator)

部分更新状态。

```typescript
// 对象语法
store.$patch({ count: 10 });

// 函数语法
store.$patch((state) => {
  state.count++;
});
```

### $reset()

重置状态到初始值。

### $subscribe(callback)

订阅状态变化。

```typescript
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log('类型:', mutation.type);
  console.log('Store ID:', mutation.storeId);
});

// 取消订阅
unsubscribe();
```

### $onAction(callback)

订阅 action 调用。

```typescript
const unsubscribe = store.$onAction((context) => {
  console.log('Action:', context.name);
  console.log('参数:', context.args);

  context.after = (result) => {
    console.log('之后:', result);
  };

  context.onError = (error) => {
    console.error('错误:', error);
  };
});
```

### $dispose()

销毁 Store 并清除订阅。
