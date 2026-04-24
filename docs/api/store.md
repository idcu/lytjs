# 状态管理 API

Lyt.js 状态管理系统提供轻量级的全局状态管理方案，基于响应式系统实现，支持模块化、计算属性、异步操作等特性。

## Store 创建

### createStore()

创建状态管理 Store。

```ts
function createStore<S extends Record<string, any>>(id: string, options: StoreOptions<S>): () => StoreApi<S>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| id | `string` | Store 唯一标识 |
| options | `StoreOptions` | Store 配置选项 |

**StoreOptions 接口：**
```ts
interface StoreOptions<S> {
  state?: S | (() => S); // 初始状态
  getters?: Record<string, (state: S) => any>; // 计算属性
  actions?: Record<string, (this: StoreApi<S>, ...args: any[]) => any>; // 操作方法
  modules?: Record<string, ModuleOptions>; // 模块化子模块
}
```

**使用场景：**
- 管理全局状态
- 跨组件共享数据
- 处理复杂的业务逻辑
- 集中管理应用状态

**示例：**
```ts
import { createStore } from '@lytjs/store'

// 创建 Store
const useCounterStore = createStore('counter', {
  // 初始状态（推荐使用工厂函数）
  state: () => ({
    count: 0,
    name: 'Lyt.js',
    users: []
  }),
  
  // 计算属性（getters）
  getters: {
    doubleCount: (state) => state.count * 2,
    userCount: (state) => state.users.length
  },
  
  // 操作方法（actions）
  actions: {
    increment() {
      this.state.count++
    },
    
    async fetchUsers() {
      const response = await fetch('/api/users')
      const data = await response.json()
      this.state.users = data
    },
    
    updateName(newName) {
      this.state.name = newName
    }
  }
})

// 使用 Store
const store = useCounterStore()
console.log(store.state.count) // 0
store.actions.increment()
console.log(store.state.count) // 1
console.log(store.getters.doubleCount) // 2
```

## 状态管理

### state

响应式状态对象。

```ts
const state: S
```

**示例：**
```ts
// 访问状态
const store = useCounterStore()
console.log(store.state.count) // 访问状态

// 修改状态（直接修改）
store.state.count = 10

// 修改状态（批量修改）
store.$patch({
  count: 20,
  name: 'Updated'
})

// 修改状态（函数式）
store.$patch((state) => {
  state.count++
  state.users.push({ id: 1, name: 'User' })
})
```

### $patch()

批量更新状态。

```ts
function $patch(partialOrFn: Partial<S> | ((state: S) => void)): void
```

**示例：**
```ts
// 对象合并方式
store.$patch({
  count: 100,
  name: 'New Name'
})

// 函数式方式（适合复杂更新）
store.$patch((state) => {
  // 可以执行任意状态修改
  state.users.forEach(user => {
    user.active = true
  })
  state.count += 10
})
```

### $reset()

重置状态到初始值。

```ts
function $reset(): void
```

**示例：**
```ts
// 重置状态
store.$reset()
console.log(store.state.count) // 恢复到初始值 0
```

## 计算属性

### getters

计算属性对象，基于状态派生的值。

```ts
const getters: Record<string, any>
```

**示例：**
```ts
// 定义计算属性
const useUserStore = createStore('user', {
  state: () => ({
    users: [
      { id: 1, name: 'John', active: true },
      { id: 2, name: 'Jane', active: false }
    ]
  }),
  getters: {
    activeUsers: (state) => state.users.filter(user => user.active),
    activeUserCount: (state) => state.users.filter(user => user.active).length,
    getUserById: (state) => (id) => state.users.find(user => user.id === id)
  }
})

