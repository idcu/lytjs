# @lytjs/router — 路由 API

Lyt.js 路由系统提供完整的客户端路由能力，支持 History 和 Hash 两种模式、动态参数匹配、导航守卫和编程式导航。纯原生零依赖实现。

## 安装与导入

```typescript
import {
  createRouter,
  createRouteMatcher,
  createWebHistory,
  createHashHistory,
  createNavigationGuards,
  runGuards,
  runAfterGuards,
} from '@lytjs/router'
```

---

## createRouter

创建路由实例。整合匹配器、History 和守卫，提供完整的路由功能。

### 签名

```typescript
function createRouter(options: RouterOptions): Router
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `options` | `RouterOptions` | 路由配置选项 |

### RouterOptions

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | `'history' \| 'hash'` | - | 路由模式（必填） |
| `routes` | `RouteRecord[]` | - | 路由配置数组（必填） |
| `base` | `string` | `'/'` | 基础路径（仅 history 模式有效） |

### RouteRecord

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 路由名称（唯一标识） |
| `path` | `string` | 路由路径模式（如 `/user/:id`） |
| `meta` | `Record<string, any>` | 路由元信息 |
| `component` | `any` | 路由组件 |
| `redirect` | `string` | 重定向路径 |
| `children` | `RouteRecord[]` | 子路由 |

### 返回值

`Router` 实例。

### 示例

```typescript
const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/user/:id', name: 'user', component: User },
    { path: '/redirect', redirect: '/' },
    {
      path: '/parent',
      component: Parent,
      children: [
        { path: 'child', component: Child }
      ]
    }
  ],
  base: '/app'
})

// 作为插件安装
app.use(router)
```

---

## Router 实例

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `currentRoute` | `Route` | 当前路由信息 |

### Route

| 属性 | 类型 | 说明 |
|------|------|------|
| `path` | `string` | 路由路径 |
| `fullPath` | `string` | 完整路径 |
| `params` | `Record<string, string>` | 路由参数 |
| `name` | `string` | 路由名称 |
| `meta` | `Record<string, any>` | 路由元信息 |
| `query` | `Record<string, string>` | 查询参数 |
| `hash` | `string` | hash 值 |
| `matched` | `RouteRecord[]` | 匹配到的路由记录 |

### 方法

#### push

导航到新路径（新增历史记录）。

```typescript
router.push(path: string): Promise<void>
```

#### replace

替换当前路径（不新增历史记录）。

```typescript
router.replace(path: string): Promise<void>
```

#### go / back / forward

浏览器历史导航。

```typescript
router.go(n: number): void      // 前进/后退 n 步
router.back(): void              // 后退一步
router.forward(): void           // 前进一步
```

#### beforeEach

注册全局前置守卫。在导航确认前调用。

```typescript
router.beforeEach(guard: NavigationGuard): () => void
```

返回取消注册函数。

#### afterEach

注册全局后置守卫。在导航完成后调用。

```typescript
router.afterEach(guard: (to: Route, from: Route) => void): () => void
```

#### beforeResolve

注册全局解析守卫。在导航确认后、组件渲染前调用。

```typescript
router.beforeResolve(guard: NavigationGuard): () => void
```

#### addRoute / removeRoute / getRoutes

动态路由管理。

```typescript
router.addRoute(route: RouteRecord): void       // 动态添加路由
router.removeRoute(name: string): void          // 按名称移除路由
router.getRoutes(): RouteRecord[]                // 获取所有路由记录
```

#### install

插件安装方法。通过 `app.use(router)` 自动调用。

```typescript
router.install(app: any): void
```

#### destroy

销毁路由实例，清理 History 监听。

```typescript
router.destroy(): void
```

---

## 导航守卫

### NavigationGuard

```typescript
type NavigationGuard = (
  to: NavigationTarget,
  from: NavigationTarget,
  next: NavigationGuardNext
) => void
```

### NavigationGuardNext

```typescript
type NavigationGuardNext = (location?: string | false | void) => void
```

- `next()` — 确认导航
- `next(false)` — 取消导航
- `next('/path')` — 重定向到指定路径

### 示例

```typescript
// 全局前置守卫
const removeGuard = router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

// 移除守卫
removeGuard()

// 全局后置守卫
router.afterEach((to, from) => {
  console.log(`从 ${from.path} 导航到 ${to.path}`)
})
```

---

## createWebHistory

创建 HTML5 History 模式的 History 实例。

### 签名

```typescript
function createWebHistory(base?: string): RouterHistory
```

### RouterHistory

| 属性/方法 | 说明 |
|-----------|------|
| `base` | 基础路径 |
| `location` | 当前位置信息 |
| `push(path, state?)` | 导航到新路径 |
| `replace(path, state?)` | 替换当前路径 |
| `go(n)` | 前进/后退 n 步 |
| `back()` | 后退一步 |
| `forward()` | 前进一步 |
| `listen(callback)` | 监听 URL 变化 |
| `destroy()` | 销毁 History 实例 |

---

## createHashHistory

创建 Hash 模式的 History 实例。

### 签名

```typescript
function createHashHistory(): RouterHistory
```

---

## createRouteMatcher

创建路由匹配器。自研正则路径匹配引擎，支持动态参数（`:param`）和通配符（`*`）。

### 签名

```typescript
function createRouteMatcher(routes: RouteRecord[]): RouteMatcher
```

### RouteMatcher

```typescript
interface RouteMatcher {
  matchRoute(path: string): RouteMatchResult | null
  addRoute(route: RouteRecord): void
  removeRoute(name: string): void
  getRoutes(): RouteRecord[]
}
```

### RouteMatchResult

```typescript
interface RouteMatchResult {
  record: RouteRecord
  params: Record<string, string>
  matchedPath: string
}
```

---

## RouterLocation

```typescript
interface RouterLocation {
  path: string              // 当前路径
  fullPath: string          // 完整 URL（含 hash）
  query: Record<string, string>  // URL 查询参数
  hash: string              // URL hash 值（不含 #）
  state: any                // 路由状态
  fromPopState: boolean     // 是否来自浏览器前进/后退
}
```
