// @vitest-environment jsdom
/**
 * 端到端判据：`async setup` 解析后**必须触发一次重渲染**
 *
 * ## 缺陷（2026-10-02 探针实测）
 *
 * `async setup()` 的组件，首帧渲染出 `msg=undefined`；Promise 兑现后
 * **页面永不更新**（等 200ms 仍是 `undefined`），而 `publicInstance.msg`
 * 上**数据已经就位** ⇒ 数据到了、视图没重跑。
 *
 * 根因：渲染 effect 在 `mountComponent` 里建立，此时 `setupState` 还是空的；
 * `handleSetupResult` 解析后只是**填数据**，没有任何东西让 effect 重跑
 * （读的是被整体替换掉的旧对象，依赖没被追踪到）。
 *
 * 修法：`component-setup.ts` 在 `handleSetupResult` 之后调用
 * `instance.update?.()` —— vdom 的 `mountComponent` 已把渲染 effect 的
 * `update` 挂在实例上（`patch-component.ts`）。
 *
 * ⚠️ 判据设计：`msg=undefined` 与 `msg=async-ok` **必然不同**，
 * 所以「首帧 undefined → 兑现后 async-ok」这条对缺陷版是判别的
 * （缺陷版停在 undefined）。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '../src/index';

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

async function flush(ms = 60): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('端到端：async setup 的重渲染', () => {
  it('★ async setup 兑现后，真实 DOM 必须更新为已兑现的数据', async () => {
    const App = {
      async setup() {
        await new Promise((r) => setTimeout(r, 10));
        return { msg: 'async-ok' };
      },
      render(ctx: { msg?: string }) {
        return h('div', null, `msg=${ctx.msg}`);
      },
    };
    const host = newHost();
    await createApp(App as never).mount(host);

    // 首帧：setup 尚未兑现 ⇒ 渲染出 undefined（这是既有行为，不是缺陷）
    expect(host.textContent).toBe('msg=undefined');

    await flush();

    // ★ 判别点：兑现后必须变成真实数据
    expect(host.textContent).toBe('msg=async-ok');
  });

  it('同步 setup 仍一次渲染到位（回归守卫）', async () => {
    const App = {
      setup() {
        return { msg: 'sync-ok' };
      },
      render(ctx: { msg?: string }) {
        return h('div', null, `msg=${ctx.msg}`);
      },
    };
    const host = newHost();
    await createApp(App as never).mount(host);
    await flush();
    expect(host.textContent).toBe('msg=sync-ok');
  });

  it('async setup 兑现前已卸载 ⇒ 不重渲染、不复活 DOM、不抛错', async () => {
    const App = {
      async setup() {
        await new Promise((r) => setTimeout(r, 40));
        return { msg: 'late' };
      },
      render(ctx: { msg?: string }) {
        return h('div', null, `msg=${ctx.msg}`);
      },
    };
    const host = newHost();
    const app = createApp(App as never);
    await app.mount(host);
    expect(host.textContent).toBe('msg=undefined');

    app.unmount();
    await flush(120);

    // 卸载后容器被清空，且迟到的 setup 不得把内容写回来
    expect(host.innerHTML).toBe('');
  });

  it('async setup 拒绝 ⇒ 不崩溃，DOM 停在首帧（错误交由 handleError 处理）', async () => {
    const App = {
      async setup() {
        await new Promise((_r, reject) => setTimeout(() => reject(new Error('boom')), 10));
        return { msg: 'never' };
      },
      render(ctx: { msg?: string }) {
        return h('div', null, `msg=${ctx.msg}`);
      },
    };
    const host = newHost();
    await createApp(App as never).mount(host);
    await flush();

    expect(host.textContent).toBe('msg=undefined');
  });
});