// 使用计算属性
const store = useUserStore()
console.log(store.getters.activeUsers) // 活跃用户列表
console.log(store.getters.activeUserCount) // 活跃用户数量
console.log(store.getters.getUserById(1)) // 获取指定 ID 的用户
```

## 操作方法

### actions

操作方法对象，用于修改状态的函数。

```ts
const actions: Record<string, (...args: any[]) => any>
```

**示例：**
```ts
// 同步操作
const useCounterStore = createStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment(amount = 1) {
      this.state.count += amount
    },
    decrement(amount = 1) {
      this.state.count -= amount
    }
  }
})

// 异步操作
const useApiStore = createStore('api', {
  state: () => ({ data: null, loading: false, error: null }),
  actions: {
    async fetchData(url) {
      try {
        this.state.loading = true
        this.state.error = null
        const response = await fetch(url)
        const data = await response.json()
        this.state.data = data
      } catch (error) {
        this.state.error = error.message
      } finally {
        this.state.loading = false
      }
    }
  }
})

// 调用操作方法
const store = useApiStore()
store.actions.fetchData('/api/data')
```

## 状态订阅

### $subscribe()

订阅状态变化。

```ts
function $subscribe(callback: SubscriptionCallback): () => void
```

**SubscriptionCallback 类型：**
```ts
type SubscriptionCallback = (
  mutation: SubscriptionCallbackArgument,
  state: any
) => void

interface SubscriptionCallbackArgument {
  storeId: string; // Store ID
  type: 'set' | 'delete' | 'add' | 'direct'; // 变化类型
  key: string; // 变化的键名
  newValue?: any; // 新值
  oldValue?: any; // 旧值
}
```

**示例：**
```ts
// 订阅状态变化
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log('状态变化:', {
    type: mutation.type,
    key: mutation.key,
    newValue: mutation.newValue,
    oldValue: mutation.oldValue
  })
  
  // 可以在这里执行副作用，如本地存储
  localStorage.setItem('counter', JSON.stringify(state.count))
})

// 取消订阅
unsubscribe()
```

## 模块化管理

### modules

模块化子模块配置。

**ModuleOptions 接口：**
```ts
interface ModuleOptions {
  state?: Record<string, any> | (() => Record<string, any>);
  getters?: Record<string, (state: any) => any>;
  actions?: Record<string, (this: StoreApi, ...args: any[]) => any>;
  modules?: Record<string, ModuleOptions>;
}
```

**示例：**
```ts
// 模块化 Store
const useRootStore = createStore('root', {
  state: () => ({
    appName: 'My App'
  }),
  
  modules: {
    // 用户模块
    user: {
      state: () => ({
        id: null,
        name: ''
      }),
      getters: {
        isLoggedIn: (state) => state.id !== null
      },
      actions: {
        login(userData) {
          this.state.user.id = userData.id
          this.state.user.name = userData.name
        }
      }
    },
    
    // 产品模块
    product: {
      state: () => ({
        items: []
      }),
      getters: {
        productCount: (state) => state.items.length
      },
      actions: {
        async fetchProducts() {
          const response = await fetch('/api/products')
          const data = await response.json()
          this.state.product.items = data
        }
      }
    }
  }
})

// 使用模块化 Store
const store = useRootStore()

// 访问根状态
console.log(store.state.appName)

// 访问模块状态
console.log(store.state.user.name)
console.log(store.state.product.items)

// 访问模块计算属性（带命名空间前缀）
console.log(store.getters['user/isLoggedIn'])
console.log(store.getters['product/productCount'])

// 调用模块操作方法（带命名空间前缀）
store.actions['user/login']({ id: 1, name: 'John' })
store.actions['product/fetchProducts']()
```

## Action 拦截

### $onAction()

拦截 action 调用。

```ts
function $onAction(callback: (action: { name: string, args: any[] }) => void): () => void
```

**示例：**
```ts
// 拦截 action 调用（用于日志记录）
const unsubscribe = store.$onAction((action) => {
  console.log(`Action 调用: ${action.name}`, action.args)
  
  // 可以在这里执行性能监控、权限检查等
})

