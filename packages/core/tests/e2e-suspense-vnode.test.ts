// @vitest-environment jsdom
/**
 * 端到端判据：`<Suspense>` 在客户端 vnode 模式的**当前真实能力**
 *
 * ## 本文件钉住什么
 *
 * 1. ★ **已达成**：加了分派桥（`__vnodeType`）后，`<Suspense>` **不再渲染为空** ——
 *    数组形态的 children 能正常渲染，且异步子组件的数据到达后**视图会更新**
 *    （依赖 `3995eb8a` 的「async setup 兑现后触发重渲染」）。
 * 2. **已知缺口**（本文件同时作为它们的**可执行证据**，防止被误当成已修）：
 *    · **fallback 从未出现** —— `patchSuspense` 在挂载子组件**之前**检查
 *      `defaultBranch.isAsyncPlaceholder`，而该标记是子组件 setup 时才设的
 *      ⇒ 检查恒为 false ⇒ 永远走不到 fallback 分支；
 *    · **slots 对象形态不支持** —— `{ default, fallback }` 经
 *      `resolveSuspenseChildren` 解析不出内容 ⇒ 渲染为空（数组形态才正常）。
 *
 * ⚠️ 判据设计：缺口用例断言的是**实测现状**（`fallback` 不出现），
 * 它们的作用是「一旦有人修好了就会红」⇒ 提醒更新文档与判据，
 * 而不是把现状固化成期望。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, Suspense } from '../src/index';

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

describe('端到端：<Suspense> 的当前真实能力', () => {
  it('★ 数组形态：内容应渲染，且异步数据到达后视图会更新', async () => {
    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, [
          h(AsyncChild as never, { key: 'c' }),
          h('div', { key: 'fb', id: 'fallback' }, 'LOADING'),
        ]),
    } as never).mount(host);

    // 首帧：异步 setup 尚未兑现
    expect(host.innerHTML).toContain('msg=undefined');

    await new Promise((r) => setTimeout(r, 200));

    // ★ 兑现后视图真的更新了（这一条依赖 async setup 的重渲染修复）
    expect(host.textContent).toContain('msg=DATA');
  });

  it('已知缺口①：fallback 在客户端从未出现（修好时此用例会红）', async () => {
    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, [
          h(AsyncChild as never, { key: 'c' }),
          h('div', { key: 'fb', id: 'fallback' }, 'LOADING'),
        ]),
    } as never).mount(host);
    await new Promise((r) => setTimeout(r, 200));

    // 实测：全程都是 default 分支，fallback 从未挂载
    expect(host.querySelector('#fallback')).toBeNull();
    expect(host.textContent).toContain('msg=DATA');
  });

  it('已知缺口②：slots 对象形态经 resolveSuspenseChildren 解析不出内容', async () => {
    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, {
          default: () => [h('div', { id: 's' }, 'SYNC')],
          fallback: () => [h('div', { id: 'fb' }, 'LOADING')],
        }),
    } as never).mount(host);
    await new Promise((r) => setTimeout(r, 30));

    // 实测：渲染为空（只有 Fragment 占位注释）
    expect(host.querySelector('#s')).toBeNull();
  });

  it('同步子节点（数组形态）应正常渲染', async () => {
    const host = newHost();
    await createApp({
      render: () => h(Suspense as never, null, [h('div', { key: 'd', id: 'sync' }, 'SYNC')]),
    } as never).mount(host);
    await new Promise((r) => setTimeout(r, 30));

    expect(host.textContent).toContain('SYNC');
  });
});
