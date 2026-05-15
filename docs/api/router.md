# @lytjs/router API 参考

## 安装

```bash
pnpm add @lytjs/router
```

## 基础用法

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

创建路由实例。

**选项：**

- `history` - 历史模式（必填）
- `routes` - 路由记录数组（必填）
- `scrollBehavior` - 滚动行为函数

**返回：** `Router` 实例

### createWebHistory(base?)

创建 HTML5 历史模式。

### createWebHashHistory(base?)

创建基于哈希的历史模式。

### createMemoryHistory(initial?)

创建基于内存的历史模式（用于 SSR/测试）。

### useRouter()

返回当前路由实例。

### useRoute()

返回当前路由位置。

### useLink(options)

返回响应式链接属性。

**选项：**

- `to` - 目标路由
- `replace` - 使用替换模式
- `activeClass` - 激活链接的 CSS 类名
- `exactActiveClass` - 完全匹配激活的 CSS 类名

**返回：**

- `route` - 解析后的路由位置
- `href` - 解析后的 href
- `isActive` - 是否激活
- `isExactActive` - 是否完全匹配激活
- `navigate` - 导航函数

## 组件

### RouterView

渲染当前路由匹配的组件。

**属性：**

- `name` - 命名视图名称（默认：'default'）

### RouterLink

创建导航链接。

**属性：**

- `to` - 目标路由（必填）
- `replace` - 使用替换模式
- `activeClass` - 激活链接的 CSS 类名
- `exactActiveClass` - 完全匹配激活的 CSS 类名
- `ariaCurrentValue` - aria-current 值

## 导航守卫

### router.beforeEach(guard)

添加全局前置导航守卫。

### router.afterEach(guard)

添加全局后置导航钩子。

### router.beforeResolve(guard)

添加全局解析前守卫。

### 组件内守卫

- `beforeRouteLeave(to, from, next)` - 离开路由时调用

## 路由记录

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
