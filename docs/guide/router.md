# 路由

Lyt.js 内置轻量级路由系统，支持 History 和 Hash 两种模式。

## 创建路由

```ts
import { createApp } from 'lyt'
import { createRouter, createWebHistory } from 'lyt/router'

const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/user/:id', component: User },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ]
})

const app = createApp(App)
app.mount('#app')
```

::: code-group

```ts [History 模式]
import { createWebHistory } from 'lyt/router'

const router = createRouter({
  mode: 'history',
  routes: [...],
  base: '/app/'  // 可选：基础路径
})
```

```ts [Hash 模式]
import { createHashHistory } from 'lyt/router'

const router = createRouter({
  mode: 'hash',
  routes: [...]
})
```

:::

## 路由配置

### 基本路由

```ts
const routes = [
  { path: '/', component: Home },
  { path: '/about', name: 'about', component: About },
]
```

### 动态路由参数

```ts
const routes = [
  { path: '/user/:id', component: User },
  { path: '/post/:year/:month', component: Post },
]
```

在组件中访问参数：

```ts
// 通过 router.currentRoute 访问
const route = router.currentRoute.value
console.log(route.params.id)    // 路由参数
console.log(route.query.search) // 查询参数
console.log(route.hash)         // hash 值
console.log(route.meta)         // 路由元信息
```

### 路由元信息

```ts
const routes = [
  {
    path: '/admin',
    component: Admin,
    meta: { requiresAuth: true, title: '管理后台' }
  }
]
```

### 嵌套路由

```ts
const routes = [
  {
    path: '/user/:id',
    component: UserLayout,
    children: [
      { path: '', component: UserProfile },
      { path: 'posts', component: UserPosts },
      { path: 'settings', component: UserSettings },
    ]
  }
]
```

## 导航

### 编程式导航

```ts
// 导航到新路径
router.push('/about')
router.push({ path: '/user', query: { id: '1' } })
router.push({ name: 'user', params: { id: '1' } })

// 替换当前路径
router.replace('/login')

// 前进/后退
router.back()
router.forward()
router.go(-2)
```

### 导航守卫

```ts
// 全局前置守卫
const removeGuard = router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login')  // 重定向到登录页
  } else {
    next()  // 放行
  }
})

// 全局后置守卫
router.afterEach((to, from) => {
  document.title = to.meta.title || 'Lyt.js'
})

// 移除守卫
removeGuard()
```

## 懒加载

路由组件支持懒加载，按需加载代码：

```ts
const routes = [
  {
    path: '/admin',
    component: () => import('./views/Admin.js').then(m => m.default)
  },
  {
    path: '/dashboard',
    component: () => import('./views/Dashboard.js').then(m => m.default)
  }
]
```

配合 `defineAsyncComponent` 使用：

```ts
import { defineAsyncComponent } from 'lyt'

const AsyncAdmin = defineAsyncComponent({
  loader: () => import('./views/Admin.js'),
  loadingComponent: Loading,
  errorComponent: ErrorView,
  delay: 200,
  timeout: 10000
})
```

## 路由匹配器

底层使用 `createRouteMatcher` 进行路由匹配：

```ts
import { createRouteMatcher } from 'lyt/router'

const matcher = createRouteMatcher([
  { path: '/user/:id', name: 'user' },
  { path: '/post/:slug', name: 'post' }
])

const result = matcher.match('/user/42')
// { name: 'user', params: { id: '42' }, path: '/user/42' }
```
