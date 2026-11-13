// @vitest-environment jsdom
/**
 * 端到端判据：`useSuspense` 的**推荐用法**真跑
 *
 * ## 之前的状态
 *
 * `useSuspense` 声明返回 `T`、实际 `return undefined as T` ⇒ 调用方拿不到数据，
 * 「异步数据」在本仓**没有可用入口**（`async setup` 只能自己 `await` 裸 Promise，
 * 与 Suspense 机制无关）。
 *
 * ## 现在
 *
 * `useSuspense(promise)` **返回该 Promise 本身** ⇒ 在 `async setup` 里
 * `await useSuspense(fetch())` 即可挂起首帧；兑现后 `component-setup.ts`
 * 会调 `instance.update?.()` 触发重渲染（`3995eb8a`）⇒ **视图真的更新**。
 *
 * ## 判别性
 *
 * 旧实现返回 `undefined` ⇒ `await undefined` 得到 `undefined` ⇒
 * 渲染出 `name=undefined`；新实现渲染出真实数据。两者**必然不同**，故判别。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, nextTick, useSuspense } from '../src/index';

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

describe('端到端：useSuspense 的推荐用法', () => {
  it('★ async setup 里 await useSuspense() ⇒ 首帧 undefined，兑现后渲染真实数据', async () => {
    const User = {
      async setup() {
        const user = await useSuspense(
          new Promise<{ name: string }>((resolve) =>
            setTimeout(() => resolve({ name: 'Ada' }), 50),
          ),
        );
        return { user };
      },
      render(ctx: { user?: { name: string } }) {
        return h('div', { id: 'u' }, `name=${ctx.user?.name}`);
      },
    };

    const host = newHost();
    await createApp(User as never).mount(host);

    // 首帧：数据未到
    expect(host.textContent).toBe('name=undefined');

    // ★ 兑现后视图更新为真实数据
    await vi.waitFor(() => expect(host.textContent).toBe('name=Ada'));
  });

  it('同步值也能直接 await（Promise.resolve）', async () => {
    const Sync = {
      async setup() {
        const v = await useSuspense(Promise.resolve(7));
        return { v };
      },
      render(ctx: { v?: number }) {
        return h('div', { id: 's' }, `v=${ctx.v}`);
      },
    };
    const host = newHost();
    await createApp(Sync as never).mount(host);
    await vi.waitFor(() => expect(host.textContent).toBe('v=7'));
  });

  it('Promise 拒绝时走错误处理，不渲染出 undefined 之外的东西、也不崩', async () => {
    let rejected = false;
    const Bad = {
      async setup() {
        try {
          const v = await useSuspense(Promise.reject(new Error('boom')));
          return { v };
        } catch (err) {
          rejected = true;
          throw err;
        }
      },
      render(ctx: { v?: string }) {
        return h('div', { id: 'b' }, `v=${String(ctx.v)}`);
      },
    };
    const host = newHost();
    await createApp(Bad as never).mount(host);

    // 等到拒绝路径确实执行完，再断言首帧内容没有被改写
    await vi.waitFor(() => expect(rejected).toBe(true));
    await nextTick();
    expect(host.textContent).toBe('v=undefined');
  });

  it('不在 setup 上下文调用仍抛错（原行为保留）', () => {
    expect(() => useSuspense(Promise.resolve(1))).toThrow(/within a component setup function/);
  });
});
