// @vitest-environment jsdom
/**
 * e2e 判据：**空渲染**（`render()` 返回 null / undefined）不得让挂载崩溃
 *
 * ## 为什么要有这条
 *
 * `render(): VNode | null` 是声明签名，空渲染是**合法且常见**的写法（条件渲染、
 * 空状态、异步占位）。而 `@lytjs/core` 的 `defineAsyncComponent` 在**未配
 * loadingComponent** 时首帧正是 `return null`。
 *
 * 缺陷（2026-10-16 实测）：`vdom/src/patch-component.ts` 的 `update()` **无条件**读
 * `subTree.el` ⇒ `TypeError: Cannot read properties of null (reading 'el')`
 * ⇒ **整个应用挂载失败**（`[LytJS] Failed to mount app`）。
 *
 * ⚠️ 本文件走 `@lytjs/core`（vitest alias → **dist**）⇒ 它验证的是**发布产物**。
 *    改 `vdom` / `core` 的 src 后**必须重建 dist**（本仓硬约束 3），否则这里跑的是旧产物。
 *    src 级判据在 `packages/vdom/tests/patch-component.test.ts`（不依赖 dist）。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, defineAsyncComponent, ref } from '@lytjs/core';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
  vi.restoreAllMocks();
});

const flush = (ms = 40): Promise<void> => new Promise((r) => setTimeout(r, ms));

const Comp = { name: 'Real', render: () => h('div', { class: 'real' }, 'REAL') };
const Loading = { name: 'Loading', render: () => h('div', { class: 'loading' }, 'LOADING') };
const ErrComp = { name: 'Err', render: () => h('div', { class: 'err' }, 'ERR') };

async function mount(node: () => unknown): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({ render: node } as never).mount(host);
  return host;
}

describe('空渲染（render 返回 null/undefined）', () => {
  it('★ 最小复现：组件 render 返回 null 时应用仍能挂载', async () => {
    const NullComp = { name: 'NullComp', render: () => null };
    const host = await mount(() => h(NullComp as never));
    await flush(20);
    expect(host.innerHTML).toBe('');
  });

  it('★ 组件 render 返回 undefined 时应用仍能挂载', async () => {
    const UComp = { name: 'UComp', render: () => undefined };
    await expect(mount(() => h(UComp as never))).resolves.toBeTruthy();
  });

  it('★ 首帧空渲染、之后返回真实内容时应渲染出来（条件渲染）', async () => {
    // ⚠️ 依赖必须是**响应式源**：普通 `let` 变量不会触发重渲染（本仓的渲染 effect 只追踪 ref/signal）
    const ready = ref(false);
    const LateComp = {
      name: 'Late',
      render: () => (ready.value ? h('div', { class: 'late' }, 'L') : null),
    };
    const host = await mount(() => h(LateComp as never));
    await flush(20);
    expect(host.querySelector('.late')).toBeNull();

    ready.value = true;
    await flush(40);
    expect(host.querySelector('.late')).toBeTruthy();
  });

  it('由「有内容」变为空渲染时旧 DOM 应被移除', async () => {
    const empty = ref(false);
    const ToggleComp = {
      name: 'Toggle',
      render: () => (empty.value ? null : h('div', { class: 'on' }, 'ON')),
    };
    const host = await mount(() => h(ToggleComp as never));
    await flush(20);
    expect(host.querySelector('.on')).toBeTruthy();

    empty.value = true;
    await flush(40);
    expect(host.querySelector('.on')).toBeNull();
  });
});

describe('defineAsyncComponent 真实挂载（主入口路径）', () => {
  it('★ 未配 loadingComponent 时加载完成应渲染出真实组件', async () => {
    const w = defineAsyncComponent({ loader: async () => Comp });
    const host = await mount(() => h(w as never));
    await flush(60);
    expect(host.querySelector('.real')).toBeTruthy();
  });

  it('★ 加载失败且配了 errorComponent 时应渲染错误组件', async () => {
    const onError = vi.fn();
    const w = defineAsyncComponent({
      loader: async () => {
        throw new Error('nope');
      },
      errorComponent: ErrComp,
      onError,
    });
    const host = await mount(() => h(w as never));
    await flush(60);
    expect(host.querySelector('.err')).toBeTruthy();
  });

  it('delay>0 时首帧不得闪出 loading 组件（超时后才显示）', async () => {
    const w = defineAsyncComponent({
      loader: () => new Promise(() => {}),
      loadingComponent: Loading,
      delay: 120,
    });
    const host = await mount(() => h(w as never));
    await flush(30);
    expect(host.querySelector('.loading')).toBeNull();

    await flush(200);
    expect(host.querySelector('.loading')).toBeTruthy();
  });
});
