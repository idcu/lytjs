# Router

Lyt.js includes a lightweight routing system that supports both History and Hash modes.

## Creating a Router

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

```ts [History Mode]
import { createWebHistory } from 'lyt/router'

const router = createRouter({
  mode: 'history',
  routes: [...],
  base: '/app/'  // Optional: base path
})
```

```ts [Hash Mode]
import { createHashHistory } from 'lyt/router'

const router = createRouter({
  mode: 'hash',
  routes: [...]
})
```

:::

## Route Configuration

### Basic Routes

```ts
const routes = [
  { path: '/', component: Home },
  { path: '/about', name: 'about', component: About },
]
```

### Dynamic Route Parameters

```ts
const routes = [
  { path: '/user/:id', component: User },
  { path: '/post/:year/:month', component: Post },
]
```

Accessing parameters in a component:

```ts
// Access via router.currentRoute
const route = router.currentRoute.value
console.log(route.params.id)    // Route parameters
console.log(route.query.search) // Query parameters
console.log(route.hash)         // Hash value
console.log(route.meta)         // Route meta information
```

### Route Meta

```ts
const routes = [
  {
    path: '/admin',
    component: Admin,
    meta: { requiresAuth: true, title: 'Admin Panel' }
  }
]
```

### Nested Routes

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

## Navigation

### Programmatic Navigation

```ts
// Navigate to a new path
router.push('/about')
router.push({ path: '/user', query: { id: '1' } })
router.push({ name: 'user', params: { id: '1' } })

// Replace current path
router.replace('/login')

// Go forward/backward
router.back()
router.forward()
router.go(-2)
```

### Navigation Guards

```ts
// Global beforeEach guard
const removeGuard = router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login')  // Redirect to login page
  } else {
    next()  // Proceed
  }
})

// Global afterEach guard
router.afterEach((to, from) => {
  document.title = to.meta.title || 'Lyt.js'
})

// Remove guard
removeGuard()
```

## Lazy Loading

Route components support lazy loading for on-demand code loading:

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

Using with `defineAsyncComponent`:

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

## Route Matcher

Under the hood, `createRouteMatcher` is used for route matching:

```ts
import { createRouteMatcher } from 'lyt/router'

const matcher = createRouteMatcher([
  { path: '/user/:id', name: 'user' },
  { path: '/post/:slug', name: 'post' }
])

const result = matcher.match('/user/42')
// { name: 'user', params: { id: '42' }, path: '/user/42' }
```
