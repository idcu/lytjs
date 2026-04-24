# 路由 API

Lyt.js 路由系统提供完整的前端路由功能，支持 HTML5 History 和 Hash 模式，以及导航守卫、动态路由等高级特性。

## 路由创建

### createRouter()

创建路由实例。

```ts
function createRouter(options: RouterOptions): Router
```

| 选项 | 类型 | 说明 |
|------|------|------|
| mode | `'history' \| 'hash'` | 路由模式 |
| routes | `RouteRecord[]` | 路由配置数组 |
| base | `string` | 基础路径（仅 history 模式有效） |

**使用场景：**
- 初始化应用的路由系统
- 配置应用的导航结构
- 集成到 Lyt.js 应用中

**示例：**
```ts
import { createRouter, createWebHistory, createHashHistory } from '@lytjs/router'
import Home from './views/Home.vue'
import User from './views/User.vue'

// 创建路由实例
const router = createRouter({
  // 选择路由模式
  mode: 'history', // 或 'hash'
  // 基础路径（可选）
  base: '/app',
  // 路由配置
  routes: [
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
      meta: { title: '用户详情' }
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('./views/About.vue'), // 懒加载
      meta: { title: '关于我们' }
    },
    {
      path: '/404',
      name: 'not-found',
      component: () => import('./views/NotFound.vue'),
      meta: { title: '页面不存在' }
    },
    {
      path: '*', // 通配符路由，匹配所有未匹配的路径
      redirect: '/404'
    }
  ]
})

// 注册到应用
app.use(router)
```

## 路由配置

### RouteRecord

路由记录配置。

```ts
interface RouteRecord {
  name?: string;           // 路由名称
  path: string;            // 路由路径
  component?: any;         // 路由组件
  redirect?: string;       // 重定向路径
  children?: RouteRecord[]; // 子路由
  meta?: Record<string, any>; // 元信息
}
```

**路径模式支持：**
- 静态路径：`/about`
- 动态参数：`/user/:id`
- 通配符：`/files/*`

**示例：**
```ts
const routes: RouteRecord[] = [
  // 基础路由
  {
    path: '/',
    component: Layout,
    children: [
      // 嵌套路由
      {
        path: '',
        name: 'dashboard',
        component: Dashboard
      },
      {
        path: 'settings',
        name: 'settings',
        component: Settings
      }
    ]
  },
  // 带参数的路由
  {
    path: '/product/:id',
    name: 'product',
    component: Product
  },
  // 重定向
  {
    path: '/old-path',
    redirect: '/new-path'
  }
]
```

## 导航方法

### push()

导航到新路径，会在历史记录中添加新条目。

```ts
function push(path: string): Promise<void>
```

**示例：**
```ts
// 字符串路径
router.push('/home')

// 带参数的路径
router.push('/user/123')

// 带查询参数
router.push('/search?q=lytjs')
```

### replace()

导航到新路径，替换当前历史记录条目。

```ts
function replace(path: string): Promise<void>
```

**示例：**
```ts
// 登录后替换为首页，避免用户点击后退回到登录页
router.replace('/home')
```

### go()

前进或后退指定步数。

```ts
function go(n: number): void
```

**示例：**
```ts
// 前进 1 步
router.go(1)

// 后退 2 步
router.go(-2)
```

### back()

后退一步。

```ts
function back(): void
```

**示例：**
```ts
router.back()
```

### forward()

前进一步。

```ts
function forward(): void
```

**示例：**
```ts
router.forward()
```

## 导航守卫

### beforeEach()

全局前置守卫，在导航确认前执行。

```ts
function beforeEach(guard: NavigationGuard): () => void
```

**示例：**
```ts
// 登录验证
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth
  const isLoggedIn = localStorage.getItem('token')
  
  if (requiresAuth && !isLoggedIn) {
    // 未登录，重定向到登录页
    next('/login')
  } else {
    // 已登录或不需要验证，继续导航
    next()
  }
})

// 页面标题设置
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Lyt.js App'
  next()
})
```

### beforeResolve()

