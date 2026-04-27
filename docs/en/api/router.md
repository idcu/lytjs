# Router API

The Lyt.js router system provides complete front-end routing functionality, supporting HTML5 History and Hash modes, as well as navigation guards, dynamic routes, and other advanced features.

## Installation

```bash
npm install @lytjs/router
```

## Creating a Router

### createRouter()

Creates a router instance.

```ts
function createRouter(options: RouterOptions): Router
```

| Option | Type | Description |
|--------|------|-------------|
| mode | `'history' \| 'hash'` | Routing mode |
| routes | `RouteRecord[]` | Route configuration array |
| base | `string` | Base path (only effective in history mode) |

**Example:**
```ts
import { createRouter } from '@lytjs/router'
import Home from './views/Home.vue'
import User from './views/User.vue'

const router = createRouter({
  mode: 'history',
  base: '/app',
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: { title: 'Home' }
    },
    {
      path: '/user/:id',
      name: 'user',
      component: User,
      meta: { title: 'User Profile' }
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('./views/About.vue'), // Lazy loading
      meta: { title: 'About' }
    },
    {
      path: '/404',
      name: 'not-found',
      component: () => import('./views/NotFound.vue'),
      meta: { title: 'Not Found' }
    },
    {
      path: '*', // Wildcard route
      redirect: '/404'
    }
  ]
})

// Register with the app
app.use(router)
```

---

## Route Configuration

### RouteRecord

```ts
interface RouteRecord {
  name?: string;           // Route name
  path: string;            // Route path
  component?: any;         // Route component
  redirect?: string;       // Redirect path
  children?: RouteRecord[]; // Child routes
  meta?: Record<string, any>; // Meta information
}
```

**Supported path patterns:**
- Static path: `/about`
- Dynamic parameters: `/user/:id`
- Wildcard: `/files/*`

**Example:**
```ts
const routes: RouteRecord[] = [
  // Basic route with nested children
  {
    path: '/',
    component: Layout,
    children: [
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
  // Route with parameters
  {
    path: '/product/:id',
    name: 'product',
    component: Product
  },
  // Redirect
  {
    path: '/old-path',
    redirect: '/new-path'
  }
]
```

---

## Navigation Methods

### push()

Navigates to a new path, adding a new entry to the history stack.

```ts
function push(path: string): Promise<void>
```

**Example:**
```ts
// String path
router.push('/home')

// Path with parameters
router.push('/user/123')

// Path with query parameters
router.push('/search?q=lytjs')
```

### replace()

Navigates to a new path, replacing the current history entry.

```ts
function replace(path: string): Promise<void>
```

**Example:**
```ts
// After login, replace with home to prevent back navigation to login page
router.replace('/home')
```

### go()

Moves forward or backward by the specified number of steps.

```ts
function go(n: number): void
```

**Example:**
```ts
router.go(1)   // Forward 1 step
router.go(-2)  // Backward 2 steps
```

### back()

Goes back one step.

```ts
function back(): void
```

### forward()

Goes forward one step.

```ts
function forward(): void
```

---

## Navigation Guards

### beforeEach()

Global before guard, executed before navigation is confirmed.

```ts
function beforeEach(guard: NavigationGuard): () => void
```

**Example:**
```ts
// Authentication check
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth
  const isLoggedIn = localStorage.getItem('token')

  if (requiresAuth && !isLoggedIn) {
    // Not logged in, redirect to login page
    next('/login')
  } else {
    // Logged in or no auth required, proceed
    next()
  }
})

// Page title setting
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Lyt.js App'
  next()
})
```

### beforeResolve()

Global resolve guard, executed after navigation is confirmed but before component rendering.

```ts
function beforeResolve(guard: NavigationGuard): () => void
```

**Example:**
```ts
// Data preloading
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

Global after guard, executed after navigation is complete.

```ts
function afterEach(guard: (to: Route, from: Route) => void): () => void
```

**Example:**
```ts
// Page visit logging
router.afterEach((to, from) => {
  console.log(`Visited: ${to.path}, from ${from.path}`)
})

// Scroll to top
router.afterEach(() => {
  window.scrollTo(0, 0)
})
```

### Guard Execution Order

1. **beforeEach** — Global before guard
2. **beforeResolve** — Global resolve guard
3. Component rendering
4. **afterEach** — Global after guard

---

## Dynamic Routes

### addRoute()

Dynamically adds a route at runtime.

```ts
function addRoute(route: RouteRecord): void
```

**Example:**
```ts
// Add a dynamic route
router.addRoute({
  path: '/dynamic',
  name: 'dynamic',
  component: () => import('./Dynamic.vue')
})

