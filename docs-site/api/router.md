# 路由 API

Lyt.js 路由系统提供完整的客户端路由功能，支持 History 和 Hash 两种模式。

## createRouter()

创建路由实例。

```ts
function createRouter(options: RouterOptions): Router
```

| 参数 | 类型 | 说明 |
|------|------|------|
| options.mode | `'history' \| 'hash'` | 路由模式 |
| options.routes | `RouteRecord[]` | 路由配置数组 |
| options.base | `string` | 基础路径（仅 history 模式，默认 `/`） |

**返回值：** `Router`

```ts
import { createRouter, createWebHistory } from 'lyt/router'

const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/about', name: 'about', component: About },
    { path: '/user/:id', name: 'user', component: User, meta: { requiresAuth: true } }
  ],
  base: '/app/'
})
```

---

## Router 接口

```ts
interface Router {
  /** 当前路由信息（响应式 Ref） */
  currentRoute: Ref<Route>

  /** 导航到新路径 */
  push(path: string): Promise<void>

  /** 替换当前路径 */
  replace(path: string): Promise<void>

  /** 前进/后退 n 步 */
  go(n: number): void

  /** 后退一步 */
  back(): void

  /** 前进一步 */
  forward(): void

  /** 注册全局前置守卫 */
  beforeEach(guard: NavigationGuard): () => void

  /** 注册全局后置守卫 */
  afterEach(guard: (to: Route, from: Route) => void): () => void

  /** 注册全局解析守卫 */
  beforeResolve(guard: NavigationGuard): () => void

  /** 安装路由到应用 */
  install(app: any): void
}
```

---

## Route 接口

```ts
interface Route {
  path: string                // 路由路径
  fullPath: string            // 完整路径
  params: Record<string, string>  // 路由参数
  name?: string               // 路由名称
  meta?: Record<string, any>  // 路由元信息
  query: Record<string, string>   // 查询参数
  hash: string                // hash 值
  matched: RouteRecord[]      // 匹配到的路由记录
}
```

---

## RouteRecord

```ts
interface RouteRecord {
  path: string                // 路由路径
  name?: string               // 路由名称
  component?: any             // 路由组件
  meta?: Record<string, any>  // 元信息
  children?: RouteRecord[]    // 子路由
  redirect?: string           // 重定向路径
}
```

---

## History 管理

### createWebHistory()

创建 HTML5 History 模式的路由历史。

```ts
function createWebHistory(base?: string): RouterHistory
```

```ts
const history = createWebHistory('/app/')
```

### createHashHistory()

创建 Hash 模式的路由历史。

```ts
function createHashHistory(): RouterHistory
```

```ts
const history = createHashHistory()
```

### RouterHistory 接口

```ts
interface RouterHistory {
  location: RouterLocation
  push(to: string): void
  replace(to: string): void
  go(delta: number): void
  listen(callback: HistoryChangeListener): () => void
  destroy(): void
}
```

---

## 导航守卫

### NavigationGuard

```ts
type NavigationGuard = (
  to: NavigationTarget,
  from: NavigationTarget,
  next: NavigationGuardNext
) => void | Promise<void>

type NavigationGuardNext = (to?: string | false | void) => void
```

### createNavigationGuards()

```ts
function createNavigationGuards(): NavigationGuards
```

创建导航守卫管理器。

### runGuards()

```ts
function runGuards(guards: NavigationGuard[], to: Route, from: Route): Promise<void>
```

按顺序执行守卫列表。

### runAfterGuards()

```ts
function runAfterGuards(guards: ((to: Route, from: Route) => void)[], to: Route, from: Route): Promise<void>
```

执行后置守卫列表。

---

## 路由匹配器

### createRouteMatcher()

```ts
function createRouteMatcher(routes: RouteRecord[]): RouteMatcher
```

创建路由匹配器实例。

```ts
const matcher = createRouteMatcher([
  { path: '/user/:id', name: 'user' }
])

const result = matcher.match('/user/42')
// { name: 'user', params: { id: '42' }, path: '/user/42' }
```

### RouteMatcher 接口

```ts
interface RouteMatcher {
  match(path: string): RouteMatchResult | null
  addRoute(record: RouteRecord): void
  removeRoute(name: string): void
}
```

### RouteMatchResult

```ts
interface RouteMatchResult {
  name?: string
  path: string
  params: Record<string, string>
  matched: RouteRecord[]
}
```
