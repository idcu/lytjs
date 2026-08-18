# @lytjs/router

> LytJS 声明式路由系统，支持嵌套路由、导航守卫和多种历史模式。

[![npm version](https://img.shields.io/npm/v/@lytjs/router.svg)](https://www.npmjs.com/package/@lytjs/router)
[![license](https://img.shields.io/npm/l/@lytjs/router.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/router` 是 LytJS 框架的官方路由管理器，提供声明式的路由配置、嵌套路由、路由懒加载、导航守卫等功能。它受到 Vue Router 的启发，但专为 LytJS 的响应式系统设计。

### 核心特性

- **声明式路由配置**：使用 JSON 风格的路由配置
- **嵌套路由**：支持多层级嵌套的路由结构
- **导航守卫**：提供完整的导航生命周期钩子
- **多种历史模式**：支持 Web History、Hash 模式和 Memory 模式
- **类型安全**：完整的 TypeScript 类型支持
- **路由懒加载**：支持组件和路由的按需加载
- **滚动行为控制**：细粒度的页面滚动位置管理

## 安装

```bash
npm install @lytjs/router
```

或使用 pnpm：

```bash
pnpm add @lytjs/router
```

## 依赖关系

`@lytjs/router` 依赖以下 LytJS 核心包：

- `@lytjs/reactivity` - 响应式系统
- `@lytjs/component` - 组件系统
- `@lytjs/vdom` - 虚拟 DOM
- `@lytjs/common-is` - 工具函数
- `@lytjs/common-env` - 环境检测

## 快速开始

### 创建路由器

```typescript
import { createRouter, createWebHistory } from '@lytjs/router';
import Home from './pages/Home';
import About from './pages/About';
import UserProfile from './pages/UserProfile';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/about',
      name: 'about',
      component: About,
    },
    {
      path: '/user/:id',
      name: 'user-profile',
      component: UserProfile,
      props: true,
    },
  ],
});

export default router;
```

### 在应用中使用

```typescript
import { mount } from '@lytjs/vdom';
import App from './App';
import router from './router';

const app = mount(document.getElementById('app'), App, {
  router,
});
```

### 路由配置示例

```typescript
import { createRouter, createWebHistory } from '@lytjs/router';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import UserList from './pages/UserList';
import UserDetail from './pages/UserDetail';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: Dashboard,
        },
        {
          path: 'settings',
          name: 'settings',
          component: Settings,
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: '/users',
      component: UserList,
      children: [
        {
          path: ':id',
          name: 'user-detail',
          component: UserDetail,
          props: (route) => ({ id: route.params.id }),
        },
      ],
    },
  ],
});
```

## 主要 API

### 路由器创建

#### `createRouter(options)`

创建路由器实例。

```typescript
import { createRouter } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [],
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});
```

**选项说明：**

| 选项             | 类型                   | 描述                   |
| ---------------- | ---------------------- | ---------------------- |
| `history`        | `RouterHistory`        | 历史模式实例           |
| `routes`         | `RouteRecordRaw[]`     | 路由配置数组           |
| `scrollBehavior` | `RouterScrollBehavior` | 滚动行为函数           |
| `parseQuery`     | `Function`             | 自定义查询字符串解析   |
| `stringifyQuery` | `Function`             | 自定义查询字符串序列化 |

#### `createWebHistory(base?)`

创建 HTML5 History 模式。

```typescript
import { createWebHistory } from '@lytjs/router';

const history = createWebHistory('/app');
```

#### `createWebHashHistory(base?)`

创建 Hash 模式路由。

```typescript
import { createWebHashHistory } from '@lytjs/router';

const history = createWebHashHistory('/app');
```

#### `createMemoryHistory(base?)`

创建 Memory 模式路由（适用于 SSR）。

```typescript
import { createMemoryHistory } from '@lytjs/router';

const history = createMemoryHistory();
```

### 路由守卫

```typescript
import { createRouter } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [],
});

router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  return true;
});

router.afterEach((to, from) => {
  document.title = to.meta.title || 'LytJS App';
});
```

### 组合式函数

#### `useRouter()`

获取路由器实例。

```typescript
import { useRouter } from '@lytjs/router';

export function useUserProfile() {
  const router = useRouter();

  function goToSettings() {
    router.push({ name: 'settings' });
  }

  function goBack() {
    router.back();
  }

  return { goToSettings, goBack };
}
```

#### `useRoute()`

获取当前路由信息。

```typescript
import { useRoute } from '@lytjs/router';

export function UserProfile() {
  const route = useRoute();

  return () => (
    <div>
      <h1>用户 ID: {route.params.id}</h1>
      <p>当前路径: {route.path}</p>
      <p>查询参数: {JSON.stringify(route.query)}</p>
    </div>
  );
}
```

#### `useLink(options)`

创建链接点击处理器。

```typescript
import { useLink } from '@lytjs/router';

export function NavLink({ to, children }) {
  const { navigate, isActive, href } = useLink({ to });

  return () => (
    <a
      href={href}
      class={isActive.value ? 'active' : ''}
      onClick={(e) => {
        e.preventDefault();
        navigate();
      }}
    >
      {children}
    </a>
  );
}
```

### 组件

#### `<RouterView>`

路由视图组件。

```typescript
import { RouterView } from '@lytjs/router';

export function AppLayout() {
  return () => (
    <div class="layout">
      <nav>
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/about">关于</RouterLink>
      </nav>
      <main>
        <RouterView />
      </main>
    </div>
  );
}
```

#### `<RouterLink>`

声明式导航链接。

```typescript
import { RouterLink } from '@lytjs/router';

export function Navigation() {
  return () => (
    <nav>
      <RouterLink to="/" active-class="active">首页</RouterLink>
      <RouterLink to="/about" active-class="active">关于</RouterLink>
      <RouterLink to="/user/123" active-class="active">用户</RouterLink>
    </nav>
  );
}
```

### 导航方法

```typescript
import { useRouter } from '@lytjs/router';

const router = useRouter();

// 编程式导航
router.push('/home');
router.push({ name: 'user-profile', params: { id: '123' } });
router.push({ path: '/search', query: { q: 'keyword' } });

// 替换当前记录
router.replace('/dashboard');

// 前进/后退
router.back();
router.forward();
router.go(-1);

// 全屏导航
router.push('/full-page', { replace: false, force: true });
```

## 类型定义

### 路由记录

```typescript
interface RouteRecordRaw {
  path: string;
  name?: RouteRecordName;
  component?: any;
  components?: Record<string, any>;
  redirect?: RouteLocationRaw;
  props?: boolean | object | Function;
  meta?: RouteMeta;
  children?: RouteRecordRaw[];
  beforeEnter?: NavigationGuard;
}
```

### 导航守卫

```typescript
type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) => NavigationGuardReturn;

type NavigationGuardReturn =
  | void
  | boolean
  | string
  | { name: string; params?: object; query?: object };
```

## 高级用法

### 路由懒加载

```typescript
import { createRouter } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/dashboard',
      component: () => import('./pages/Dashboard'),
    },
    {
      path: '/settings',
      component: () => import('./pages/Settings'),
      meta: { requiresAuth: true },
    },
  ],
});
```

### 滚动行为

```typescript
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return { el: to.hash };
    }
    return { top: 0, behavior: 'smooth' };
  },
});
```

### 路由元信息

```typescript
interface RouteMeta {
  requiresAuth?: boolean;
  title?: string;
  icon?: string;
  roles?: string[];
}

const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [{ path: 'users', component: UserManagement, meta: { title: '用户管理' } }],
  },
];
```

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
