// @vitest-environment jsdom
/**
 * 路由守卫与懒加载（P0 回归电池）
 *
 * ## 为什么需要这条
 *
 * 2026-10-26 的评估实测出三个会让「路由看起来能用、实际不设防」的缺陷：
 *
 * 1. **`next()` 是个 `noop`** —— 四处调用守卫时都传 `noop`，于是
 *    `next('/login')` / `next(false)` **什么都不会发生**，导航静默放行到受保护路由。
 *    这是最坏的失败形态：不报错、不告警、看起来一切正常。
 * 2. **重定向被外层覆盖** —— 守卫里 `return '/b'` 时，内层 `navigate` 成功返回 `undefined`，
 *    外层 `if (failure)` 判空后**继续提交原目标** ⇒ 用户最终落在 `/a` 而不是 `/b`。
 * 3. **无条件重定向没有深度上限** —— 实测 256MB 堆 **OOM 进程崩溃**。
 *
 * 另外，`RouterView` 的懒加载在**渲染函数内部**调 `defineAsyncComponent`，
 * 每次重渲染都产生新的 `vnode.type` ⇒ 渲染器判为「类型变了」→ 卸载重挂，
 * 实测 `/l1 → /l2` 后 DOM 里有两份 `<i class=l2>`。修法是以 loader 为键缓存。
 */

import { describe, it, expect, vi } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory, createWebHistory } from '../src/history';
import { NavigationFailureType } from '../src/types';
import { getOrCreateAsyncViewComponent } from '../src/components/RouterView';

const Blank = { name: 'Blank', render: () => null };

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Blank },
      { path: '/a', name: 'a', component: Blank },
      { path: '/b', name: 'b', component: Blank },
      { path: '/login', name: 'login', component: Blank },
      { path: '/admin', name: 'admin', component: Blank, meta: { requiresAuth: true } },
    ],
  });
}

describe('路由守卫（P0 回归）', () => {
  it('next("/login") 必须真的重定向（此前 next 是 noop，直接放行）', async () => {
    const router = makeRouter();
    router.beforeEach((to, _from, next) => {
      if (to.meta.requiresAuth) next('/login');
      else next();
    });

    await router.push('/admin');

    expect(router.currentRoute().path).toBe('/login');
  });

  it('next(false) 必须中止导航', async () => {
    const router = makeRouter();
    await router.push('/');
    router.beforeEach((_to, _from, next) => next(false));

    const failure = await router.push('/a');

    expect(router.currentRoute().path).toBe('/');
    expect(failure?.type).toBe(NavigationFailureType.aborted);
  });

  it('返回值风格 return "/b" 也必须重定向（不能被外层覆盖成 /a）', async () => {
    const router = makeRouter();
    router.beforeEach((to) => (to.path === '/a' ? '/b' : undefined));

    const failure = await router.push('/a');

    expect(router.currentRoute().path).toBe('/b');
    expect(failure?.type).toBe(NavigationFailureType.redirected);
  });

  it('无条件重定向不得死循环（超过上限后中止）', async () => {
    const router = makeRouter();
    // ⚠️ 起点不能是 '/'：memory history 初始就在 '/'，push('/') 会先被判 duplicated，
    //    根本走不到守卫。这里从 '/a' 出发，守卫把它永远重定向到 '/login'。
    router.beforeEach(() => '/login');

    const failure = await router.push('/a');

    // 关键判据是「**能返回**」——此前这里会无限递归，实测 256MB 堆 OOM 进程崩溃。
    // 具体失败类型取决于深度上限在哪一层触发：
    //   · 最外层被上限拦住 → aborted
    //   · 内层被拦住、外层正常收尾 → redirected
    // 两者都可接受；不可接受的是挂死或崩溃。
    expect(failure).toBeTruthy();
    expect([NavigationFailureType.aborted, NavigationFailureType.redirected]).toContain(
      failure?.type,
    );
    // 目标页**没有被提交**（守卫始终在拦截）
    expect(router.currentRoute().path).toBe('/');
  });

  it('守卫正常放行时不应产生失败', async () => {
    const router = makeRouter();
    router.beforeEach((_to, _from, next) => next());

    const failure = await router.push('/a');

    expect(failure).toBeUndefined();
    expect(router.currentRoute().path).toBe('/a');
  });
});

// ============================================================
// 负控（P0-7）：popstate（浏览器前进/后退）不能绕开导航管线
// ============================================================
describe('popstate 必须走完整导航管线（P0 回归）', () => {
  const makeWebRouter = () =>
    createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'home', component: Blank },
        { path: '/a', name: 'a', component: Blank },
        { path: '/login', name: 'login', component: Blank },
        { path: '/admin', name: 'admin', component: Blank, meta: { requiresAuth: true } },
      ],
    });

  const waitPop = (): Promise<void> => new Promise((r) => setTimeout(r, 30));

  it('退回到受保护页时 beforeEach 的跳转必须生效', async () => {
    window.history.replaceState(null, '', '/');
    const router = makeWebRouter();
    router.beforeEach((to) => (to.meta.requiresAuth ? '/login' : undefined));

    await router.push('/a');
    expect(router.currentRoute().path).toBe('/a');

    // 模拟浏览器前进/后退：地址栏已改变，随后派发 popstate。
    window.history.replaceState(null, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    await waitPop();

    // 未修复：popstate 监听器直接 currentRoute.set('/admin')，守卫被完全绕过。
    expect(router.currentRoute().path).toBe('/login');
    router.options.history.destroy();
  });

  it('后退被 next(false) 拦截时，路由与地址栏都回到原处', async () => {
    window.history.replaceState(null, '', '/');
    const router = makeWebRouter();
    router.beforeEach((to, _from, next) => (to.path === '/admin' ? next(false) : next()));

    await router.push('/a');
    window.history.replaceState(null, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    await waitPop();

    expect(router.currentRoute().path).toBe('/a');
    // 被拒绝的 URL 不应停留在地址栏。
    expect(window.location.pathname).toBe('/a');
    router.options.history.destroy();
  });
});

describe('RouterView 懒加载缓存（P0 回归）', () => {
  it('同一 loader 必须得到同一个包装对象（否则每次渲染都会卸载重挂）', () => {
    const loader = () => Promise.resolve({ name: 'Lazy', render: () => null });

    const first = getOrCreateAsyncViewComponent(loader);
    const second = getOrCreateAsyncViewComponent(loader);

    expect(second).toBe(first);
  });

  it('不同 loader 应得到不同对象', () => {
    const a = () => Promise.resolve({ name: 'A', render: () => null });
    const b = () => Promise.resolve({ name: 'B', render: () => null });

    expect(getOrCreateAsyncViewComponent(a)).not.toBe(getOrCreateAsyncViewComponent(b));
  });

  it('缓存不应阻止 loader 被正常调用（惰性）', async () => {
    const loader = vi.fn(() => Promise.resolve({ name: 'Lazy2', render: () => null }));
    const wrapped = getOrCreateAsyncViewComponent(loader) as unknown as {
      __asyncLoader?: () => Promise<unknown>;
    };

    // 只取包装对象，不应立刻执行 loader（惰性加载的语义）
    expect(loader).not.toHaveBeenCalled();
    expect(wrapped).toBeTruthy();
  });
});