全局解析守卫，在导航确认后、组件渲染前执行。

```ts
function beforeResolve(guard: NavigationGuard): () => void
```

**示例：**
```ts
// 数据预加载
router.beforeResolve(async (to, from, next) => {
  if (to.meta.preloadData) {
    try {
      await to.meta.preloadData()
      next()
    } catch (error) {
      next('/error')
    }
  } else {
    next()
  }
})
```

### afterEach()

全局后置守卫，在导航完成后执行。

```ts
function afterEach(guard: (to: Route, from: Route) => void): () => void
```

**示例：**
```ts
// 页面访问日志
router.afterEach((to, from) => {
  console.log(`访问了页面: ${to.path}，从 ${from.path} 来`)
  // 可以在这里发送统计数据
})

// 滚动到顶部
router.afterEach(() => {
  window.scrollTo(0, 0)
})
```

## 路由状态管理

### currentRoute

当前路由信息（响应式 Ref）。

```ts
const currentRoute: Ref<Route>
```

**Route 接口：**
```ts
interface Route {
  path: string;          // 路由路径
  fullPath: string;      // 完整路径
  params: Record<string, string>; // 路由参数
  name?: string;         // 路由名称
  meta?: Record<string, any>; // 路由元信息
  query: Record<string, string>; // 查询参数
  hash: string;          // hash 值
  matched: RouteRecord[]; // 匹配到的路由记录
}
```

**示例：**
```ts
import { computed } from '@lytjs/core'

// 在组件中使用
const route = computed(() => router.currentRoute.value)

// 访问路由参数
const userId = computed(() => route.value.params.id)

// 访问查询参数
const searchQuery = computed(() => route.value.query.q)
```

## 动态路由管理

### addRoute()

动态添加路由。

```ts
function addRoute(route: RouteRecord): void
```

**示例：**
```ts
// 动态添加路由
router.addRoute({
  path: '/dynamic',
  name: 'dynamic',
  component: () => import('./Dynamic.vue')
})

// 添加嵌套路由
router.addRoute('parent', {
  path: 'child',
  component: ChildComponent
})
```

### removeRoute()

按名称移除路由。

```ts
function removeRoute(name: string): void
```

**示例：**
```ts
// 移除路由
router.removeRoute('dynamic')
```

### getRoutes()

获取所有路由记录。

```ts
function getRoutes(): RouteRecord[]
```

**示例：**
```ts
// 获取所有路由
const routes = router.getRoutes()
console.log('所有路由:', routes)
```

## History 模式

### createWebHistory()

创建 HTML5 History 模式的历史管理实例。

```ts
function createWebHistory(base?: string): RouterHistory
```

**示例：**
```ts
const router = createRouter({
  mode: 'history',
  base: '/app', // 可选
  routes: [...]
})
```

### createHashHistory()

创建 Hash 模式的历史管理实例。

```ts
function createHashHistory(): RouterHistory
```

**示例：**
```ts
const router = createRouter({
  mode: 'hash',
  routes: [...]
})
```

## 路由参数

### 动态参数

通过 `:param` 定义动态参数。

**示例：**
```ts
// 路由配置
const routes = [
  {
    path: '/user/:id',
    component: UserComponent
  }
]

// 访问路由
router.push('/user/123')

// 在组件中获取参数
const userId = computed(() => router.currentRoute.value.params.id) // '123'
```

### 查询参数

通过 `?key=value` 传递查询参数。

**示例：**
```ts
// 访问路由
router.push('/search?q=lytjs&category=framework')

// 在组件中获取查询参数
const searchQuery = computed(() => router.currentRoute.value.query.q) // 'lytjs'
const category = computed(() => router.currentRoute.value.query.category) // 'framework'
```

## 路由元信息

通过 `meta` 字段添加自定义元信息。

**示例：**
```ts
const routes = [
  {
    path: '/admin',
    component: AdminComponent,
    meta: {
      requiresAuth: true,
      roles: ['admin'],
      title: '管理后台'
    }
  }
]

// 在守卫中使用元信息
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    // 验证权限
  }
  next()
})
```

