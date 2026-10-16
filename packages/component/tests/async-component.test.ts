/**
 * 行为级判据：`defineAsyncComponent` 与预加载工具
 *
 * ## 为什么要有这条
 *
 * `packages/component/src/async-component.ts` 是 `@lytjs/component` 的**公开 API**
 * （`defineAsyncComponent` / `preloadComponent(s)` / `isComponentPreloaded` / `clearPreloadCache`），
 * 覆盖率实测仅 **4.6%** —— 加载/错误/超时/延迟/预加载几乎无判据。
 *
 * ## ⚠️ 为什么这里**不能**用 `@lytjs/core` 挂载（2026-10-16 订正）
 *
 * 本文件早前用 `createApp`（来自 `@lytjs/core`）**真实挂载**本文件的组件，并据此登记了一条
 * 「框架层缺陷：setup 期间未设当前实例」。**该结论是错的**，根因是**双包危险**：
 *
 * - vitest alias 把 `@lytjs/core` / `@lytjs/component` 都指向 **dist**；
 * - 而本文件从 `'../src/async-component'` 取被测组件 ⇒ 包装器内部 `'./lifecycle'` 也是 **src**；
 * - `setCurrentInstance` / `getCurrentInstance` 是**模块级变量** ⇒ src 与 dist **各持一份**
 *   （探针实测：`srcGet === distGet` 为 **false**；给 src 那份 set 之后，dist 那份仍是 null）。
 * - 于是 src 包装器里的 `getCurrentInstance()` **永远是 null** ⇒ 不触发重渲染。
 *   **这是测试环境的模块身份问题，不是产品缺陷** —— 全 dist 的真实路径下 `setup` 里能正常
 *   拿到实例（同探针实测 `distGet() → obj`）。
 *
 * ⇒ 纪律：**同一个测试里，被测组件与挂载原语必须来自同一个模块实例。** 本文件因此改为
 * **src 级**原语（`createComponentInstance` + `setupComponent`，与 `component.test.ts` 同款）；
 * 真实挂载的端到端判据放在 `packages/core/tests/e2e-null-render.test.ts`（那里全走 dist，身份一致）。
 */

import { describe, it, expect, vi } from 'vitest';
import { createComponentInstance, setupComponent } from '../src/index';
import type { ComponentInternalInstance } from '../src/types';
import {
  defineAsyncComponent,
  preloadComponent,
  preloadComponents,
  isComponentPreloaded,
  clearPreloadCache,
} from '../src/async-component';

const flush = (ms = 40): Promise<void> => new Promise((r) => setTimeout(r, ms));

// 子组件只用于**身份断言**（比较渲染结果的 `.type`），其自身渲染内容无关紧要
const Comp = { name: 'Real', render: () => ({ type: 'div' }) };
const Loading = { name: 'Loading', render: () => ({ type: 'div' }) };
const ErrComp = { name: 'Err', render: () => ({ type: 'div' }) };

type Wrapper = ReturnType<typeof defineAsyncComponent>;

/** src 级挂载原语：造实例 → 跑 setup（与 `component.test.ts` 同款，全程同一模块实例） */
function setupWrapper(w: Wrapper): ComponentInternalInstance {
  const vnode = { type: w, props: {}, children: null };
  const instance = createComponentInstance(vnode, null);
  setupComponent(instance);
  return instance;
}

/** 取渲染结果的组件身份（`.type`）；注释占位返回 null */
const renderedType = (instance: ComponentInternalInstance): unknown => {
  const out = (instance as unknown as { render: () => { type?: unknown } | null }).render();
  const t = out?.type;
  return typeof t === 'symbol' ? null : (t ?? null);
};

/** 手动取首帧渲染函数：无组件上下文（instance 为 null）⇒ 每次新建状态，仅用于与实例无关的判据 */
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

describe('defineAsyncComponent — src 级状态机（模块身份一致）', () => {
  it('★ 加载完成后**触发重渲染**，且 render() 返回真实组件', async () => {
    const w = defineAsyncComponent({ loader: async () => Comp, delay: 0 });
    const instance = setupWrapper(w);

    // 真实渲染器会在挂载时把 update 写到实例上（见 vdom/src/patch-component.ts）；
    // 这里用 spy 代替，断言「加载完成后确实请求了重渲染」—— 这正是此前误判为
    // 「框架层缺陷」的那件事：`triggerComponentUpdate` 拿不到实例就不会调用它。
    const update = vi.fn();
    (instance as unknown as { update?: () => void }).update = update;

    await flush(30);

    expect(update).toHaveBeenCalled();
    expect(renderedType(instance)).toBe(Comp);
  });

  it('★ 加载失败时应渲染 errorComponent，并调用 onError', async () => {
    const onError = vi.fn();
    const w = defineAsyncComponent({
      loader: async () => {
        throw new Error('nope');
      },
      errorComponent: ErrComp,
      onError,
      delay: 0,
    });
    const instance = setupWrapper(w);
    await flush(30);

    expect(onError).toHaveBeenCalled();
    expect(renderedType(instance)).toBe(ErrComp);
  });

  it('默认导出（{ default: Comp }）会被解包', async () => {
    const w = defineAsyncComponent({ loader: async () => ({ default: Comp }), delay: 0 });
    const instance = setupWrapper(w);
    await flush(30);

    expect(renderedType(instance)).toBe(Comp);
  });

  it('超时后应渲染 errorComponent（并请求重渲染）', async () => {
    const w = defineAsyncComponent({
      loader: () => new Promise(() => {}),
      errorComponent: ErrComp,
      timeout: 30,
      delay: 0,
    });
    const instance = setupWrapper(w);
    const update = vi.fn();
    (instance as unknown as { update?: () => void }).update = update;

    await flush(80);

    expect(update).toHaveBeenCalled();
    expect(renderedType(instance)).toBe(ErrComp);
  });

  it('★ setup 期间 getCurrentInstance() 拿到本实例（状态按实例复用，不重复发起加载）', () => {
    const loaderSpy = vi.fn(async () => Comp);
    const w = defineAsyncComponent({ loader: loaderSpy, delay: 0 });
    const instance = setupWrapper(w);

    // 再跑一次 setup：只有「状态按实例缓存」成立时才会复用；
    // 若 getCurrentInstance() 为 null（模块身份不一致），第二次会新建状态并**重新 load**。
    setupComponent(instance);

    expect(loaderSpy).toHaveBeenCalledTimes(1);
  });
});
