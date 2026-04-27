# @lytjs/router

Lyt.js 官方路由 - 提供 History / Hash 模式、导航守卫、动态路由等能力。

## 安装

```bash
npm install @lytjs/router

# 或使用 pnpm
pnpm add @lytjs/router
```

## 特性

- 🚀 History / Hash 双模式
- 🔄 完整的导航守卫
- 📦 动态路由匹配
- 🎯 嵌套路由
- 📋 命名路由和命名视图
- 🔌 零运行时依赖

## 快速开始

```javascript
import { createRouter, createWebHistory } from '@lytjs/router';
import { createApp } from '@lytjs/core';
import Home from './views/Home.vue';
import About from './views/About.vue';

// 1. 定义路由
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About }
];

// 2. 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
});

// 3. 创建应用并使用路由
const app = createApp(App);
app.use(router);
app.mount('#app');
```

## API 参考

### 路由创建

| API | 说明 |
|------|------|
| `createRouter(options)` | 创建路由实例 |
| `createWebHistory(base)` | HTML5 History 模式 |
| `createWebHashHistory(base)` | Hash 模式 |
| `createMemoryHistory(base)` | 内存模式（测试用） |

### 组件

| 组件 | 说明 |
|------|------|
| `<router-view>` | 路由视图出口 |
| `<router-link>` | 路由导航链接 |

### 组合式 API

| API | 说明 |
|------|------|
| `useRouter()` | 获取路由实例 |
| `useRoute()` | 获取当前路由信息 |
| `useLink(props)` | 创建导航链接 |

## 路由配置

```javascript
const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { title: '首页' }
  },
  {
    path: '/user/:id',
    name: 'user',
    component: User,
    props: true
  },
  {
    path: '/parent',
    component: Parent,
    children: [
      {
        path: 'child',
        component: Child
      }
    ]
  }
];
```

## 导航守卫

```javascript
// 全局前置守卫
router.beforeEach((to, from) => {
  if (!isAuthenticated && to.path !== '/login') {
    return '/login';
  }
});

// 全局解析守卫
router.beforeResolve(async (to) => {
  // 在导航被确认之前、所有组件内守卫和异步路由组件被解析之后调用
});

// 全局后置钩子
router.afterEach((to, from) => {
  document.title = to.meta.title;
});
```

## 组件内守卫

```javascript
import { onBeforeRouteLeave, onBeforeRouteUpdate } from '@lytjs/router';

onBeforeRouteLeave((to, from) => {
  const answer = window.confirm('确定要离开吗？');
  if (!answer) {
    return false;
  }
});

onBeforeRouteUpdate((to, from) => {
  // 在当前路由改变，但是该组件被复用时调用
  console.log('路由更新了');
});
```

## 路由元信息

```javascript
const routes = [
  {
    path: '/admin',
    component: Admin,
    meta: { requiresAuth: true }
  }
];

router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    };
  }
});
```

## 示例

### 编程式导航

```javascript
import { useRouter } from '@lytjs/router';

const router = useRouter();

// 字符串路径
router.push('/users');

// 带路径的对象
router.push({ path: '/users' });

// 命名的路由
router.push({ name: 'user', params: { id: '123' } });

// 带查询参数，变成 /register?plan=private
router.push({ path: '/register', query: { plan: 'private' } });
```

### 获取路由信息

```javascript
import { useRoute } from '@lytjs/router';

const route = useRoute();

console.log(route.path); // 当前路径
console.log(route.params); // 动态参数
console.log(route.query); // 查询参数
console.log(route.meta); // 元信息
```

### 嵌套路由

```javascript
const routes = [
  {
    path: '/user/:id',
    component: User,
    children: [
      {
        // 当 /user/:id/profile 匹配成功
        // UserProfile 会被渲染在 User 的 <router-view> 中
        path: 'profile',
        component: UserProfile
      },
      {
        // 当 /user/:id/posts 匹配成功
        // UserPosts 会被渲染在 User 的 <router-view> 中
        path: 'posts',
        component: UserPosts
      }
    ]
  }
];
```

### 重定向和别名

```javascript
const routes = [
  // 重定向
  { path: '/home', redirect: '/' },
  { path: '/home', redirect: { name: 'homepage' } },
  
  // 别名
  { path: '/', component: Home, alias: '/home' }
];
```

## 性能

- 体积小，零运行时依赖
- 按需加载路由
- 高效的路径匹配算法

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