// 取消拦截
unsubscribe()
```

## 插件系统

### use()

安装 Store 插件。

```ts
function use(plugin: StorePlugin): () => void
```

**StorePlugin 接口：**
```ts
interface StorePlugin {
  install: (store: StoreApi) => (() => void) | void;
}
```

**示例：**
```ts
// 创建插件
const loggerPlugin = {
  install(store) {
    console.log(`Store ${store.$id} 已安装`)
    
    // 订阅状态变化
    const unsubscribe = store.$subscribe((mutation, state) => {
      console.log(`[${store.$id}] 状态变化:`, mutation)
    })
    
    // 拦截 action 调用
    const unsubscribeAction = store.$onAction((action) => {
      console.log(`[${store.$id}] Action 调用:`, action)
    })
    
    // 返回卸载函数
    return () => {
      unsubscribe()
      unsubscribeAction()
      console.log(`Store ${store.$id} 插件已卸载`)
    }
  }
}

// 安装插件
const store = useCounterStore()
const uninstall = store.use(loggerPlugin)

// 卸载插件
uninstall()
```

## Store 管理

### getStore()

获取已注册的 Store。

```ts
function getStore<S extends Record<string, any>>(id: string): StoreApi<S> | undefined
```

**示例：**
```ts
import { getStore } from '@lytjs/store'

const store = getStore('counter')
if (store) {
  console.log(store.state.count)
}
```

### getStoreIds()

获取所有已注册的 Store ID。

```ts
function getStoreIds(): string[]
```

**示例：**
```ts
import { getStoreIds } from '@lytjs/store'

const storeIds = getStoreIds()
console.log('已注册的 Store:', storeIds)
```

### $dispose()

销毁 Store。

```ts
function $dispose(): void
```

**示例：**
```ts
const store = useCounterStore()
// 使用 Store...
// 销毁 Store
store.$dispose()
```

## 最佳实践

### 1. 状态设计

- **单一数据源**：每个 Store 负责一个领域的状态
- **状态扁平化**：避免深层嵌套的状态结构
- **使用工厂函数**：推荐使用函数返回初始状态
- **不可变性**：虽然支持直接修改，但推荐使用 $patch 进行批量更新

### 2. 计算属性

- **派生状态**：使用计算属性处理派生值
- **缓存**：计算属性会自动缓存，只有依赖变化时才重新计算
- **参数化**：可以创建返回函数的计算属性（如 getUserById）

### 3. 操作方法

- **业务逻辑**：将复杂业务逻辑放在 actions 中
- **异步操作**：处理 API 调用、定时器等异步操作
- **错误处理**：在 actions 中适当处理错误
- **批量更新**：使用 $patch 进行复杂的状态更新

### 4. 模块化

- **按功能划分**：将相关状态和逻辑组织到模块中
- **命名空间**：模块的 getters 和 actions 会自动添加命名空间前缀
- **嵌套模块**：支持多层嵌套的模块结构

### 5. 性能优化

- **按需订阅**：只订阅必要的状态变化
- **合理使用计算属性**：避免在计算属性中执行昂贵操作
- **批量更新**：使用 $patch 减少响应式更新次数
- **销毁 Store**：在不需要时及时销毁 Store 以释放资源

### 6. 安全性

- **状态验证**：在 actions 中验证输入参数
- **权限检查**：在 actions 中进行权限验证
- **敏感数据**：避免在状态中存储敏感信息

## 完整示例

### 基本 Store

```ts
import { createStore } from '@lytjs/store'

// 创建计数器 Store
const useCounterStore = createStore('counter', {
  state: () => ({
    count: 0,
    name: 'Counter'
  }),
  
  getters: {
    doubleCount: (state) => state.count * 2,
    tripleCount: (state) => state.count * 3
  },
  
  actions: {
    increment(amount = 1) {
      this.state.count += amount
    },
    decrement(amount = 1) {
      this.state.count -= amount
    },
    reset() {
      this.$reset()
    }
  }
})

