// @vitest-environment jsdom
/**
 * `enhanced-hydration` 的 `hydrateApp` —— 真实水合（DOM ↔ vnode 协调）。
 *
 * 背景（2026-10-02）：`hydrateApp` 此前是 **DOM 遍历占位** —— `performHydration`
 * 只 `createTreeWalker` 数节点 + 对每个 Element 摘掉 `on*`/`@*` 属性，
 * **完全不消费 vnode**，形参 `_app` 全程未使用。即：SSR 出的 DOM 与客户端组件
 * 之间从未发生任何协调，而函数却"成功返回"并打上 `data-hydrated`。
 * 本文件为该行为补上门禁。
 *
 * ⚠️ 判据设计要点（沿用 Task D 的教训）：**每个用例都让「组件产物」与「SSR DOM」不同**。
 * 若只测「匹配」场景，缺陷版（整体不协调）与修复版（正确复用）产出**相同的 DOM**，
 * 断言会假绿 —— 必须让"正确更新/新建/移除"与"什么都没做"必然可分。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVNode, Fragment } from '@lytjs/vdom';
import { hydrateApp } from '../src/hydration/enhanced-hydration';

describe('hydrateApp：DOM ↔ vnode 真实协调', () => {
  let container: HTMLElement;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    container.remove();
  });

  // ---------------------------------------------------------------
  // 1. 复用已有元素并更新文本（判别性：缺陷版会保留 'ssr-old'）
  // ---------------------------------------------------------------
  it('复用匹配的元素并更新不匹配的文本', async () => {
    container.innerHTML = '<div id="app">ssr-old</div>';
    const existing = container.querySelector('div');
    const App = {
      render: () => createVNode('div', { id: 'app' }, 'from-client'),
    };

    await hydrateApp(App as never, container);

    expect(container.querySelector('div')).toBe(existing); // 复用而非重建
    expect(container.querySelector('div')!.textContent).toBe('from-client');
  });

  // ---------------------------------------------------------------
  // 2. 结构不同 ⇒ 新建节点（判别性：缺陷版不会有 section）
  // ---------------------------------------------------------------
  it('SSR 中没有的产物元素应被新建', async () => {
    container.innerHTML = '<div>ssr-only</div>';
    const App = { render: () => createVNode('section', { id: 'made' }, 'brand-new') };

    await hydrateApp(App as never, container);

    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section!.textContent).toBe('brand-new');
  });

  // ---------------------------------------------------------------
  // 3. Fragment 多根：协调 + 移除多余节点（判别性）
  // ---------------------------------------------------------------
  it('Fragment 多根应逐节点协调并移除多余的 SSR 节点', async () => {
    container.innerHTML = '<p>old-1</p><p>old-2</p><p>surplus</p>';
    const App = {
      render: () =>
        createVNode(Fragment, null, [
          createVNode('p', null, 'new-1'),
          createVNode('p', null, 'new-2'),
        ]),
    };

    await hydrateApp(App as never, container);

    const ps = container.querySelectorAll('p');
    expect(ps.length).toBe(2); // 多余的 <p>surplus</p> 被移除
    expect(ps[0]!.textContent).toBe('new-1');
    expect(ps[1]!.textContent).toBe('new-2');
  });

  // ---------------------------------------------------------------
  // 4. 嵌套组件（走 hydrateVNode 的组件分支）
  // ---------------------------------------------------------------
  it('嵌套组件应递归解析并水合到最内层元素', async () => {
    container.innerHTML = '<em>ssr-old</em>';
    const Inner = { render: () => createVNode('em', null, 'inner-resolved') };
    const Outer = { render: () => createVNode(Inner as never, {}) };

    await hydrateApp(Outer as never, container);

    expect(container.querySelector('em')!.textContent).toBe('inner-resolved');
  });

  // ---------------------------------------------------------------
  // 5. ⭐ 嵌套组件 + setup 返回状态 + render 读 ctx
  //    这条直接钉住 2026-10-02 的「解析顺序统一」：修复前 `hydrateChildVNode` /
  //    `hydrateVNode` 的组件分支是 render 优先且以 props 作 ctx ⇒ 会渲染出
  //    `v=undefined`；统一后 setup 优先 ⇒ `v=nested-ctx`。
  //    （用 Fragment 包一层以确保走 `hydrateChildVNode` 那份副本）
  // ---------------------------------------------------------------
  it('嵌套组件应遵循「setup 优先、setup 返回值作 render 的 ctx」', async () => {
    container.innerHTML = '<i>ssr-old</i>';
    const Inner = {
      setup: () => ({ msg: 'nested-ctx' }),
      render: (ctx: Record<string, unknown>) => createVNode('i', null, `v=${String(ctx.msg)}`),
    };
    const Outer = { render: () => createVNode(Fragment, null, [createVNode(Inner as never, {})]) };

    await hydrateApp(Outer as never, container);

    expect(container.querySelector('i')!.textContent).toBe('v=nested-ctx');
  });

  // ---------------------------------------------------------------
  // 6. setup 直接返回 vnode ⇒ 跳过 render
  // ---------------------------------------------------------------
  it('setup 返回 vnode 时应跳过 render', async () => {
    container.innerHTML = '<b>ssr-old</b>';
    const render = vi.fn(() => createVNode('b', null, 'from-render'));
    const App = {
      setup: () => createVNode('b', null, 'from-setup'),
      render,
    };

    await hydrateApp(App as never, container);

    expect(container.querySelector('b')!.textContent).toBe('from-setup');
    expect(render).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // 7. 无法解析为 vnode ⇒ 回退 + 告警，且不抛错
  // ---------------------------------------------------------------
  it('组件既无 setup 也无 render 时应告警并走降级路径而非抛错', async () => {
    container.innerHTML = '<div>untouched</div>';
    const App = {};

    const { stats } = await hydrateApp(App as never, container);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('无法解析根 vnode'));
    expect(stats.skippedNodes).toBeGreaterThan(0);
    expect(container.querySelector('div')!.textContent).toBe('untouched');
    expect(container.getAttribute('data-hydrated')).toBe('true');
  });

  // ---------------------------------------------------------------
  // 8. 已 hydrated 早返回
  // ---------------------------------------------------------------
  it('容器已标记 data-hydrated 时应早返回且不水合', async () => {
    container.setAttribute('data-hydrated', 'true');
    container.innerHTML = '<div>already</div>';
    const App = { render: () => createVNode('div', null, 'should-not-apply') };

    const { stats } = await hydrateApp(App as never, container);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already hydrated'));
    expect(stats.totalNodes).toBe(0);
    expect(container.querySelector('div')!.textContent).toBe('already');
  });

  // ---------------------------------------------------------------
  // 9. 容器不存在 ⇒ reject
  // ---------------------------------------------------------------
  it('容器不存在时应抛错', async () => {
    const App = { render: () => createVNode('div', null, 'x') };
    await expect(hydrateApp(App as never, '#definitely-not-here')).rejects.toThrow(
      /container not found/,
    );
  });

  // ---------------------------------------------------------------
  // 10. 统计口径
  // ---------------------------------------------------------------
  it('真实水合后应给出非零且自洽的节点统计', async () => {
    container.innerHTML = '<div><span>a</span></div>';
    const App = {
      render: () => createVNode('div', null, [createVNode('span', null, 'b')]),
    };

    const { stats } = await hydrateApp(App as never, container);

    expect(stats.totalNodes).toBeGreaterThan(0);
    expect(stats.hydratedNodes).toBe(stats.totalNodes);
    expect(stats.errors).toBe(0);
    expect(stats.duration).toBeGreaterThanOrEqual(0);
  });

  // ---------------------------------------------------------------
  // 12. ★ 标记属性判别（2026-10-03）：真实标记 `data-hydrate` 的元素必须被**处理**，
  //     而无标记的才计入 skipped。
  //
  //     这条在修复前会红：旧实现读的是 `data-ssr-id`，而**全仓没有任何地方写它**
  //     （SSR 实际写 `data-hydrate`）⇒ 带 `data-hydrate` 的元素也会被跳过。
  // ---------------------------------------------------------------
  it('带 data-hydrate 的元素应被处理（而非像无标记那样被跳过）', async () => {
    container.innerHTML = '<div data-hydrate="lyt-hydrate-1" onclick="doBad()">x</div><div>y</div>';
    // 组件解析不出根 vnode ⇒ 走降级清理，但**标记判定**仍应区分二者
    const { stats } = await hydrateApp({} as never, container);

    // ★ 判别点：带真实标记的元素被**处理** ⇒ 它的内联事件属性被摘掉。
    //   旧实现读 `data-ssr-id`（没人写）⇒ 该元素也会被跳过 ⇒ 这行会红。
    expect(container.querySelector('[data-hydrate]')!.hasAttribute('onclick')).toBe(false);
    // skippedNodes = 1（容器级：组件解析不出根 vnode）+ 1（无标记的那个元素）
    expect(stats.skippedNodes).toBe(2);
  });

  // ---------------------------------------------------------------
  // 11. 降级路径（回归对照）：带 data-ssr-id 的元素被计数、无者计入 skipped
  // ---------------------------------------------------------------
  it('降级路径应仍按 data-ssr-id 区分处理，并摘掉 SSR 内联事件属性', async () => {
    container.innerHTML = '<div data-ssr-id="a" onclick="doBad()">x</div><div>y</div>';
    // 组件解析不出根 vnode ⇒ 走 cleanupSsrAttributes
    const { stats } = await hydrateApp({} as never, container);

    expect(container.querySelector('[data-ssr-id]')!.hasAttribute('onclick')).toBe(false);
    expect(stats.skippedNodes).toBeGreaterThan(0);
  });
});