## 路由懒加载

使用动态导入实现路由组件的懒加载。

**示例：**
```ts
const routes = [
  {
    path: '/home',
    component: () => import('./views/Home.vue')
  },
  {
    path: '/about',
    component: () => import('./views/About.vue')
  }
]
```

## 导航守卫执行顺序

1. **beforeEach** - 全局前置守卫
2. **beforeResolve** - 全局解析守卫
3. 组件渲染
4. **afterEach** - 全局后置守卫

## 路由最佳实践

### 1. 路由配置组织

- **模块化路由**：按功能模块拆分路由配置
- **嵌套路由**：使用嵌套路由组织页面结构
- **路由守卫**：集中处理权限验证和页面标题

### 2. 性能优化

- **懒加载**：对大型组件使用动态导入
- **路由缓存**：结合 KeepAlive 缓存组件
- **预加载**：在路由守卫中预加载数据

### 3. 错误处理

- **404 页面**：配置通配符路由处理未匹配路径
- **导航错误**：在守卫中捕获和处理错误
- **重定向**：合理使用重定向处理旧路径

### 4. 安全性

- **权限验证**：在前置守卫中验证用户权限
- **参数校验**：对路由参数进行验证
- **XSS 防护**：处理路由参数时注意安全

## 完整示例

### 基本路由配置

```ts
import { createApp } from '@lytjs/core'
import { createRouter, createWebHistory } from '@lytjs/router'
import App from './App.vue'

// 路由组件
const Home = {
  template: '<div>首页</div>'
}

const User = {
  template: '<div>用户详情: {{ $route.params.id }}</div>'
}

const About = {
  template: '<div>关于我们</div>'
}

const NotFound = {
  template: '<div>404 页面不存在</div>'
}

// 创建路由
const router = createRouter({
  mode: 'history',
  routes: [
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
      meta: { title: '用户详情' }
    },
    {
      path: '/about',
      name: 'about',
      component: About,
      meta: { title: '关于我们' }
    },
    {
      path: '/404',
      name: 'not-found',
      component: NotFound,
      meta: { title: '页面不存在' }
    },
    {
      path: '*',
      redirect: '/404'
    }
  ]
})

// 导航守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || 'Lyt.js App'
  next()
})

// 创建应用
const app = createApp(App)
app.use(router)
app.mount('#app')
```

### 带权限验证的路由

```ts
// 路由配置
const routes = [
  {
    path: '/',
    component: Home
  },
  {
    path: '/login',
    component: Login
  },
  {
    path: '/admin',
    component: Admin,
    meta: {
      requiresAuth: true,
      roles: ['admin']
    }
  },
  {
    path: '/user',
    component: User,
    meta: {
      requiresAuth: true
    }
  }
]

// 权限验证守卫
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  
  if (requiresAuth) {
    if (!user) {
      // 未登录，重定向到登录页
      next('/login')
    } else if (to.meta.roles && !to.meta.roles.includes(user.role)) {
      // 权限不足，重定向到首页
      next('/')
    } else {
      // 验证通过
      next()
    }
  } else {
    next()
  }
})
```

## 总结

Lyt.js 路由系统提供了完整的前端路由功能，包括：

- **多种模式**：支持 HTML5 History 和 Hash 模式
- **灵活配置**：支持静态路径、动态参数、通配符
- **导航守卫**：提供全局前置、解析、后置守卫
- **动态路由**：支持运行时添加和移除路由
- **响应式**：基于 @lytjs/reactivity 实现响应式路由状态
- **懒加载**：支持路由组件的动态导入

通过合理配置和使用路由系统，你可以构建出结构清晰、用户体验良好的单页应用。路由系统的核心优势在于：

- **模块化**：将应用按功能模块组织
- **可维护性**：集中管理导航逻辑
- **性能优化**：支持懒加载和数据预加载
- **用户体验**：提供流畅的页面切换体验

掌握路由 API 是构建现代前端应用的重要技能，它将帮助你创建更加专业、高效的单页应用。