/**
 * 运营看板 —— 使用 @lytjs/router 的真实多页面应用。
 *
 * 结构与真实项目一致：数据层（`api.js`）→ 页面组件（`pages/*`）→ 路由表 → 外壳。
 * 唯一「示例化」的地方是数据层用内存数组 + 40ms 延迟代替 HTTP 请求。
 *
 * 运行：`npm install && npm run dev`（默认 3100 端口）
 * 构建：`npm run build`
 *
 * ⚠️ 关于 `@lytjs/router` 的稳定契约（2026-11-10 实测）：
 *   · `useRoute()` / `useRouter()` 之外，`useRoute()` 返回 **signal**，
 *     读值写 `route().path` / `route().params`，**没有 `.value`**；
 *   · 组件在模板块里使用前必须注册 —— 本示例走页面级局部注册；
 *   · 兜底路由写 `'/*'`，不支持 `/:pathMatch(.*)*`。
 */
import { createApp } from '@lytjs/core';
import {
  createRouter,
  createWebHashHistory,
  RouterLink,
  RouterView,
  useRoute,
} from '@lytjs/router';

import { Overview } from './pages/overview.js';
import { Orders } from './pages/orders.js';
import { OrderDetail } from './pages/order-detail.js';
import { NotFound } from './pages/not-found.js';

/**
 * 导出 router 不是「测试钩子」——真实项目里也常这样导出（守卫注册、
 * 埋点、外部跳转都需要拿到实例）。行为判据用它验证「编程式导航」这条路径。
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'overview', component: Overview },
    { path: '/orders', name: 'orders', component: Orders },
    { path: '/orders/:id', name: 'order-detail', component: OrderDetail },
    { path: '/*', name: 'not-found', component: NotFound },
  ],
});

const App = {
  components: { RouterView, RouterLink },
  setup() {
    const route = useRoute();
    return { route };
  },
  template: `
    <div class="dashboard">
      <aside class="sidebar">
        <h1 class="brand">运营看板</h1>
        <nav class="nav">
          <RouterLink to="/" class="nav-link">概览</RouterLink>
          <RouterLink to="/orders" class="nav-link">订单</RouterLink>
        </nav>
        <p class="route-path">当前路径：<code>{{ route().path }}</code></p>
      </aside>
      <main class="content"><RouterView></RouterView></main>
    </div>
  `,
};

createApp(App).use(router).mount('#app');
