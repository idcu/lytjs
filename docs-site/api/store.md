# 状态管理 API

Lyt.js 内置轻量级状态管理 Store，基于响应式系统实现。

## createStore()

创建一个 Store 实例。

```ts
function createStore<S extends Record<string, any>>(
  id: string,
  options: StoreOptions<S>,
  plugins?: StorePlugin[]
): StoreApi<S>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| id | `string` | Store 唯一标识 |
| options.state | `S \| (() => S)` | 初始状态（对象或工厂函数） |
| options.getters | `Record<string, (state: S) => any>` | 计算属性 |
| options.actions | `Record<string, Function>` | 操作方法 |
| options.modules | `Record<string, ModuleOptions>` | 子模块 |
| plugins | `StorePlugin[]` | 插件列表 |

**返回值：** `StoreApi<S>`

```ts
const useCounterStore = createStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubleCount: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.state.count++
    }
  }
})
```

---

## StoreApi 接口

```ts
interface StoreApi<S extends Record<string, any>> {
  /** Store 唯一标识 */
  $id: string

  /** 响应式状态 */
  state: S

  /** 计算属性 */
  getters: Record<string, any>

  /** 操作方法 */
  actions: Record<string, (...args: any[]) => any>

  /** 获取 state 和 getters */
  $expose(): { state: S; getters: Record<string, any> }

  /** 重置状态到初始值 */
  $reset(): void

  /** 订阅状态变化 */
  $subscribe(callback: SubscriptionCallback): () => void

  /** 销毁 Store */
  $dispose(): void

  /** 批量更新状态 */
  $patch(partialOrFn: Partial<S> | ((state: S) => void)): void
}
```

---

## StoreOptions

```ts
interface StoreOptions<S extends Record<string, any>> {
  state?: S | (() => S)
  getters?: Record<string, (state: S) => any>
  actions?: Record<string, (this: StoreApi<S>, ...args: any[]) => any>
  modules?: Record<string, ModuleOptions>
}
```

---

## ModuleOptions

```ts
interface ModuleOptions {
  state?: Record<string, any> | (() => Record<string, any>)
  getters?: Record<string, (state: any) => any>
  actions?: Record<string, (this: StoreApi, ...args: any[]) => any>
  modules?: Record<string, ModuleOptions>
}
```

子模块支持嵌套定义：

```ts
const store = createStore('app', {
  state: () => ({ user: null }),
  modules: {
    settings: {
      state: () => ({ theme: 'light' }),
      modules: {
        ui: {
          state: () => ({ fontSize: 14 })
        }
      }
    }
  }
})
```

---

## StorePlugin

```ts
interface StorePlugin {
  install: (store: StoreApi) => (() => void) | void
}
```

插件接口，`install` 方法接收 Store 实例，可返回卸载函数。

```ts
const loggerPlugin: StorePlugin = {
  install(store) {
    const unsub = store.$subscribe((mutation) => {
      console.log(`[${store.$id}] ${mutation.type}: ${mutation.key}`)
    })
    return unsub  // 返回卸载函数
  }
}
```

---

## SubscriptionCallback

```ts
type SubscriptionCallback = (
  mutation: SubscriptionCallbackArgument,
  state: any
) => void

interface SubscriptionCallbackArgument {
  storeId: string                          // Store ID
  type: 'set' | 'delete' | 'add' | 'direct'  // 事件类型
  key: string                              // 变化的键名
  newValue?: any                           // 新值
  oldValue?: any                           // 旧值
}
```

---

## 工具函数

### getStore()

```ts
function getStore<S = any>(id: string): StoreApi<S> | undefined
```

获取已创建的 Store 实例。

### getStoreIds()

```ts
function getStoreIds(): string[]
```

获取所有已创建的 Store ID 列表。

### clearAllStores()

```ts
function clearAllStores(): void
```

清除所有已创建的 Store 实例。
