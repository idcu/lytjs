# Router 路由系统

路由系统让我们可以通过 URL 来管理应用的不同页面。

## 🎯 什么是路由？

路由将 URL 映射到组件，实现单页应用：

```
/home → Home 组件
/about → About 组件
/user/123 → User 组件，参数 id=123
```

**源代码位置**：`packages/router/src/`

## 📦 基本使用

```typescript
import { createRouter, createWebHistory } from '@lytjs/router'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/user/:id', component: User }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

app.use(router)
```

## 📚 相关文档

- [组件系统](../core/04-component.md)
- [状态管理](./02-store.md)
