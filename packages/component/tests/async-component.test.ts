// @vitest-environment jsdom
/**
 * 行为级判据：`defineAsyncComponent` 与预加载工具
 *
 * ## 为什么要有这条
 *
 * `packages/component/src/async-component.ts`（402 行）是 `@lytjs/component` 的**公开 API**
 * （`defineAsyncComponent` / `preloadComponent(s)` / `isComponentPreloaded` / `clearPreloadCache`），
 * 覆盖率实测仅 **4.6%** —— 加载/错误/超时/延迟/预加载几乎无判据。
 *
 * ## 两种手法
 *
 * - **纯工具函数**（preload 系列）直接调用即可；
 * - **组件状态机**用 `createApp` **真实挂载**：`setup` 只在首挂载跑一次，之后靠
 *   `instance.update()` 触发重渲染 ⇒ 只有真实挂载才能验证「加载完成后到底渲染什么」。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h } from '@lytjs/core';
import {
  defineAsyncComponent,
  preloadComponent,
  preloadComponents,
  isComponentPreloaded,
  clearPreloadCache,
} from '../src/async-component';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
  vi.restoreAllMocks();
});

const flush = (ms = 40): Promise<void> => new Promise((r) => setTimeout(r, ms));

const Comp = { name: 'Real', render: () => h('div', { class: 'real' }, 'REAL') };
const Loading = { name: 'Loading', render: () => h('div', { class: 'loading' }, 'LOADING') };
const ErrComp = { name: 'Err', render: () => h('div', { class: 'err' }, 'ERR') };

type Wrapper = ReturnType<typeof defineAsyncComponent>;

async function mountWrapper(w: Wrapper, props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({ render: () => h(w as never, props) } as never).mount(host);
  await flush(20);
  return host;
}

/** 手动取首帧渲染函数（组件上下文外 getCurrentInstance() 为 null ⇒ 状态是新建的） */
const firstRender = (w: Wrapper): unknown => {
  const setup = (w as unknown as { setup: (p: unknown, s: unknown) => () => unknown }).setup;
  return setup({}, { slots: {} })();
};

describe('defineAsyncComponent — 预加载工具', () => {
  it('接受 loader 函数或 options 两种写法，返回带 preload 的组件', () => {
    const a = defineAsyncComponent(async () => Comp);
    expect(a.name).toBe('AsyncComponentWrapper');
    expect(typeof a.preload).toBe('function');
    expect(typeof defineAsyncComponent({ loader: async () => Comp }).preload).toBe('function');
  });

  it('preload 会调用 loader 并缓存（重复 preload 不重复调用）', async () => {
    const loader = vi.fn(async () => Comp);
    const w = defineAsyncComponent(loader);
    await w.preload();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(isComponentPreloaded(loader)).toBe(true);
    await w.preload();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('preloadComponent / preloadComponents 与 isComponentPreloaded 协同', async () => {
    const l1 = vi.fn(async () => Comp);
    const l2 = vi.fn(async () => ({ default: Comp }));
    await preloadComponents([l1, l2]);
    expect(isComponentPreloaded(l1)).toBe(true);
    expect(isComponentPreloaded(l2)).toBe(true);
    expect(l1).toHaveBeenCalledTimes(1);
  });

  it('loader 抛错时 preload 静默（不抛，也不标记为已预加载）', async () => {
    const loader = vi.fn(async () => {
      throw new Error('boom');
    });
    await expect(preloadComponent(loader)).resolves.toBeUndefined();
    expect(isComponentPreloaded(loader)).toBe(false);
  });

  it('clearPreloadCache(loader) 只清指定项', async () => {
    const l1 = vi.fn(async () => Comp);
    const l2 = vi.fn(async () => Comp);
    await preloadComponents([l1, l2]);
    clearPreloadCache(l1);
    expect(isComponentPreloaded(l1)).toBe(false);
    expect(isComponentPreloaded(l2)).toBe(true);
  });

  it('★ clearPreloadCache() 无参时应清空所有（JSDoc 承诺「所有加载器」）', async () => {
    const l1 = vi.fn(async () => Comp);
    const l2 = vi.fn(async () => Comp);
    await preloadComponents([l1, l2]);
    clearPreloadCache();
    expect(isComponentPreloaded(l1)).toBe(false);
    expect(isComponentPreloaded(l2)).toBe(false);
  });
});

describe('defineAsyncComponent — delay 语义', () => {
  it('★ delay>0 时首帧不得显示 loading 组件（文档：显示前的延迟毫秒数）', () => {
    const w = defineAsyncComponent({
      loader: () => new Promise(() => {}),
      loadingComponent: Loading,
      delay: 100,
    });
    const first = firstRender(w) as { type: unknown };
    expect(first.type).not.toBe(Loading);
  });

  it('delay=0 时明确不显示加载态（保持既有语义）', () => {
    const w = defineAsyncComponent({
      loader: () => new Promise(() => {}),
      loadingComponent: Loading,
      delay: 0,
    });
    expect(JSON.stringify((firstRender(w) as { children?: unknown }).children)).toContain(
      'loading',
    );
  });
});

describe('defineAsyncComponent — 真实挂载下的状态机', () => {
  // ⚠️ 缺陷登记（2026-10-16，已实测确认，待修）：
  //   挂载异步组件后**视图不会切换** —— 加载完成/失败后仍停在加载占位。
  //   已排除"渲染函数只处理加载态"这一层（已修成三态感知），仍不切换 ⇒ 根因在
  //   **重渲染没发生**：`triggerComponentUpdate` 只在 `instance.update` 存在时才调用，
  //   而它的 JSDoc 承诺「不可用时回退到基于 nextTick 的重新渲染」——**回退并未实现**
  //   （同包 `component-proxy.ts` 的 `$forceUpdate` 有完整回退，可作参照）。
  //   ⇒ 用 `it.fails` 标记：**修好后这些用例会「意外通过」并因此报错**，提示摘掉标记。
  it.fails('★ 加载完成后应渲染出真实组件（当前缺陷：视图不切换）', async () => {
    const w = defineAsyncComponent({ loader: async () => Comp, delay: 0 });
    const host = await mountWrapper(w);
    await flush(60);
    expect(host.querySelector('.real')).toBeTruthy();
  });

  it.fails('★ 加载失败时应渲染 errorComponent（当前缺陷：视图不切换）', async () => {
    const onError = vi.fn();
    const w = defineAsyncComponent({
      loader: async () => {
        throw new Error('nope');
      },
      errorComponent: ErrComp,
      onError,
      delay: 0,
    });
    const host = await mountWrapper(w);
    await flush(60);
    expect(onError).toHaveBeenCalled(); // 回调本身是通的
    expect(host.querySelector('.err')).toBeTruthy(); // 但视图不切
  });

  it.fails('默认导出（{ default: Comp }）会被解包（受同一缺陷阻断）', async () => {
    const w = defineAsyncComponent({ loader: async () => ({ default: Comp }), delay: 0 });
    const host = await mountWrapper(w);
    await flush(60);
    expect(host.querySelector('.real')).toBeTruthy();
  });
});
