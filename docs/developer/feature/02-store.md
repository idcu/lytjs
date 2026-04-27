# Store 状态管理

Store 提供了一个集中式的状态管理方案。

## 🎯 什么是 Store？

Store 是一个集中式的状态容器，让我们可以在组件间共享状态。

**源代码位置**：`packages/store/src/`

## 📦 基本使用

```typescript
import { createStore } from '@lytjs/store'

const counterStore = createStore('counter', {
  state: {
    count: 0
  },
  getters: {
    double: state => state.count * 2
  },
  actions: {
    increment(state) {
      state.count++
    }
  }
})

app.use(counterStore)
```

## 📚 相关文档

- [响应式系统](../core/01-reactivity.md)
- [路由系统](./01-router.md)
