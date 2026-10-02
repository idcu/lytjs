// @vitest-environment jsdom
/**
 * 端到端水合门禁：SSR 产出 → 客户端 `mount(el, { hydrate: true })` → **接管更新**
 *
 * ## 为什么需要这个文件
 *
 * 2026-10-02 之前，本仓的「水合」只有两个**互不相干**的载体：
 *   · `renderer/enhanced-hydration.ts` —— 无实例的 DOM↔vnode 协调（`hydrateVNode`）；
 *   · `adapter-web/web-hydration.ts` —— 同上，另一份实现。
 * 两者都**不建组件实例、不建渲染 effect** ⇒ 水合后的页面是「静态 HTML」：
 * 事件没接上、状态变了也不会更新。
 * 而 `core` 侧 `App.mount()` **没有任何 hydrate 变体**（`core/src` 零 `hydrat` 命中），
 * 于是「SSR 产物在客户端复活」这条链**在本仓从未打通**。
 *
 * 本文件固定这条链的可观测结果，四条断言分别钉住四个环节：
 *   ① **复用**（不重建、不产生第二份 DOM，节点身份不变）；
 *   ② **事件**（`onClick` 在水合时接上）；
 *   ③ **响应式接管**（改状态后，被认领的那个节点真的更新了）；
 *   ④ **兄弟同标签不共享节点**（认领的「已占用」判定）。
 *
 * ⚠️ 判据设计要点：④ 与 ③ 都必须**在缺陷版上会红**。
 * 若只用「mount 后页面文本正确」当判据，则「水合」与「重新渲染出一份一样的」
 * 观测完全相同 ⇒ 恒绿。故 ① 断言**节点身份**、③ 断言**被认领的那个旧节点**。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, reactive, nextTick } from '../src/index';
import { createVNode } from '@lytjs/vdom';
import { renderToString } from '@lytjs/renderer';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

/** 造一个带响应式状态与事件的组件（刻意用 `reactive` 而非 `ref`，避免依赖解包语义） */
function makeCounter(state: { count: number }) {
  return {
    setup() {
      return { state };
    },
    render(ctx: { state: { count: number } }) {
      return h('div', { id: 'app' }, [
        h('span', { class: 'c' }, `count=${ctx.state.count}`),
        h(
          'button',
          {
            onClick: () => {
              ctx.state.count++;
            },
          },
          'inc',
        ),
      ]);
    },
  };
}

/** 把容器准备好：塞入 SSR 产出的 HTML，并返回容器与「SSR 根节点」 */
function ssrHost(html: string, rootSelector = '#app'): { host: HTMLElement; ssrRoot: Element } {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  hosts.push(host);
  const ssrRoot = host.querySelector(rootSelector);
  if (!ssrRoot) throw new Error(`SSR 产物里没有 ${rootSelector}：${html}`);
  return { host, ssrRoot };
}

/** 让调度器把渲染刷完 */
async function flush(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe('端到端水合（SSR → 客户端接管）', () => {
  it('★ SSR → hydrate：复用既有 DOM、事件可用、响应式被接管', async () => {
    const state = reactive({ count: 0 });
    const Comp = makeCounter(state as unknown as { count: number });
    const html = await renderToString({ vnode: createVNode(Comp as never, {}) });
    expect(html).toContain('count=0');

    const { host, ssrRoot } = ssrHost(html);

    const app = createApp(Comp as never);
    await app.mount(host, { hydrate: true });
    await flush();

    // ① 复用而非重建：只有一份 #app，且**就是 SSR 那个节点**
    expect(host.querySelectorAll('#app').length).toBe(1);
    expect(host.querySelector('#app')).toBe(ssrRoot);
    expect(ssrRoot.textContent).toContain('count=0');

    // ② 事件在水合时接上
    const button = host.querySelector('button');
    expect(button).not.toBeNull();
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    // ③ 响应式被客户端接管 —— 且更新落在**被认领的那个旧节点**上
    //    （若退化为「重新渲染一份」，SSR 旧节点会停在 count=0，此断言即红）
    expect(ssrRoot.textContent).toContain('count=1');
    expect(host.querySelectorAll('#app').length).toBe(1);
  });

  it('对照组：普通 mount（不传 hydrate）不认领既有 DOM —— 证明上一条不是恒绿', async () => {
    const state = reactive({ count: 0 });
    const Comp = makeCounter(state as unknown as { count: number });
    const html = await renderToString({ vnode: createVNode(Comp as never, {}) });
    const { host, ssrRoot } = ssrHost(html);

    const app = createApp(Comp as never);
    await app.mount(host);
    await flush();

    // 旧节点原封不动，且容器里多出一份新渲染的 —— 与水合路径**可区分**
    expect(ssrRoot.textContent).toContain('count=0');
    expect(host.querySelectorAll('#app').length).toBe(2);
  });

  it('水合时兄弟同标签节点各认各的（不会两个 vnode 共享一个 DOM 节点）', async () => {
    const Comp = {
      setup() {
        return {};
      },
      render() {
        return h('ul', { id: 'list' }, [
          h('li', { key: 'a' }, 'A'),
          h('li', { key: 'b' }, 'B'),
          h('li', { key: 'c' }, 'C'),
        ]);
      },
    };
    const html = await renderToString({ vnode: createVNode(Comp as never, {}) });
    expect(html).toBe('<ul id="list"><li>A</li><li>B</li><li>C</li></ul>');

    const { host, ssrRoot } = ssrHost(html, '#list');
    const before = Array.from(ssrRoot.querySelectorAll('li'));

    const app = createApp(Comp as never);
    await app.mount(host, { hydrate: true });
    await flush();

    const after = Array.from(ssrRoot.querySelectorAll('li'));
    expect(after.length).toBe(3);
    // ⚠️ 判别点：必须断言**容器里只有一份 `#list` 且就是 SSR 那个节点**。
    // 只断言「旧 ul 里的 3 个 li 身份/文本不变」是**恒绿**的 —— 缺陷版把旧 ul
    // 原样留在那里、另建一份新 ul，这些断言照样成立（反向验证实测踩过）。
    expect(host.querySelectorAll('#list').length).toBe(1);
    expect(host.querySelector('#list')).toBe(ssrRoot);
    // 逐个身份比对：认领必须是一一对应，不能两个 vnode 挤同一个节点
    after.forEach((li, i) => {
      expect(li).toBe(before[i]);
      expect(li.textContent).toBe(['A', 'B', 'C'][i]);
    });
  });

  it('客户端比 SSR 多出节点时，新节点不被后续兄弟误认', async () => {
    // SSR 只有 1 个 <li>，客户端渲染 2 个 ⇒ 第 2 个必须新建，
    // 且不得被后续 vnode 认领（否则会出现「一个 DOM 节点被两个 vnode 占用」）
    const TwoList = {
      setup() {
        return {};
      },
      render() {
        return h('ul', { id: 'l2' }, [h('li', null, 'X'), h('li', null, 'Y')]);
      },
    };
    const html = '<ul id="l2"><li>X</li></ul>';
    expect(await renderToString({ vnode: createVNode(TwoList as never, {}) })).toBe(
      '<ul id="l2"><li>X</li><li>Y</li></ul>',
    );

    const { host, ssrRoot } = ssrHost(html, '#l2');
    const app = createApp(TwoList as never);
    await app.mount(host, { hydrate: true });
    await flush();

    const items = Array.from(ssrRoot.querySelectorAll('li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('X');
    expect(items[1].textContent).toBe('Y');
  });
});
