// @vitest-environment jsdom
/**
 * 端到端判据：`<Suspense>` 在客户端 vnode 模式的能力
 *
 * ## 本文件钉住什么
 *
 * 1. 加了分派桥（`__vnodeType`）后，`<Suspense>` **不再渲染为空** ——
 *    数组形态的 children 能正常渲染，异步子组件的数据到达后**视图会更新**
 *    （依赖 `3995eb8a` 的「async setup 兑现后触发重渲染」）。
 * 2. 两条**曾经的缺口**在 2026-10-29 已修（本文件此前把它们写成「当前现状」，
 *    修好后如约变红，现在改成真实断言）：
 *    · **fallback 从不出现** —— 根因是 `mountSuspense` 在挂载子组件**之前**检查
 *      `isAsyncPlaceholder`，而该标记要等 `setupComponent` 才置位。
 *      详见 `e2e-suspense-fallback.test.ts`（该文件是这一条的主判据）。
 *    · **slots 对象形态渲染为空** —— `resolveSuspenseChildren` 只认
 *      `Array.isArray(slot)`，而渲染函数里写的是 `() => [...]`（函数）。
 *
 * ⚠️ 本文件只保留「<Suspense> 基本可用」这一层的回归；
 *   fallback 的时序、嵌套、多异步计数等细节判据在 `e2e-suspense-fallback.test.ts`。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, nextTick, Suspense } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

const AsyncChild = {
  async setup() {
    await new Promise((r) => setTimeout(r, 60));
    return { msg: 'DATA' };
  },
  render(ctx: { msg?: string }) {
    return h('div', { id: 'content' }, `msg=${ctx.msg}`);
  },
};

describe('端到端：<Suspense> 的基本能力', () => {
  it('数组形态：首帧显示 fallback，兑现后显示已就绪的内容', async () => {
    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, [
          h(AsyncChild as never, { key: 'c' }),
          h('div', { key: 'fb', id: 'fallback' }, 'LOADING'),
        ]),
    } as never).mount(host);

    // 首帧：还没就绪 ⇒ fallback
    expect(host.querySelector('#fallback')).not.toBeNull();
    expect(host.textContent).not.toContain('msg=');

    // 兑现后：内容就位，fallback 退场
    await vi.waitFor(() => {
      expect(host.textContent).toContain('msg=DATA');
      expect(host.querySelector('#fallback')).toBeNull();
    });
  });

  it('slots 对象形态（`{ default, fallback }` 且都是函数）能渲染', async () => {
    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, {
          default: () => [h('div', { id: 's' }, 'SYNC')],
          fallback: () => [h('div', { id: 'fb' }, 'LOADING')],
        }),
    } as never).mount(host);

    await vi.waitFor(() => {
      expect(host.querySelector('#s')?.textContent).toBe('SYNC');
      expect(host.querySelector('#fb')).toBeNull();
    });
  });

  it('同步子节点（数组形态）应正常渲染', async () => {
    const host = newHost();
    await createApp({
      render: () => h(Suspense as never, null, [h('div', { key: 'd', id: 'sync' }, 'SYNC')]),
    } as never).mount(host);

    await vi.waitFor(() => {
      expect(host.textContent).toContain('SYNC');
    });
  });

  it('卸载时不得抛错（迟到的 Promise 兑现回调要被忽略）', async () => {
    let releaseSetup!: () => void;
    let setupContinued = false;
    const setupGate = new Promise<void>((resolve) => {
      releaseSetup = resolve;
    });
    const LateChild = {
      async setup() {
        await setupGate;
        setupContinued = true;
        return { msg: 'LATE' };
      },
      render(ctx: { msg?: string }) {
        return h('div', { id: 'content' }, `msg=${ctx.msg}`);
      },
    };
    const host = newHost();
    const app = createApp({
      render: () =>
        h(Suspense as never, null, [
          h(LateChild as never, { key: 'c' }),
          h('div', { key: 'fb', id: 'fallback' }, 'LOADING'),
        ]),
    } as never);
    await app.mount(host);

    app.unmount();
    releaseSetup();
    // 等到迟到的 setup 确实继续执行完，再断言它没有把内容写回来。
    await vi.waitFor(() => expect(setupContinued).toBe(true));
    await nextTick();

    expect(host.innerHTML).toBe('');
  });
});
