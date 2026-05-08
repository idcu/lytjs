# @lytjs/router

> LytJS 声明式路由系统，支持嵌套路由、导航守卫和多种 History 模式。

## 安装

```bash
pnpm add @lytjs/router
```

## 快速开始

```typescript
import { createRouter, createWebHistory } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/users/:id', name: 'user', component: User },
  ],
});

// 在应用中使用
app.use(router);
```

## API

### `createRouter(options)`

创建路由实例。

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.history` | `RouterHistory` | History 实例 |
| `options.routes` | `RouteRecordRaw[]` | 路由配置 |
| `options.scrollBehavior` | `RouterScrollBehavior` | 滚动行为 |
| `options.strict` | `boolean` | 是否严格匹配尾部斜杠 |

**返回值：** `Router`

### `createWebHistory(base?)`

创建 HTML5 History API 路由。

### `createWebHashHistory(base?)`

创建 Hash 路由。

### `createMemoryHistory(initial?)`

创建内存路由（用于 SSR/测试）。

### `useRouter()`

获取当前路由实例（须在 `setup` 中使用）。

### `useRoute()`

获取当前路由信息（须在 `setup` 中使用）。

### `<RouterView>`

路由出口组件，渲染匹配的组件。

### `<RouterLink>`

路由链接组件，渲染为 `<a>` 标签。

## 导航守卫

```typescript
const router = createRouter({ ... });

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 返回 false 取消导航
  // 返回路由对象进行重定向
});

// 全局后置钩子
router.afterEach((to, from) => { });

// 路由独享守卫
const routes = [
  {
    path: '/admin',
    beforeEnter: (to, from, next) => { },
  },
];
```

## 路由配置

```typescript
interface RouteRecordRaw {
  path: string;
  name?: string | symbol;
  component?: Component;
  children?: RouteRecordRaw[];
  redirect?: string | RouteLocationRaw;
  alias?: string | string[];
  meta?: Record<string, unknown>;
  beforeEnter?: NavigationGuard;
  props?: boolean | Record<string, any>;
}
```
