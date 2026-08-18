# 路由导航

路由是构建单页应用（SPA）的核心功能之一。LytJS 提供了官方的路由库，让你轻松地实现页面导航和 URL 管理。

## 安装

```bash
pnpm add @lytjs/router
```

## 快速开始

### 基础配置

```typescript
// router/index.ts
import { createRouter, createWebHistory } from '@lytjs/router';
import Home from '@/views/Home.vue';
import About from '@/views/About.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/about',
    name: 'About',
    component: About,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
```

### 在应用中使用

```typescript
// main.ts
import { createApp } from '@lytjs/core';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');
```

### 组件中使用

```vue
<template>
  <div>
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/about">About</RouterLink>
    </nav>

    <RouterView />
  </div>
</template>
```

## 路由定义

### 动态路由

```typescript
const routes = [
  {
    path: '/users/:id',
    name: 'User',
    component: UserView,
  },
  {
    path: '/posts/:id/comments/:commentId',
    name: 'Comment',
    component: CommentView,
  },
];
```

### 路由参数

```typescript
// UserView.vue
import { defineComponent } from '@lytjs/core';
import { useRoute } from '@lytjs/router';

export default defineComponent({
  setup() {
    const route = useRoute();

    console.log(route.params.id); // 访问路由参数
    console.log(route.query); // 访问查询参数

    return {
      userId: route.params.id,
    };
  },

  template: `<div>User ID: {{ userId }}</div>`,
});
```

## 导航方式

### 声明式导航

```vue
<template>
  <div>
    <RouterLink to="/home">Home</RouterLink>
    <RouterLink :to="{ name: 'User', params: { id: 1 } }">User 1</RouterLink>
    <RouterLink :to="{ path: '/about', query: { foo: 'bar' } }">About</RouterLink>
  </div>
</template>
```

### 编程式导航

```typescript
import { defineComponent } from '@lytjs/core';
import { useRouter } from '@lytjs/router';

export default defineComponent({
  setup() {
    const router = useRouter();

    const goHome = () => router.push('/');
    const goToUser = () => router.push({ name: 'User', params: { id: 2 } });
    const goBack = () => router.back();
    const goForward = () => router.forward();

    return {
      goHome,
      goToUser,
      goBack,
      goForward,
    };
  },
});
```

## 嵌套路由

```typescript
const routes = [
  {
    path: '/dashboard',
    component: Dashboard,
    children: [
      {
        path: '', // 默认路由
        component: DashboardHome,
      },
      {
        path: 'profile',
        component: DashboardProfile,
      },
      {
        path: 'settings',
        component: DashboardSettings,
      },
    ],
  },
];
```

## 路由守卫

### 全局前置守卫

```typescript
router.beforeEach((to, from, next) => {
  const isAuthenticated = checkAuth();

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});
```

### 路由独享守卫

```typescript
const routes = [
  {
    path: '/admin',
    component: Admin,
    meta: { requiresAuth: true, requiresAdmin: true },
    beforeEnter: (to, from, next) => {
      if (!isAdmin()) {
        next('/');
      } else {
        next();
      }
    },
  },
];
```

## 路由元信息

```typescript
const routes = [
  {
    path: '/profile',
    component: Profile,
    meta: {
      requiresAuth: true,
      title: 'User Profile',
      breadcrumb: 'Profile',
    },
  },
];

// 使用
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'LytJS App';
  next();
});
```

## 懒加载

```typescript
const routes = [
  {
    path: '/about',
    component: () => import('@/views/About.vue'),
  },
  {
    path: '/admin',
    component: () => import('@/views/Admin.vue'),
    meta: { requiresAuth: true },
  },
];
```

## 路由导航最佳实践

### ✅ 推荐做法

```typescript
// 1. 使用命名路由而不是硬编码路径
router.push({ name: 'User', params: { id: 1 }}) // 好
router.push('/users/1') // 避免，路径变更时需要修改多处

// 2. 合理使用路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = checkAuth()

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath }})
  } else {
    next()
  }
})

// 3. 使用路由元信息管理页面属性
meta: {
  title: 'Page Title',
  requiresAuth: true,
  layout: 'default'
}
```

### ❌ 避免做法

```typescript
// 避免：过度嵌套路由守卫
// 保持路由守卫简单，复杂逻辑抽离成函数

// 避免：在组件内部直接处理所有路由逻辑
// 使用路由守卫和路由元信息集中管理
```

## 下一步

- 学习 [表单处理](./forms.md)
- 查看 [状态管理](./state-management.md)
- 阅读 [架构文档](../development/ARCHITECTURE.md)
