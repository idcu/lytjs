# @lytjs/store — Store API

Lyt.js 状态管理提供轻量级的状态管理方案，支持响应式状态、计算属性、操作方法和状态订阅。API 风格参考 Pinia，纯原生零依赖实现。

## 安装与导入

```typescript
import {
  createStore,
  getStore,
  getStoreIds,
} from '@lytjs/store'
```

---

## createStore

创建 Store。返回一个工厂函数，调用时返回同一个 Store 实例。

### 签名

```typescript
function createStore<S extends Record<string, any> = Record<string, any>>(
  id: string,
  options?: StoreOptions<S>
): () => StoreApi<S>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | Store 唯一标识 |
| `options` | `StoreOptions` | Store 配置选项 |

### StoreOptions

| 属性 | 类型 | 说明 |
|------|------|------|
| `state` | `S \| (() => S)` | 初始状态（对象或工厂函数） |
| `getters` | `Record<string, (state: S) => any>` | 计算属性（getter 函数集合） |
| `actions` | `Record<string, (this: StoreApi<S>, ...args: any[]) => any>` | 操作方法 |

### 返回值

工厂函数 `() => StoreApi<S>`，调用时返回 Store 实例。同一个 ID 只会创建一个实例。

### 示例

```typescript
// 定义 Store
const useCounterStore = createStore('counter', {
  state: () => ({
    count: 0,
    name: 'lyt',
  }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.state.count++
    },
    async fetchData() {
      const data = await fetch('/api')
      this.state.name = data.name
    },
  },
})

// 使用 Store
const store = useCounterStore()
console.log(store.state.count)         // 0
console.log(store.getters.doubleCount)  // 0
store.actions.increment()
console.log(store.state.count)         // 1
console.log(store.getters.doubleCount)  // 2
```

---

## StoreApi

Store 实例的公共 API。

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `$id` | `string` | Store 唯一标识 |
| `state` | `S` | 响应式状态 |
| `getters` | `Record<string, any>` | 计算属性 |
| `actions` | `Record<string, Function>` | 操作方法 |

### 方法

#### use()

在组件中使用 Store，返回 state 和 getters。

```typescript
store.use(): { state: S; getters: Record<string, any> }
```

#### $reset()

重置状态到初始值。新增的键会被删除。

```typescript
store.$reset(): void
```

#### $subscribe()

订阅状态变化。

```typescript
store.$subscribe(callback: SubscriptionCallback): () => void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `callback` | `SubscriptionCallback` | 订阅回调 |

**返回值：** 取消订阅的函数。

**SubscriptionCallback：**

```typescript
type SubscriptionCallback = (
  mutation: SubscriptionCallbackArgument,
  state: any
) => void
```

**SubscriptionCallbackArgument：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `storeId` | `string` | Store ID |
| `type` | `'set' \| 'delete' \| 'add' \| 'direct'` | 事件类型 |
| `key` | `string` | 变化的键名 |
| `newValue` | `any` | 新值 |
| `oldValue` | `any` | 旧值 |

#### $dispose()

销毁 Store。清空订阅列表，从注册表中移除。

```typescript
store.$dispose(): void
```

#### $patch()

批量更新状态。将 partial 中的属性合并到当前状态中。

```typescript
store.$patch(partial: Partial<S>): void
```

### 完整示例

```typescript
const useTodoStore = createStore('todos', {
  state: () => ({
    todos: [],
    filter: 'all'
  }),
  getters: {
    filteredTodos: (state) => {
      if (state.filter === 'done') return state.todos.filter(t => t.done)
      if (state.filter === 'active') return state.todos.filter(t => !t.done)
      return state.todos
    },
    count: (state) => state.todos.length,
  },
  actions: {
    addTodo(text) {
      this.state.todos.push({ text, done: false })
    },
    removeTodo(index) {
      this.state.todos.splice(index, 1)
    },
    toggleTodo(index) {
      this.state.todos[index].done = !this.state.todos[index].done
    }
  }
})

const store = useTodoStore()

// 使用
store.actions.addTodo('Learn Lyt.js')
console.log(store.getters.count)  // 1

// 订阅
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log(`${mutation.type}: ${mutation.key}`)
})

// 批量更新
store.$patch({ filter: 'done' })

// 重置
store.$reset()

// 取消订阅
unsubscribe()

// 销毁
store.$dispose()
```

---

## getStore

获取已注册的 Store 实例。

### 签名

```typescript
function getStore<S extends Record<string, any> = Record<string, any>>(
  id: string
): StoreApi<S> | undefined
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | Store ID |

### 返回值

Store 实例或 `undefined`（如果不存在）。

### 示例

```typescript
const counterStore = getStore('counter')
if (counterStore) {
  console.log(counterStore.state.count)
}
```

---

## getStoreIds

获取所有已注册的 Store ID 列表。

### 签名

```typescript
function getStoreIds(): string[]
```

### 返回值

Store ID 数组。

### 示例

```typescript
const ids = getStoreIds()
console.log(ids)  // ['counter', 'todos', 'user']
```
