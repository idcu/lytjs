// @vitest-environment jsdom
/**
 * N18 第 2 个真实应用的正式判据：**多页面路由的真实 DOM 行为**。
 *
 * 为什么不能只靠「路由表写对了」：
 *   · `vite build` 绿、路由表看起来对，但 `RouterView` 可能根本渲染不出组件
 *     （历史缺陷：`RouterLink` 曾返回描述对象而不是带 `type` 的 vnode ⇒ 渲染为空）；
 *   · `useRoute()` 返回的是 **signal**，写成 `route.value.params` 或 `route.params`
 *     在类型层不一定报错，运行期却拿不到值；
 *   · 兜底路由写成 `/:pathMatch(.*)*`（Vue 习惯）在 `@lytjs/router` 的 matcher 里
 *     **不生效**，未知路径会渲染空白而不是 404 页。
 *
 * 因此本判据走完整链路，每一步都断言**页面上真实可见的文本**：
 *   首屏 loading → 数据到达 → 点导航切换 → 点行内链接进详情（动态参数）
 *   → 不存在的 id → 未匹配路径兜底 → 浏览器后退 → 刷新语义。
 *
 * ## 时序策略（不要退回固定 sleep）
 *
 * 实测这条链上有三处异步，任何「猜一个延时」的写法都会在负载下偶发失败：
 *   ① `app.mount()` 是 async 且 `main.js` 不 await ⇒ DOM 要等宏任务才出现；
 *   ② hash 写入比视图切换晚一个微任务；
 *   ③ `history.back()` 经 `popstate` 异步生效（实测 ~6ms）。
 * 所以一律用 `waitFor(条件)` 轮询，超时后断言照常变红（不掩盖真失败）。
 *
 * `loading` 分支用 `MutationObserver` **记录它是否出现过**，而不是在某个瞬间
 * 抓快照 —— 抓快照会与数据到达赛跑，记录则与时序无关。
 */
import { describe, it, expect } from 'vitest';

const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/** 轮询等待条件成立；超时后返回，由后续断言判定成败 */
const waitFor = async (predicate: () => boolean, timeoutMs = 3000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await sleep(10);
  }
};

/** 等某个选择器出现 */
const waitForSelector = (host: Element, selector: string) =>
  waitFor(() => host.querySelector(selector) !== null);

/**
 * 等某段文本出现。
 *
 * ⚠️ 不能只等「元素存在」：实测 vnode patch 会先插入页面根节点、
 * 再填充子节点，中间存在「`.page.overview` 已存在但 textContent 为空」的瞬间。
 * 等文本才等于等「渲染完成」。
 */
const waitForText = (host: Element, text: string) =>
  waitFor(() => Boolean(host.textContent?.includes(text)));

/**
 * 记录某个选择器**是否曾经出现过**。
 *
 * 用来断言「loading 分支真的渲染过」——这个状态只存在几十毫秒，
 * 在任意时刻抓快照都会和数据到达赛跑。观察者从注册起就不会漏。
 */
const recordSeen = (host: Element, selector: string) => {
  const state = { seen: false };
  const check = () => {
    if (host.querySelector(selector)) state.seen = true;
  };
  const observer = new MutationObserver(check);
  observer.observe(host, { childList: true, subtree: true });
  check();
  return { state, stop: () => observer.disconnect() };
};

const click = (el: Element) =>
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
const navLink = (host: Element, text: string) =>
  Array.from(host.querySelectorAll('.nav-link')).find((l) => l.textContent?.trim() === text);

