# Router 路由

@lytjs/router 是 LytJS 官方路由管理器，灵感来自 Vue Router。

## 安装

```bash
pnpm add @lytjs/router
```

## 基础用法

### 创建路由实例

```typescript
import { createRouter, createWebHistory } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/user/:id', component: User },
  ]
});
```

### 路由配置

```typescript
interface RouteConfig {
  path: string;
  name?: string;
  component: Component;
  children?: RouteConfig[];
  redirect?: string;
  meta?: Record<string, any>;
  beforeEnter?: NavigationGuard;
}
```

### 导航守卫

```typescript
// 全局前置守卫
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return '/login';
  }
});

// 全局后置守卫
router.afterEach((to, from) => {
  console.log('导航完成:', to.path);
});
```

## API

- `createRouter(options)` - 创建路由实例
- `router.push(location)` - 编程式导航
- `router.replace(location)` - 替换当前路由
- `router.back()` - 返回上一页
- `router.beforeEach(guard)` - 注册前置守卫
- `router.afterEach(guard)` - 注册后置守卫

## 完整示例

查看 [Todo App 示例](/examples/todo) 了解完整用法。