// 使用 Store
const store = useCounterStore()

// 访问状态
console.log(store.state.count) // 0
console.log(store.getters.doubleCount) // 0

// 修改状态
store.actions.increment()
console.log(store.state.count) // 1
console.log(store.getters.doubleCount) // 2

// 订阅状态变化
const unsubscribe = store.$subscribe((mutation) => {
  console.log('状态变化:', mutation)
})

// 批量更新
store.$patch({
  count: 10,
  name: 'Updated Counter'
})

// 重置状态
store.actions.reset()
console.log(store.state.count) // 0

// 取消订阅
unsubscribe()

// 销毁 Store
store.$dispose()
```

### 模块化 Store

```ts
import { createStore } from '@lytjs/store'

// 创建根 Store
const useAppStore = createStore('app', {
  state: () => ({
    version: '1.0.0',
    theme: 'light'
  }),
  
  modules: {
    // 用户模块
    user: {
      state: () => ({
        id: null,
        name: '',
        email: ''
      }),
      getters: {
        isLoggedIn: (state) => state.id !== null,
        userInfo: (state) => ({ id: state.id, name: state.name, email: state.email })
      },
      actions: {
        login(userData) {
          this.state.user.id = userData.id
          this.state.user.name = userData.name
          this.state.user.email = userData.email
        },
        logout() {
          this.$patch((state) => {
            state.user.id = null
            state.user.name = ''
            state.user.email = ''
          })
        }
      }
    },
    
    // 购物车模块
    cart: {
      state: () => ({
        items: [],
        total: 0
      }),
      getters: {
        itemCount: (state) => state.items.length,
        totalPrice: (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },
      actions: {
        addToCart(product, quantity = 1) {
          const existingItem = this.state.cart.items.find(item => item.id === product.id)
          if (existingItem) {
            existingItem.quantity += quantity
          } else {
            this.state.cart.items.push({
              ...product,
              quantity
            })
          }
        },
        removeFromCart(productId) {
          this.state.cart.items = this.state.cart.items.filter(item => item.id !== productId)
        },
        clearCart() {
          this.state.cart.items = []
        }
      }
    }
  }
})

// 使用模块化 Store
const store = useAppStore()

// 访问根状态
console.log(store.state.version)

// 访问模块状态
console.log(store.state.user.name)
console.log(store.state.cart.items)

// 访问模块计算属性
console.log(store.getters['user/isLoggedIn'])
console.log(store.getters['cart/totalPrice'])

// 调用模块操作方法
store.actions['user/login']({ id: 1, name: 'John', email: 'john@example.com' })
store.actions['cart/addToCart']({ id: 1, name: 'Product 1', price: 100 }, 2)

// 批量更新多个模块的状态
store.$patch((state) => {
  state.theme = 'dark'
  state.user.name = 'John Doe'
  state.cart.total = store.getters['cart/totalPrice']
})
```

## 总结

Lyt.js 状态管理系统提供了以下核心特性：

- **响应式**：基于 @lytjs/reactivity 实现响应式状态
- **模块化**：支持多层嵌套的模块结构
- **计算属性**：自动缓存的派生状态
- **异步操作**：支持在 actions 中处理异步逻辑
- **状态订阅**：监听状态变化并执行副作用
- **批量更新**：优化状态更新性能
- **插件系统**：扩展 Store 功能
- **Action 拦截**：监控和控制 action 调用

通过合理使用状态管理系统，你可以：

- **集中管理**：将应用状态集中管理，提高可维护性
- **跨组件共享**：在不同组件间共享状态，避免 props 层层传递
- **复杂逻辑处理**：将复杂业务逻辑封装在 actions 中
- **性能优化**：利用计算属性缓存和批量更新提升性能
- **可扩展性**：通过模块化和插件系统扩展功能

状态管理是现代前端应用的重要组成部分，掌握 Lyt.js 的状态管理 API 将帮助你构建更加健壮、可维护的应用。