// @vitest-environment jsdom
/**
 * 端到端判据：`<Suspense>` 的 **fallback**（P0）
 *
 * ## 修之前的三条实测现状
 *
 * ```
 * <Suspense>[asyncChild, fallback]</Suspense>  →  首帧就渲染 asyncChild（msg=undefined），
 *                                                 fallback **全程不出现**
 * <Suspense>{ default: () => […], fallback: () => […] }</Suspense>  →  渲染为空
 * ```
 *
 * 根因（`patch-suspense.ts:195`）：
 *
 * ```ts
 * const isAsync = defaultBranch?.isAsyncPlaceholder === true;
 * ```
 *
 * `isAsyncPlaceholder` 是**子组件 `setupComponent` 跑完**才置位的，而这一行在
 * `patch(null, defaultBranch, …)` **之前**执行 ⇒ 恒为 `false` ⇒ 永远走「同步内容」分支。
 *
 * ## 本文件钉住什么
 *
 * 1. 异步子组件首帧**显示 fallback**（而不是渲染一半的 default）；
 * 2. 兑现后 fallback 消失、default 内容出现且数据已就位；
 * 3. 同步子组件**不**显示 fallback；
 * 4. `{ default, fallback }` slots 对象形态能渲染（此前恒为空）；
 * 5. **嵌套**异步（default 是个包一层的元素，里面才是 async 组件）同样要显示 fallback；
 * 6. 多个异步子组件：**全部**兑现后才切回 default。
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 60ms 后返回 DATA 的异步组件 */
const AsyncChild = {
  async setup() {
    await wait(60);
    return { msg: 'DATA' };
  },
  render(ctx: { msg?: string }) {
    return h('div', { id: 'content' }, `msg=${ctx.msg}`);
  },
};

const Fallback = () => h('div', { id: 'fallback' }, 'LOADING');

describe('Suspense fallback（P0 回归）', () => {
  it('异步子组件：首帧必须显示 fallback，而不是渲染一半的 default', async () => {
    const host = newHost();
    await createApp({
      render: () => h(Suspense as never, null, [h(AsyncChild as never, { key: 'c' }), Fallback()]),
    } as never).mount(host);

    expect(host.querySelector('#fallback')).not.toBeNull();
    expect(host.textContent).toContain('LOADING');
    // default 的内容此刻**不该**出现在页面上（数据还没到）
    expect(host.textContent).not.toContain('msg=');
  });

  it('兑现后：fallback 消失、default 内容出现且数据已就位', async () => {
    const host = newHost();
    await createApp({
      render: () => h(Suspense as never, null, [h(AsyncChild as never, { key: 'c' }), Fallback()]),
    } as never).mount(host);

    expect(host.querySelector('#fallback')).not.toBeNull();

    await wait(200);

    expect(host.querySelector('#fallback')).toBeNull();
    expect(host.querySelector('#content')).not.toBeNull();
    expect(host.textContent).toContain('msg=DATA');
  });

  it('同步子组件：不显示 fallback', async () => {
    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, [
          h('div', { key: 's', id: 'sync' }, 'SYNC'),
          h('div', { key: 'fb', id: 'fallback' }, 'LOADING'),
        ]),
    } as never).mount(host);
    await wait(30);

    expect(host.querySelector('#sync')).not.toBeNull();
    expect(host.querySelector('#fallback')).toBeNull();
  });

  it('`{ default, fallback }` slots 对象形态能渲染（此前恒为空）', async () => {
    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, {
          default: () => [h('div', { id: 's' }, 'SYNC')],
          fallback: () => [h('div', { id: 'fallback' }, 'LOADING')],
        }),
    } as never).mount(host);
    await wait(30);

    expect(host.querySelector('#s')).not.toBeNull();
    expect(host.textContent).toContain('SYNC');
  });

  it('嵌套异步：default 包一层元素、里面才是 async 组件，同样要显示 fallback', async () => {
    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, [
          h('div', { key: 'wrap', id: 'wrap' }, [h(AsyncChild as never)]),
          Fallback(),
        ]),
    } as never).mount(host);

    expect(host.querySelector('#fallback')).not.toBeNull();

    await wait(200);

    expect(host.querySelector('#fallback')).toBeNull();
    expect(host.querySelector('#wrap')).not.toBeNull();
    expect(host.textContent).toContain('msg=DATA');
  });

  it('多个异步子组件：全部兑现后才切回 default', async () => {
    const Fast = {
      async setup() {
        await wait(30);
        return { msg: 'FAST' };
      },
      render(ctx: { msg?: string }) {
        return h('i', { class: 'fast' }, `fast=${ctx.msg}`);
      },
    };
    const Slow = {
      async setup() {
        await wait(120);
        return { msg: 'SLOW' };
      },
      render(ctx: { msg?: string }) {
        return h('i', { class: 'slow' }, `slow=${ctx.msg}`);
      },
    };

    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, [
          h('div', { key: 'wrap', id: 'wrap' }, [
            h(Fast as never, { key: 'f' }),
            h(Slow as never, { key: 's' }),
          ]),
          Fallback(),
        ]),
    } as never).mount(host);

    expect(host.querySelector('#fallback')).not.toBeNull();

    // 快的那个兑现了，但慢的还没 —— 必须**继续**显示 fallback
    await wait(70);
    expect(host.querySelector('#fallback')).not.toBeNull();

    await wait(200);
    expect(host.querySelector('#fallback')).toBeNull();
    expect(host.textContent).toContain('fast=FAST');
    expect(host.textContent).toContain('slow=SLOW');
  });

  it('切回 default 后，其内部仍是活的（响应式更新照常生效）', async () => {
    const { ref } = await import('../src/index');
    const n = ref(0);
    const AsyncWithRef = {
      async setup() {
        await wait(30);
        return { n };
      },
      // ⚠️ `render` 收到的 ctx 是 `proxyRefs(setupState)` ⇒ ref 已解包，
      // 直接读 `ctx.n` 即可（读 `.value` 会得到 undefined）。
      render(ctx: { n: number }) {
        return h('b', { id: 'n' }, `n=${ctx.n}`);
      },
    };

    const host = newHost();
    await createApp({
      render: () =>
        h(Suspense as never, null, [h(AsyncWithRef as never, { key: 'c' }), Fallback()]),
    } as never).mount(host);

    await wait(150);
    expect(host.textContent).toContain('n=0');

    n.value = 7;
    await wait(50);
    expect(host.textContent).toContain('n=7');
  });
});
