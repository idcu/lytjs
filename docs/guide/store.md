# 状态管理

Lyt.js 内置轻量级状态管理（Store），API 风格参考 Pinia，简洁易用。

## 创建 Store

```ts
import { createStore } from '@lytjs/store'

const useCounterStore = createStore('counter', {
  // 初始状态
  state: {
    count: 0,
    history: [] as number[]
  },

  // 计算属性
  getters: {
    doubleCount: (state) => state.count * 2,
    isPositive: (state) => state.count > 0
  },

  // 操作方法
  actions: {
    increment() {
      this.state.count++
      this.state.history.push(this.state.count)
    },
    decrement() {
      this.state.count--
      this.state.history.push(this.state.count)
    }
  }
})
```

## 在组件中使用

### 选项式 API

```ts
import { defineComponent } from '@lytjs/component'
import { useCounterStore } from './stores/counter'

const Counter = defineComponent({
  init() {
    this.counterStore = useCounterStore()
  },
  methods: {
    increment() {
      this.counterStore.actions.increment()
    }
  },
  template: `
    <div>
      <p>计数: {{ counterStore.state.count }}</p>
      <p>双倍: {{ counterStore.getters.doubleCount }}</p>
      <button @click="increment">+1</button>
    </div>
  `
})
```

### 组合式 API

```ts
import { defineComponent, onMounted } from '@lytjs/component'
import { useCounterStore } from './stores/counter'

const Counter = defineComponent({
  setup() {
    const store = useCounterStore()

    onMounted(() => {
      // 订阅状态变化
      const unsubscribe = store.$subscribe((mutation, state) => {
        console.log('状态变化:', mutation.type, mutation.key)
      })
    })

    return { store }
  },

  template: `
    <div>
      <p>计数: {{ store.state.count }}</p>
      <button @click="store.actions.increment()">+1</button>
    </div>
  `
})
```

## Store API

### $patch()

批量更新状态：

```ts
const store = useCounterStore()

// 对象合并
store.$patch({ count: 10, history: [] })

// 函数式更新
store.$patch((state) => {
  state.count++
  state.history.push(state.count)
})
```

### $reset()

重置状态到初始值：

```ts
store.$reset()
```

### $subscribe()

订阅状态变化：

```ts
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log(mutation.storeId)  // Store ID
  console.log(mutation.type)     // 'set' | 'delete' | 'add' | 'direct'
  console.log(mutation.key)      // 变化的键名
  console.log(mutation.newValue) // 新值
  console.log(mutation.oldValue) // 旧值
})

// 取消订阅
unsubscribe()
```

## 插件

通过插件扩展 Store 功能：

```ts
import { createStore } from '@lytjs/store'

// 日志插件
const loggerPlugin = {
  install(store) {
    store.$subscribe((mutation, state) => {
      console.log(`[${mutation.storeId}] ${mutation.type}: ${mutation.key}`)
    })
  }
}

// 持久化插件
const persistencePlugin = {
  install(store) {
    const saved = localStorage.getItem(store.$id)
    if (saved) {
      store.$patch(JSON.parse(saved))
    }

    store.$subscribe((mutation, state) => {
      localStorage.setItem(store.$id, JSON.stringify(state))
    })
  }
}

const store = createStore('app', {
  state: { /* ... */ }
}, [loggerPlugin, persistencePlugin])
```

## 工具函数

```ts
import { getStore, getStoreIds, clearAllStores } from '@lytjs/store'

getStore('counter')     // 获取已创建的 Store
getStoreIds()           // 获取所有 Store ID
clearAllStores()        // 清除所有 Store
```