describe('router-dashboard · 多页面路由真实行为', () => {
  it('概览 → 订单 → 详情 → 不存在 → 404 → 后退', async () => {
    window.location.hash = '';
    document.body.innerHTML = '<div id="app"></div>';

    const { router } = await import('./main.js');
    const host = document.getElementById('app')!;

    // ── ① 首屏：外壳 + 概览页 ────────────────────────────────────────────
    // loading 观察者必须在外壳出现前注册，否则可能错过它
    const overviewLoading = recordSeen(host, '.loading');
    await waitForText(host, '经营概览');
    expect(host.querySelector('.brand')?.textContent?.trim()).toBe('运营看板');
    expect(host.querySelector('.page')?.className).toContain('overview');
    expect(overviewLoading.state.seen).toBe(true);

    // ── ② 异步数据到达：onMounted 真的触发了，派生统计真的算了 ────────────
    await waitForText(host, '¥6009.40');
    overviewLoading.stop();
    expect(host.querySelector('.loading')).toBeNull();
    expect(host.querySelector('.stat-count')?.textContent?.trim()).toBe('4');
    expect(host.querySelector('.stat-pending')?.textContent?.trim()).toBe('2');
    expect(host.querySelector('.stat-total')?.textContent?.trim()).toBe('¥6009.40');
    expect(host.querySelector('.route-path')?.textContent).toContain('当前路径：');

    // ── ③ 真点击导航：路由切换 + hash 真变化 + 列表页同样有 loading ────────
    const ordersLoading = recordSeen(host, '.loading');
    click(navLink(host, '订单')!);
    await waitFor(() => window.location.hash === '#/orders');
    await waitForText(host, '订单列表');
    expect(host.querySelector('.route-path')?.textContent).toContain('/orders');
    expect(host.querySelector('.orders-table')).toBeNull();
    expect(ordersLoading.state.seen).toBe(true);

    // ── ④ 列表数据到达：4 行、金额与状态经真实格式化 ──────────────────────
    await waitFor(() => host.querySelectorAll('.order-row').length === 4);
    ordersLoading.stop();
    const rows = Array.from(host.querySelectorAll('.order-row'));
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.querySelector('.order-id')?.textContent?.trim())).toEqual([
      '1001',
      '1002',
      '1003',
      '1004',
    ]);
    expect(rows[0]?.textContent).toContain('¥1280.50');
    expect(rows[0]?.textContent).toContain('待发货');
    expect(rows[1]?.textContent).toContain('已发货');
    expect(rows[3]?.textContent).toContain('已完成');

    // 激活态由当前路径驱动：订单高亮，概览不高亮
    expect(navLink(host, '订单')?.className).toContain('router-link-active');
    expect(navLink(host, '概览')?.className).not.toContain('router-link-active');

    // ── ⑤ 点行内链接进详情：动态参数 route().params.id ────────────────────
    click(rows[0]!.querySelector('a')!);
    await waitFor(() => window.location.hash === '#/orders/1001');
    await waitForText(host, '订单详情');
    await waitForSelector(host, '.detail-id');
    expect(host.querySelector('.detail-id')?.textContent?.trim()).toBe('1001');
    expect(host.querySelector('.detail-customer')?.textContent?.trim()).toBe('张伟');
    expect(host.querySelector('.detail-amount')?.textContent?.trim()).toBe('¥1280.50');
    expect(host.querySelector('.detail-status')?.textContent?.trim()).toBe('待发货');
    expect(
      Array.from(host.querySelectorAll('.detail-items li')).map((li) => li.textContent?.trim()),
    ).toEqual(['机械键盘', '鼠标垫']);

    // 详情页下「订单」仍应视为激活（按段比较，而不是精确相等）
    expect(navLink(host, '订单')?.className).toContain('router-link-active');
    expect(navLink(host, '订单')?.className).not.toContain('router-link-exact-active');

    // ── ⑥ 编程式导航到不存在的订单：走 v-if 的另一支 ──────────────────────
    await router.push('/orders/9999');
    await waitForText(host, '订单 9999 不存在');
    expect(host.querySelector('.missing')?.textContent).toContain('订单 9999 不存在');
    expect(host.querySelector('.detail-body')).toBeNull();

    // ── ⑦ 未匹配路径走 '/*' 兜底（不是空白页） ───────────────────────────
    await router.push('/no-such-page');
    await waitForText(host, '页面不存在');
    await waitForSelector(host, '.page.not-found');
    expect(host.querySelector('.missing-path')?.textContent?.trim()).toBe('/no-such-page');

    // ── ⑧ 浏览器后退真的回到上一条（hash 历史可用，不是内存态假象） ───────
    await router.back();
    await waitFor(() => window.location.hash === '#/orders/9999');
    await waitFor(() =>
      Boolean(host.querySelector('.missing')?.textContent?.includes('订单 9999 不存在')),
    );
    expect(window.location.hash).toBe('#/orders/9999');
    expect(host.querySelector('.missing')?.textContent).toContain('订单 9999 不存在');

    // ── ⑨ 刷新语义：路由状态就写在 URL 里（hash 一致 ⇒ 刷新不丢路由） ────
    await router.push('/orders/1003');
    await waitFor(() => window.location.hash === '#/orders/1003');
    await waitFor(() => host.querySelector('.detail-customer')?.textContent?.trim() === '王强');
    expect(host.querySelector('.detail-customer')?.textContent?.trim()).toBe('王强');
    expect(router.currentRoute().path).toBe('/orders/1003');
  }, 90_000);
});