// Add a nested route under a parent
router.addRoute('parent', {
  path: 'child',
  component: ChildComponent
})
```

### removeRoute()

Removes a route by name.

```ts
function removeRoute(name: string): void
```

**Example:**
```ts
router.removeRoute('dynamic')
```

### getRoutes()

Gets all registered route records.

```ts
function getRoutes(): RouteRecord[]
```

**Example:**
```ts
const routes = router.getRoutes()
console.log('All routes:', routes)
```

---

## Route State

### currentRoute

The current route information (reactive Ref).

```ts
const currentRoute: Ref<Route>
```

**Route Interface:**
```ts
interface Route {
  path: string;          // Route path
  fullPath: string;      // Full path
  params: Record<string, string>; // Route parameters
  name?: string;         // Route name
  meta?: Record<string, any>; // Route meta information
  query: Record<string, string>; // Query parameters
  hash: string;          // Hash value
  matched: RouteRecord[]; // Matched route records
}
```

**Example:**
```ts
import { computed } from '@lytjs/core'

// Access route in a component
const route = computed(() => router.currentRoute.value)

// Access route parameters
const userId = computed(() => route.value.params.id)

// Access query parameters
const searchQuery = computed(() => route.value.query.q)
```

---

## History Modes

### createWebHistory()

Creates an HTML5 History mode history instance.

```ts
function createWebHistory(base?: string): RouterHistory
```

**Example:**
```ts
const router = createRouter({
  mode: 'history',
  base: '/app', // Optional
  routes: [...]
})
```

### createHashHistory()

Creates a Hash mode history instance.

```ts
function createHashHistory(): RouterHistory
```

**Example:**
```ts
const router = createRouter({
  mode: 'hash',
  routes: [...]
})
```

### Mode Comparison

| Feature | History Mode | Hash Mode |
|---------|-------------|-----------|
| URL format | `/user/123` | `/#/user/123` |
| Server config | Requires fallback config | No server config needed |
| SEO | Better | Limited |
| Browser support | Modern browsers | All browsers |

---

## Route Parameters

### Dynamic Parameters

Define dynamic parameters with `:param`.

**Example:**
```ts
// Route configuration
const routes = [
  {
    path: '/user/:id',
    component: UserComponent
  }
]

// Navigate to route
router.push('/user/123')

// Access parameters in component
const userId = computed(() => router.currentRoute.value.params.id) // '123'
```

### Query Parameters

Pass query parameters with `?key=value`.

**Example:**
```ts
// Navigate with query parameters
router.push('/search?q=lytjs&category=framework')

// Access query parameters in component
const searchQuery = computed(() => router.currentRoute.value.query.q) // 'lytjs'
const category = computed(() => router.currentRoute.value.query.category) // 'framework'
```

---

## Route Meta Information

Add custom meta information via the `meta` field.

**Example:**
```ts
const routes = [
  {
    path: '/admin',
    component: AdminComponent,
    meta: {
      requiresAuth: true,
      roles: ['admin'],
      title: 'Admin Panel'
    }
  }
]

// Use meta information in guards
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    // Verify permissions
  }
  next()
})
```

---

## Lazy Loading

Use dynamic imports for lazy loading route components.

**Example:**
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

---

## Complete Example

```ts
import { createApp } from '@lytjs/core'
import { createRouter } from '@lytjs/router'
import App from './App.vue'

// Route components
const Home = { template: '<div>Home</div>' }
const User = { template: '<div>User: {{ $route.params.id }}</div>' }
const About = { template: '<div>About</div>' }
const NotFound = { template: '<div>404 Not Found</div>' }

// Create router
const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', name: 'home', component: Home, meta: { title: 'Home' } },
    { path: '/user/:id', name: 'user', component: User, meta: { title: 'User' } },
    { path: '/about', name: 'about', component: About, meta: { title: 'About' } },
    { path: '/404', name: 'not-found', component: NotFound, meta: { title: 'Not Found' } },
    { path: '*', redirect: '/404' }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Lyt.js App'
  next()
})

// Create app
const app = createApp(App)
app.use(router)
app.mount('#app')
```

---

## Best Practices

### 1. Route Organization

- **Modular routes**: Split route configuration by feature modules
- **Nested routes**: Use nested routes to organize page structure
- **Route guards**: Centralize permission checks and page titles

### 2. Performance Optimization

- **Lazy loading**: Use dynamic imports for large components
- **Route caching**: Combine with KeepAlive for component caching
- **Preloading**: Preload data in route guards

### 3. Error Handling

- **404 page**: Configure wildcard routes for unmatched paths
- **Navigation errors**: Catch and handle errors in guards
- **Redirects**: Use redirects appropriately for old paths

### 4. Security

- **Permission checks**: Verify user permissions in before guards
- **Parameter validation**: Validate route parameters
- **XSS prevention**: Be careful when handling route parameters
