# @lytjs/router API Reference

## Installation

```bash
pnpm add @lytjs/router
```

## Basic Usage

```typescript
import { createRouter, createWebHistory } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});
```

## API

### createRouter(options)

Creates a router instance.

**Options:**

- `history` - History mode (required)
- `routes` - Array of route records (required)
- `scrollBehavior` - Scroll behavior function

**Returns:** `Router` instance

### createWebHistory(base?)

Creates HTML5 history mode.

### createWebHashHistory(base?)

Creates hash-based history mode.

### createMemoryHistory(initial?)

Creates memory-based history mode (for SSR/testing).

### useRouter()

Returns the current router instance.

### useRoute()

Returns the current route location.

### useLink(options)

Returns reactive link properties.

**Options:**

- `to` - Target route
- `replace` - Use replace mode
- `activeClass` - CSS class for active link
- `exactActiveClass` - CSS class for exact active link

**Returns:**

- `route` - Resolved route location
- `href` - Resolved href
- `isActive` - Whether the link is active
- `isExactActive` - Whether the link is exactly active
- `navigate` - Navigation function

## Components

### RouterView

Renders the matched component for the current route.

**Props:**

- `name` - Named view name (default: 'default')

### RouterLink

Creates a navigation link.

**Props:**

- `to` - Target route (required)
- `replace` - Use replace mode
- `activeClass` - CSS class for active link
- `exactActiveClass` - CSS class for exact active link
- `ariaCurrentValue` - aria-current value

## Navigation Guards

### router.beforeEach(guard)

Add a global before navigation guard.

### router.afterEach(guard)

Add a global after navigation hook.

### router.beforeResolve(guard)

Add a global before resolve guard.

### In-Component Guards

- `beforeRouteLeave(to, from, next)` - Called when leaving the route

## Route Record

```typescript
interface RouteRecordRaw {
  path: string;
  name?: string | symbol;
  component?: Component;
  components?: Record<string, Component>;
  children?: RouteRecordRaw[];
  redirect?: string | RouteLocationRaw;
  alias?: string | string[];
  meta?: RouteMeta;
  beforeEnter?: NavigationGuard | NavigationGuard[];
  props?: boolean | Record<string, any> | (to: RouteLocationNormalized) => Record<string, any>;
}
```
